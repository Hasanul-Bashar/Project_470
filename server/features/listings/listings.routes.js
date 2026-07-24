const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

const Listing = require('./Listing');
const User = require('../auth/User');
const { authenticate } = require('../auth/auth.middleware');


// Helper to resolve user ID (handles real ObjectIds vs demo-mode mock IDs)
const resolveLandlordId = async (user) => {
  if (mongoose.Types.ObjectId.isValid(user.id)) {
    return user.id;
  }
  const dbUser = await User.findOne({ email: user.email });
  return dbUser ? dbUser._id : null;
};

// ─────────────────────────────────────────────────────────────
// GET /api/listings
// Returns all listings. If logged in as landlord, returns only their listings.
// ─────────────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'landlord') {
      const landlordId = await resolveLandlordId(req.user);
      if (!landlordId) {
        return res.status(404).json({ message: 'Landlord user not found' });
      }

      // Enforce admin verification check
      const dbUser = await User.findById(landlordId);
      if (dbUser && !dbUser.isVerified) {
        return res.status(403).json({
          status: 'pending_verification',
          message: 'Your landlord account is awaiting admin approval',
        });
      }

      const listings = await Listing.find({ landlordId }).sort({ createdAt: -1 });
      return res.json(listings);
    }

    // For regular users/admins, return all approved listings (or all listings for admins)
    const filter = req.user.role === 'admin' ? {} : { status: 'approved' };
    const listings = await Listing.find(filter).sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// POST /api/listings
// Adds a new listing (starts as pending)
// ─────────────────────────────────────────────────────────────
router.post('/', authenticate, async (req, res) => {
  try {
    const { title, location, description, price, amenities } = req.body;

    if (!title || !location || !description || !price) {
      return res.status(400).json({ message: 'Title, location, description, and price are required' });
    }

    const landlordId = await resolveLandlordId(req.user);
    if (!landlordId) {
      return res.status(404).json({ message: 'Landlord user not found' });
    }

    // Enforce admin verification check
    const dbUser = await User.findById(landlordId);
    if (dbUser && !dbUser.isVerified) {
      return res.status(403).json({
        status: 'pending_verification',
        message: 'Your landlord account is awaiting admin approval',
      });
    }

    const listing = new Listing({
      title,
      location,
      description,
      price: Number(price),
      amenities: amenities || [],
      landlordId,
      status: 'pending', // Awaits admin approval
      bookedDates: [],
    });


    await listing.save();
    res.status(201).json({ message: 'Listing submitted successfully', listing });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// ─────────────────────────────────────────────────────────────
// PATCH /api/listings/:id/availability
// Body: { bookedDates: ['YYYY-MM-DD', ...] }
// Updates the list of booked/unavailable dates for a property
// ─────────────────────────────────────────────────────────────
router.patch('/:id/availability', authenticate, async (req, res) => {
  try {
    const { bookedDates } = req.body;

    if (!Array.isArray(bookedDates)) {
      return res.status(400).json({ message: 'bookedDates must be an array of date strings' });
    }

    const listing = await Listing.findById(req.params.id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    // Verify ownership (unless admin)
    if (req.user.role !== 'admin') {
      const landlordId = await resolveLandlordId(req.user);
      if (!listing.landlordId.equals(landlordId)) {
        return res.status(403).json({ message: 'Not authorized to manage this property' });
      }
    }

    listing.bookedDates = bookedDates;
    await listing.save();

    res.json({ message: 'Availability updated successfully', listing });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
