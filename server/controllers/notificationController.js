const Notification = require('../models/Notification');

// ── 1. Get notifications for logged-in user ──────────────────
exports.getNotifications = async (req, res) => {
  try {
    const { id: userId, email, role } = req.user || {};
    const { unreadOnly } = req.query;

    // Build query: match by userId OR email (to support demo users)
    const query = {
      $or: [
        { recipientId: userId },
        { recipientEmail: email },
      ],
    };

    // Admins see all system notifications + their own
    if (role === 'admin') {
      delete query.$or;
      query.$or = [
        { recipientId: userId },
        { recipientEmail: email },
        { recipientRole: 'admin' },
      ];
    }

    if (unreadOnly === 'true') {
      query.isRead = false;
    }

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({
      ...query,
      isRead: false,
    });

    res.json({ notifications, unreadCount });
  } catch (err) {
    console.error('❌ getNotifications error:', err);
    res.status(500).json({ message: 'Failed to fetch notifications' });
  }
};

// ── 2. Mark one notification as read ────────────────────────
exports.markRead = async (req, res) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findByIdAndUpdate(
      id,
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Marked as read', notification });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark as read' });
  }
};

// ── 3. Mark ALL notifications as read for current user ───────
exports.markAllRead = async (req, res) => {
  try {
    const { id: userId, email, role } = req.user || {};
    const query = {
      $or: [{ recipientId: userId }, { recipientEmail: email }],
      isRead: false,
    };
    if (role === 'admin') {
      query.$or.push({ recipientRole: 'admin' });
    }
    await Notification.updateMany(query, { isRead: true, readAt: new Date() });
    res.json({ message: 'All notifications marked as read' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to mark all as read' });
  }
};

// ── 4. Delete a single notification ─────────────────────────
exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;
    await Notification.findByIdAndDelete(id);
    res.json({ message: 'Notification deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to delete notification' });
  }
};

// ── 5. Delete all read notifications for user ────────────────
exports.clearRead = async (req, res) => {
  try {
    const { id: userId, email } = req.user || {};
    await Notification.deleteMany({
      $or: [{ recipientId: userId }, { recipientEmail: email }],
      isRead: true,
    });
    res.json({ message: 'Cleared all read notifications' });
  } catch (err) {
    res.status(500).json({ message: 'Failed to clear read notifications' });
  }
};

// ── 6. Create manual notification (admin only) ───────────────
exports.createManual = async (req, res) => {
  try {
    const { recipientId, recipientEmail, recipientRole, type, title, message, link } = req.body;
    if (!recipientEmail || !type || !title || !message) {
      return res.status(400).json({ message: 'recipientEmail, type, title, and message are required.' });
    }
    const notification = await Notification.create({
      recipientId: recipientId || 'manual',
      recipientEmail,
      recipientRole: recipientRole || 'user',
      type,
      title,
      message,
      link: link || '',
    });
    res.status(201).json({ message: 'Notification created', notification });
  } catch (err) {
    res.status(500).json({ message: 'Failed to create notification' });
  }
};
