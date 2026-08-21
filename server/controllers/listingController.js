const Listing = require('../models/Listing');

exports.getListings = async (req, res) => {
  try {
    const isLandlord = req.user.role === 'landlord';
    let filter = { status: 'approved' };

    if (isLandlord) {
      if (!req.user.isVerifiedLandlord) {
        return res.status(403).json({
          message: 'Your landlord account is pending admin verification. Please wait for admin approval.',
          status: 'pending_verification',
        });
      }
      filter = { landlordId: req.user.id };
    }

    const listings = await Listing.find(filter).sort({ createdAt: -1 });
    return res.json(listings);
  } catch (err) {
    console.error('❌ Get Listings Error:', err);
    return res.status(500).json({ message: 'Server error fetching listings' });
  }
};

exports.createListing = async (req, res) => {
  try {
    if (req.user.role !== 'landlord') {
      return res.status(403).json({ message: 'Access denied. Only landlords can add property listings.' });
    }

    if (!req.user.isVerifiedLandlord) {
      return res.status(403).json({ message: 'Your landlord account must be verified by admin before posting properties.' });
    }

    const { title, location, description, price, amenities, photos } = req.body;

    const newListing = await Listing.create({
      title,
      location,
      description,
      price,
      amenities: amenities || [],
      photos: photos || [],
      status: 'pending',
      landlordId: req.user.id,
      bookedDates: [],
    });

    return res.status(201).json({
      success: true,
      message: 'Property listing submitted for admin review!',
      listing: newListing,
    });
  } catch (err) {
    console.error('❌ Create Listing Error:', err);
    return res.status(500).json({ message: 'Server error creating property listing' });
  }
};

exports.updateAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { bookedDates } = req.body;

    if (!Array.isArray(bookedDates)) {
      return res.status(400).json({ message: 'bookedDates must be an array of date strings' });
    }

    const listing = await Listing.findById(id);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' });
    }

    if (req.user.role === 'landlord' && listing.landlordId.toString() !== req.user.id.toString()) {
      return res.status(403).json({ message: 'Unauthorized to modify availability for this property' });
    }

    listing.bookedDates = bookedDates;
    await listing.save();

    return res.json({
      success: true,
      message: 'Availability calendar updated successfully',
      bookedDates: listing.bookedDates,
    });
  } catch (err) {
    console.error('❌ Update Availability Error:', err);
    return res.status(500).json({ message: 'Server error updating availability' });
  }
};
