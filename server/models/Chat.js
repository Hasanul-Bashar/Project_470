const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema(
  {
    senderId: { type: String, required: true },
    senderName: { type: String, required: true },
    senderRole: { type: String, required: true },
    text: { type: String, required: true, trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  { _id: true }
);

const ChatSchema = new mongoose.Schema(
  {
    listingId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Listing',
      required: true,
    },
    listingTitle: { type: String, required: true },

    tenantId: { type: String, required: true },
    tenantName: { type: String, required: true },

    landlordId: { type: String, required: true },
    landlordName: { type: String, default: 'Landlord' },

    messages: [MessageSchema],
    lastMessage: { type: String, default: '' },
    lastMessageAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

module.exports = mongoose.models.Chat || mongoose.model('Chat', ChatSchema);
