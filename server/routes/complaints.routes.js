const express  = require('express');
const mongoose = require('mongoose');
const router   = express.Router();

const Complaint = require('../models/Complaint');
const User      = require('../models/User');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// ─────────────────────────────────────────────────────────────
// POST /api/complaints
// Any authenticated user can file a complaint.
//
// Demo-mode note:
//   The mock JWT stores id as a non-ObjectId string (e.g. 'demo-user-001').
//   When that happens, we look up the real user by email so submittedBy
//   always holds a valid MongoDB ObjectId.
// ─────────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, relatedListingId, description } = req.body;

    if (!title || !description) {
      return res.status(400).json({ message: 'Title and description are required' });
    }

    // Resolve submittedBy to a real ObjectId
    let submittedById;
    if (mongoose.Types.ObjectId.isValid(req.user.id)) {
      submittedById = req.user.id;
    } else {
      // Demo mode — look up user by email from the mock token
      const dbUser = await User.findOne({ email: req.user.email });
      if (!dbUser) {
        return res.status(400).json({
          message: 'Demo user not found in database. Run: npm run seed:admin',
        });
      }
      submittedById = dbUser._id;
    }

    // Only use relatedListingId if it is a valid ObjectId
    const listingRef =
      relatedListingId && mongoose.Types.ObjectId.isValid(relatedListingId)
        ? relatedListingId
        : null;

    const complaint = new Complaint({
      title,
      relatedListingId: listingRef,
      description,
      submittedBy: submittedById,
    });

    await complaint.save();
    res.status(201).json({ message: 'Complaint submitted successfully', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/complaints?status=Pending
// Admin only — list all complaints with optional status filter
// ─────────────────────────────────────────────────────────────
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const filter = {};
    const validStatuses = ['Pending', 'In Review', 'Resolved'];
    if (req.query.status && validStatuses.includes(req.query.status)) {
      filter.status = req.query.status;
    }

    const complaints = await Complaint.find(filter)
      .populate('submittedBy',      'firstName lastName email')
      .populate('relatedListingId', 'title location')
      .sort({ createdAt: -1 });

    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/complaints/:id
// Admin only — full complaint detail with populated listing + user
// ─────────────────────────────────────────────────────────────
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('submittedBy',      'firstName lastName email role')
      .populate('relatedListingId', 'title location price description amenities');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/complaints/:id/status
// Admin only — update status and append a resolution note
// ─────────────────────────────────────────────────────────────
router.patch('/:id/status', authenticate, requireAdmin, async (req, res) => {
  try {
    const { status, resolutionNote } = req.body;
    const validStatuses = ['Pending', 'In Review', 'Resolved'];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `status must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const update = { status, resolutionNote: resolutionNote || '' };
    if (status === 'Resolved') update.resolvedAt = new Date();

    const complaint = await Complaint.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('submittedBy',      'firstName lastName email')
      .populate('relatedListingId', 'title location');

    if (!complaint) {
      return res.status(404).json({ message: 'Complaint not found' });
    }

    res.json({ message: 'Complaint updated successfully', complaint });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
