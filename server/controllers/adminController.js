const User = require('../models/User');
const Listing = require('../models/Listing');
const Complaint = require('../models/Complaint');

exports.getStats = async (_req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: 'user' });
    const pendingLandlords = await User.countDocuments({ role: 'landlord', isVerifiedLandlord: false });
    const verifiedLandlords = await User.countDocuments({ role: 'landlord', isVerifiedLandlord: true });
    const pendingListings = await Listing.countDocuments({ status: 'pending' });
    const activeListings = await Listing.countDocuments({ status: 'approved' });
    const openComplaints = await Complaint.countDocuments({ status: { $in: ['Pending', 'In Review'] } });

    return res.json({
      totalUsers,
      pendingLandlords,
      verifiedLandlords,
      pendingListings,
      activeListings,
      openComplaints,
    });
  } catch (err) {
    console.error('❌ Get Admin Stats Error:', err);
    return res.status(500).json({ message: 'Server error fetching stats' });
  }
};

exports.getPendingLandlords = async (_req, res) => {
  try {
    const landlords = await User.find({ role: 'landlord', isVerifiedLandlord: false }).sort({ createdAt: -1 });
    return res.json(landlords);
  } catch (err) {
    console.error('❌ Get Pending Landlords Error:', err);
    return res.status(500).json({ message: 'Server error fetching pending landlords' });
  }
};

exports.verifyLandlord = async (req, res) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    const landlord = await User.findById(id);
    if (!landlord || landlord.role !== 'landlord') {
      return res.status(404).json({ message: 'Landlord not found' });
    }

    if (action === 'approve') {
      landlord.isVerifiedLandlord = true;
      await landlord.save();
      return res.json({ success: true, message: 'Landlord account verified successfully' });
    } else if (action === 'reject') {
      await User.findByIdAndDelete(id);
      return res.json({ success: true, message: 'Landlord account application rejected and removed' });
    }

    return res.status(400).json({ message: 'Invalid action. Must be approve or reject.' });
  } catch (err) {
    console.error('❌ Verify Landlord Error:', err);
    return res.status(500).json({ message: 'Server error processing landlord verification' });
  }
};

exports.getPendingListings = async (_req, res) => {
  try {
    const listings = await Listing.find({ status: 'pending' }).populate('landlordId', 'name email').sort({ createdAt: -1 });
    return res.json(listings);
  } catch (err) {
    console.error('❌ Get Pending Listings Error:', err);
    return res.status(500).json({ message: 'Server error fetching pending listings' });
  }
};

exports.updateListingStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be approved or rejected.' });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    listing.status = status;
    await listing.save();

    return res.json({ success: true, message: `Listing ${status} successfully`, listing });
  } catch (err) {
    console.error('❌ Update Listing Status Error:', err);
    return res.status(500).json({ message: 'Server error updating listing status' });
  }
};
