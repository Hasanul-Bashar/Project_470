const Chat = require('../models/Chat');
const Listing = require('../models/Listing');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');

/**
 * Get all chat threads for logged in user (tenant or landlord)
 */
exports.getChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    let filter = {};
    if (userRole === 'landlord') {
      // Find all listings owned by this landlord
      const landlordListings = await Listing.find({
        $or: [{ landlordId: userId }, { landlordId: userId?.toString() }],
      }).select('_id');
      const listingIds = landlordListings.map((l) => l._id);

      filter = {
        $or: [
          { landlordId: userId },
          { landlordId: userId?.toString() },
          { listingId: { $in: listingIds } },
        ],
      };
    } else if (userRole === 'admin') {
      // Admin can view all chats if needed
      filter = {};
    } else {
      // Tenant
      filter = {
        $or: [{ tenantId: userId }, { tenantId: userId?.toString() }],
      };
    }

    const chats = await Chat.find(filter).sort({ updatedAt: -1 });
    return res.json(chats);
  } catch (err) {
    console.error('❌ Get Chats Error:', err);
    return res.status(500).json({ message: 'Server error fetching chats' });
  }
};

/**
 * Get a specific chat thread by chatId
 */
exports.getChatById = async (req, res) => {
  try {
    const { chatId } = req.params;
    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat not found' });
    }
    return res.json(chat);
  } catch (err) {
    console.error('❌ Get Chat By Id Error:', err);
    return res.status(500).json({ message: 'Server error fetching chat thread' });
  }
};

/**
 * Get or initialize a chat thread for a specific listing
 */
exports.getOrCreateChatByListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const userId = req.user.id;
    const userRole = req.user.role;

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Landlord view: if landlord asks for chats on their listing
    if (userRole === 'landlord') {
      const { tenantId } = req.query;
      if (tenantId) {
        let chat = await Chat.findOne({ listingId, tenantId });
        return res.json(chat || { messages: [] });
      }
      const threads = await Chat.find({ listingId }).sort({ updatedAt: -1 });
      return res.json(threads);
    }

    // Tenant view: find or create personal chat with landlord for this listing
    const tenantId = userId.toString();
    const tenantName =
      req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Tenant User';

    let landlordId = listing.landlordId ? listing.landlordId.toString() : 'demo-landlord-001';
    let landlordName = 'Landlord';

    try {
      if (listing.landlordId) {
        const lUser = await User.findById(listing.landlordId);
        if (lUser) {
          landlordName = lUser.name || `${lUser.firstName || ''} ${lUser.lastName || ''}`.trim() || lUser.email;
        }
      }
    } catch (e) {}

    let chat = await Chat.findOne({ listingId, tenantId });

    if (!chat) {
      chat = await Chat.create({
        listingId: listing._id,
        listingTitle: listing.title,
        tenantId,
        tenantName,
        landlordId,
        landlordName,
        messages: [
          {
            senderId: 'system',
            senderName: 'RentEase System',
            senderRole: 'system',
            text: `Chat thread initiated for "${listing.title}". You are now connected with the landlord.`,
          },
        ],
        lastMessage: 'Chat thread initiated',
        lastMessageAt: new Date(),
      });
    }

    return res.json(chat);
  } catch (err) {
    console.error('❌ Get/Create Chat Error:', err);
    return res.status(500).json({ message: 'Server error creating chat thread' });
  }
};

/**
 * Send a message in a chat thread (supports both tenant and landlord)
 */
exports.sendMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ message: 'Message text cannot be empty' });
    }

    const chat = await Chat.findById(chatId);
    if (!chat) {
      return res.status(404).json({ message: 'Chat thread not found' });
    }

    const senderId = req.user.id.toString();
    const isSenderLandlord = req.user.role === 'landlord';
    const senderRole = isSenderLandlord ? 'landlord' : 'user';

    const senderName =
      req.user.name ||
      `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() ||
      (isSenderLandlord ? chat.landlordName || 'Landlord' : chat.tenantName || 'Tenant');

    const newMessage = {
      senderId,
      senderName,
      senderRole,
      text: text.trim(),
      timestamp: new Date(),
    };

    chat.messages.push(newMessage);
    chat.lastMessage = text.trim();
    chat.lastMessageAt = new Date();
    await chat.save();

    // Trigger notification to recipient
    const recipientId = isSenderLandlord ? chat.tenantId : chat.landlordId;
    const recipientRole = isSenderLandlord ? 'user' : 'landlord';

    try {
      await createNotification({
        recipientId,
        recipientEmail: '',
        recipientRole,
        type: 'chat_message',
        title: `New message from ${senderName}`,
        message: text.trim().slice(0, 120),
        link: isSenderLandlord ? '/dashboard' : '/landlord',
        sourceId: chat._id.toString(),
        sourceType: 'chat',
      });
    } catch (notifErr) {
      console.warn('⚠️ Notification error on chat:', notifErr.message);
    }

    return res.json({
      success: true,
      message: 'Message sent successfully',
      chat,
    });
  } catch (err) {
    console.error('❌ Send Message Error:', err);
    return res.status(500).json({ message: 'Server error sending message' });
  }
};
