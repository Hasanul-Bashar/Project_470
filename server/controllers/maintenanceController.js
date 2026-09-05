const MaintenanceRequest = require('../models/MaintenanceRequest');
const Booking = require('../models/Booking');
const { createNotification } = require('../services/notificationService');

// ── 1. Tenant Submits Maintenance Request ────────────────────
exports.createRequest = async (req, res) => {
  try {
    const { listingId, listingTitle, category, title, description, urgency, photoUrl, landlordId } = req.body;

    if (!title || !description || !category) {
      return res.status(400).json({ message: 'Category, title, and description are required.' });
    }

    const tenantId = req.user?.id || 'demo-user';
    const tenantName = req.user?.name || req.user?.firstName || req.user?.email?.split('@')[0] || 'Tenant';
    const tenantEmail = req.user?.email || 'demo.user@rentease.com';

    let targetLandlordId = landlordId;
    let targetLandlordEmail = '';
    let targetListingTitle = listingTitle || 'Rental Unit';

    // If landlordId not directly supplied, look up approved booking for this tenant
    if (!targetLandlordId) {
      const activeBooking = await Booking.findOne({ tenantEmail, status: 'approved' });
      if (activeBooking) {
        targetLandlordId = activeBooking.landlordId;
        targetLandlordEmail = activeBooking.landlordEmail || '';
        if (!listingTitle) targetListingTitle = activeBooking.listingTitle;
      } else {
        targetLandlordId = 'demo-landlord';
        targetLandlordEmail = 'alice.rahman@landlord.com';
      }
    }

    const newRequest = new MaintenanceRequest({
      tenantId,
      tenantName,
      tenantEmail,
      landlordId: targetLandlordId,
      landlordEmail: targetLandlordEmail || 'alice.rahman@landlord.com',
      listingId: listingId || null,
      listingTitle: targetListingTitle,
      category,
      title,
      description,
      urgency: urgency || 'Medium',
      photoUrl: photoUrl || 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop',
      status: 'Submitted',
      statusHistory: [
        {
          status: 'Submitted',
          updatedAt: new Date(),
          updatedBy: tenantName,
          note: 'Maintenance ticket created by tenant (preliminary state awaiting landlord review).',
        },
      ],
    });

    await newRequest.save();

    // ── Notifications ────────────────────────────────────────
    const urgencyTag = urgency === 'Emergency' ? '🔴 EMERGENCY — ' : '';

    // Notify landlord a new ticket was submitted
    await createNotification({
      recipientId: targetLandlordId,
      recipientEmail: targetLandlordEmail || 'alice.rahman@landlord.com',
      recipientRole: 'landlord',
      type: 'maintenance_submitted',
      title: `${urgencyTag}New Maintenance Ticket: ${title}`,
      message: `Tenant ${tenantName} submitted a ${category} issue at ${targetListingTitle}. Urgency: ${urgency || 'Medium'}.`,
      link: '/maintenance',
      sourceId: newRequest._id.toString(),
      sourceType: 'MaintenanceRequest',
    });

    // Notify admins
    await createNotification({
      recipientId: 'admin-001',
      recipientEmail: 'admin@rentease.com',
      recipientRole: 'admin',
      type: 'maintenance_submitted',
      title: `${urgencyTag}Maintenance: ${title}`,
      message: `Tenant ${tenantName} submitted a ${category} issue at ${targetListingTitle}.`,
      link: '/maintenance',
      sourceId: newRequest._id.toString(),
      sourceType: 'MaintenanceRequest',
    });

    // Confirm to tenant
    await createNotification({
      recipientId: tenantId,
      recipientEmail: tenantEmail,
      recipientRole: 'user',
      type: 'maintenance_submitted',
      title: `✅ Request Submitted: ${title}`,
      message: `Your ${category} maintenance request has been submitted. The landlord will be notified shortly.`,
      link: '/maintenance',
      sourceId: newRequest._id.toString(),
      sourceType: 'MaintenanceRequest',
    });

    res.status(201).json({
      message: 'Maintenance request submitted successfully',
      request: newRequest,
    });
  } catch (err) {
    console.error('❌ createRequest error:', err);
    res.status(500).json({ message: 'Failed to create maintenance request', error: err.message });
  }
};

// ── 2. Get Maintenance Requests ──────────────────────────────
exports.getRequests = async (req, res) => {
  try {
    const { role, id, email } = req.user || {};
    const { status, category, urgency, search } = req.query;

    let filter = {};

    // Role gate filter
    if (role === 'landlord') {
      filter.$or = [
        { landlordId: id },
        { landlordEmail: email },
        { landlordId: 'demo-landlord' },
        { landlordEmail: 'alice.rahman@landlord.com' },
      ];
    } else if (role === 'user') {
      filter.$or = [{ tenantEmail: email }, { tenantId: id }];
    } // Admin sees all

    if (status && status !== 'all') filter.status = status;
    if (category && category !== 'all') filter.category = category;
    if (urgency && urgency !== 'all') filter.urgency = urgency;

    if (search) {
      const searchRegex = new RegExp(search, 'i');
      filter.$and = [
        filter.$and ? { ...filter.$and } : {},
        {
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { tenantName: searchRegex },
            { listingTitle: searchRegex },
          ],
        },
      ];
    }

    const requests = await MaintenanceRequest.find(filter).sort({ createdAt: -1 });

    // Metrics
    let allRoleRequests = [];
    if (role === 'landlord') {
      allRoleRequests = await MaintenanceRequest.find({
        $or: [
          { landlordId: id },
          { landlordEmail: email },
          { landlordId: 'demo-landlord' },
          { landlordEmail: 'alice.rahman@landlord.com' },
        ],
      });
    } else if (role === 'user') {
      allRoleRequests = await MaintenanceRequest.find({ $or: [{ tenantEmail: email }, { tenantId: id }] });
    } else {
      allRoleRequests = await MaintenanceRequest.find({});
    }

    const summary = {
      total: allRoleRequests.length,
      submittedCount: allRoleRequests.filter((r) => r.status === 'Submitted').length,
      acknowledgedCount: allRoleRequests.filter((r) => r.status === 'Acknowledged').length,
      inProgressCount: allRoleRequests.filter((r) => r.status === 'In Progress').length,
      scheduledCount: allRoleRequests.filter((r) => r.status === 'Scheduled').length,
      resolvedCount: allRoleRequests.filter((r) => r.status === 'Resolved').length,
      emergencyCount: allRoleRequests.filter((r) => r.urgency === 'Emergency' && r.status !== 'Resolved').length,
    };

    res.json({ requests, summary });
  } catch (err) {
    console.error('❌ getRequests error:', err);
    res.status(500).json({ message: 'Failed to fetch maintenance requests', error: err.message });
  }
};

// ── 3. Update Maintenance Stage & Details ────────────────────
exports.updateStage = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, landlordNotes, scheduledDate, cost, note } = req.body;

    // Gate maintenance stage updates exclusively to Landlords
    if (req.user && req.user.role !== 'landlord') {
      return res.status(403).json({
        message: 'Access denied: Only the Landlord is authorized to manage and update maintenance repair stages.',
      });
    }

    const request = await MaintenanceRequest.findById(id);
    if (!request) return res.status(404).json({ message: 'Maintenance request not found' });

    const updaterName = req.user?.name || req.user?.email || 'Landlord';
    const prevStatus = request.status;

    if (status && status !== request.status) {
      request.status = status;
      request.statusHistory.push({
        status,
        updatedAt: new Date(),
        updatedBy: updaterName,
        note: note || `Stage updated to '${status}'`,
      });
    } else if (note) {
      request.statusHistory.push({
        status: request.status,
        updatedAt: new Date(),
        updatedBy: updaterName,
        note,
      });
    }

    if (landlordNotes !== undefined) request.landlordNotes = landlordNotes;
    if (scheduledDate !== undefined) request.scheduledDate = scheduledDate ? new Date(scheduledDate) : null;
    if (cost !== undefined) request.cost = Number(cost);

    await request.save();

    // ── Notify tenant of stage change ────────────────────────
    if (status && status !== prevStatus) {
      const stageEmojis = {
        'Acknowledged': '👁️ Acknowledged',
        'In Progress': '🛠️ In Progress',
        'Scheduled': '📅 Scheduled',
        'Resolved': '✅ Resolved',
        'Cancelled': '❌ Cancelled',
      };
      const stageLabel = stageEmojis[status] || status;

      const notifType = status === 'Resolved' ? 'maintenance_resolved' : 'maintenance_updated';

      let msgDetail = '';
      if (scheduledDate) msgDetail = ` Repair scheduled for ${new Date(scheduledDate).toLocaleDateString()}.`;
      if (note) msgDetail += ` Note: "${note}"`;

      await createNotification({
        recipientId: request.tenantId,
        recipientEmail: request.tenantEmail,
        recipientRole: 'user',
        type: notifType,
        title: `Maintenance Update: ${stageLabel}`,
        message: `Your "${request.title}" request has been updated to stage "${status}".${msgDetail}`,
        link: '/maintenance',
        sourceId: request._id.toString(),
        sourceType: 'MaintenanceRequest',
      });
    }

    res.json({
      message: `Maintenance request stage updated to '${request.status}'`,
      request,
    });
  } catch (err) {
    console.error('❌ updateStage error:', err);
    res.status(500).json({ message: 'Failed to update maintenance stage', error: err.message });
  }
};

// ── 4. Delete Maintenance Request ─────────────────────────────
exports.deleteRequest = async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user && req.user.role !== 'landlord') {
      return res.status(403).json({
        message: 'Access denied: Only the assigned Landlord is authorized to resolve or remove maintenance tickets.',
      });
    }

    const request = await MaintenanceRequest.findByIdAndDelete(id);
    if (!request) return res.status(404).json({ message: 'Maintenance request not found' });
    res.json({ message: 'Maintenance request deleted successfully', id });
  } catch (err) {
    console.error('❌ deleteRequest error:', err);
    res.status(500).json({ message: 'Failed to delete maintenance request', error: err.message });
  }
};
