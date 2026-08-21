const Chat = require('../models/Chat');
const Listing = require('../models/Listing');

/**
 * Get all chat threads for logged in user (tenant or landlord)
 */
exports.getChats = async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    const filter = {};
    if (userRole === 'landlord') {
      filter.landlordId = userId;
    } else if (userRole === 'user') {
      filter.tenantId = userId;
    }

    const chats = await Chat.find(filter).sort({ updatedAt: -1 });
    return res.json(chats);
  } catch (err) {
    console.error('❌ Get Chats Error:', err);
    return res.status(500).json({ message: 'Server error fetching chats' });
  }
};

/**
 * Get or initialize a chat thread for a specific listing
 */
exports.getOrCreateChatByListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const tenantId = req.user.id;
    const tenantName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Tenant User';

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    const landlordId = listing.landlordId ? listing.landlordId.toString() : 'demo-landlord-001';

    let chat = await Chat.findOne({ listingId, tenantId });

    if (!chat) {
      chat = await Chat.create({
        listingId: listing._id,
        listingTitle: listing.title,
        tenantId,
        tenantName,
        landlordId,
        landlordName: 'Landlord',
        messages: [
          {
            senderId: 'system',
            senderName: 'RentEase System',
            senderRole: 'system',
            text: `Chat thread initiated for "${listing.title}". Ask questions about rent, viewing times, or lease agreements.`,
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
 * Send a message in a chat thread
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

    const senderId = req.user.id;
    const senderName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'User';
    const senderRole = req.user.role || 'user';

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
