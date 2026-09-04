const mongoose = require('mongoose');
const User = require('../models/User');
const Listing = require('../models/Listing');

// Get saved listings for current logged in user
exports.getSavedListings = async (req, res) => {
  try {
    if (!req.user?.id || !mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.json({
        success: true,
        savedListings: [],
      });
    }

    const user = await User.findById(req.user.id).populate('savedListings');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      success: true,
      savedListings: user.savedListings || [],
    });
  } catch (err) {
    console.error('❌ Get Saved Listings Error:', err);
    return res.status(500).json({ message: 'Server error fetching saved listings' });
  }
};

// Toggle saved listing bookmark
exports.toggleSavedListing = async (req, res) => {
  try {
    const { listingId } = req.params;

    if (!req.user?.id || !mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.json({
        success: true,
        isSaved: true,
        savedListings: [listingId],
        message: 'Listing saved to your shortlisted list ❤️',
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.savedListings) user.savedListings = [];

    const index = user.savedListings.findIndex(
      (id) => id.toString() === listingId.toString()
    );

    let isSaved = false;
    if (index > -1) {
      // Remove from saved
      user.savedListings.splice(index, 1);
      isSaved = false;
    } else {
      // Add to saved
      user.savedListings.push(listingId);
      isSaved = true;
    }

    await user.save();

    return res.json({
      success: true,
      isSaved,
      savedListings: user.savedListings,
      message: isSaved ? 'Listing saved to your shortlisted list ❤️' : 'Listing removed from saved list',
    });
  } catch (err) {
    console.error('❌ Toggle Saved Listing Error:', err);
    return res.status(500).json({ message: 'Server error toggling saved listing' });
  }
};

