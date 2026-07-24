const express = require('express');
const router = express.Router();

const User      = require('../models/User');
const Listing   = require('../models/Listing');
const Complaint = require('../models/Complaint');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');

// All routes in this file require a valid admin token
router.use(authenticate, requireAdmin);

// ─────────────────────────────────────────────────────────────
// GET /api/admin/stats
// Returns platform KPI counts for the dashboard stat cards
// ─────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const [totalUsers, unverifiedLandlords, pendingListings, activeComplaints] =
      await Promise.all([
        User.countDocuments({ role: { $ne: 'admin' } }),
        User.countDocuments({ role: 'landlord', isVerified: false }),
        Listing.countDocuments({ status: 'pending' }),
        Complaint.countDocuments({ status: { $in: ['Pending', 'In Review'] } }),
      ]);

    res.json({ totalUsers, unverifiedLandlords, pendingListings, activeComplaints });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/landlords/pending
// Lists landlords whose accounts are awaiting verification
// ─────────────────────────────────────────────────────────────
router.get('/landlords/pending', async (req, res) => {
  try {
    const landlords = await User.find({ role: 'landlord', isVerified: false })
      .select('firstName lastName email createdAt verificationStatus')
      .sort({ createdAt: -1 });

    res.json(landlords);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/landlords/:id/verify
// Body: { action: 'approve' | 'reject' }
// Approve  → isVerified: true,  verificationStatus: 'approved'
// Reject   → isVerified: false, verificationStatus: 'rejected' (account preserved)
// ─────────────────────────────────────────────────────────────
router.patch('/landlords/:id/verify', async (req, res) => {
  try {
    const { action } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ message: 'action must be "approve" or "reject"' });
    }

    const update =
      action === 'approve'
        ? { isVerified: true,  verificationStatus: 'approved' }
        : { isVerified: false, verificationStatus: 'rejected' }; // account NOT deleted

    const landlord = await User.findByIdAndUpdate(req.params.id, update, { new: true })
      .select('firstName lastName email isVerified verificationStatus');

    if (!landlord) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: `Landlord ${action}d successfully`, landlord });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// GET /api/admin/listings/pending
// Returns all listings awaiting approval, with landlord details populated
// ─────────────────────────────────────────────────────────────
router.get('/listings/pending', async (req, res) => {
  try {
    const listings = await Listing.find({ status: 'pending' })
      .populate('landlordId', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/admin/listings/:id/status
// Body: { status: 'approved' | 'rejected' }
// ─────────────────────────────────────────────────────────────
router.patch('/listings/:id/status', async (req, res) => {
  try {
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'status must be "approved" or "rejected"' });
    }

    const listing = await Listing.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('landlordId', 'firstName lastName email');

    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    res.json({ message: `Listing ${status} successfully`, listing });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
