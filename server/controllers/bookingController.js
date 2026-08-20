const Booking = require('../models/Booking');
const Listing = require('../models/Listing');

exports.createBooking = async (req, res) => {
  try {
    const { listingId, dates, notes } = req.body;

    if (!listingId || !dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ message: 'listingId and at least one requested date are required.' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found.' });
    }

    const alreadyBooked = dates.some((d) => listing.bookedDates?.includes(d));
    if (alreadyBooked) {
      return res.status(400).json({ message: 'One or more selected dates are already booked/unavailable.' });
    }

    const tenantId = req.user.id || 'demo-user-001';
    const tenantName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Tenant User';
    const tenantEmail = req.user.email || 'tenant@example.com';
    const landlordId = listing.landlordId ? listing.landlordId.toString() : 'demo-landlord-001';

    const booking = await Booking.create({
      listingId: listing._id,
      listingTitle: listing.title,
      listingLocation: listing.location,
      tenantId,
      tenantName,
      tenantEmail,
      landlordId,
      dates,
      notes: notes || '',
      status: 'pending_landlord',
    });

    return res.status(201).json({
      success: true,
      message: 'Booking request submitted! Waiting for Landlord approval.',
      booking,
    });
  } catch (err) {
    console.error('❌ Create Booking Error:', err);
    return res.status(500).json({ message: 'Server error creating booking request' });
  }
};

exports.getBookings = async (req, res) => {
  try {
    const { tenantId, landlordId, status } = req.query;
    const filter = {};

    if (tenantId) filter.tenantId = tenantId;
    if (landlordId) filter.landlordId = landlordId;
    if (status) filter.status = status;

    if (req.user.role === 'landlord' && !landlordId) {
      filter.landlordId = req.user.id;
    }

    if (req.user.role === 'user' && !tenantId) {
      filter.tenantId = req.user.id;
    }

    const bookings = await Booking.find(filter).sort({ createdAt: -1 });
    return res.json(bookings);
  } catch (err) {
    console.error('❌ Get Bookings Error:', err);
    return res.status(500).json({ message: 'Server error fetching bookings' });
  }
};

exports.landlordApprove = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    if (booking.status !== 'pending_landlord') {
      return res.status(400).json({ message: `Cannot approve booking in status: ${booking.status}` });
    }

    booking.status = 'pending_admin';
    await booking.save();

    return res.json({
      success: true,
      message: 'Booking approved by Landlord! Sent to Admin for final approval.',
      booking,
    });
  } catch (err) {
    console.error('❌ Landlord Approve Error:', err);
    return res.status(500).json({ message: 'Server error approving booking' });
  }
};

exports.adminApprove = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    if (booking.status !== 'pending_admin' && booking.status !== 'pending_landlord') {
      return res.status(400).json({ message: `Cannot approve booking in status: ${booking.status}` });
    }

    booking.status = 'approved';
    await booking.save();

    const listing = await Listing.findById(booking.listingId);
    if (listing) {
      const existingDates = new Set(listing.bookedDates || []);
      booking.dates.forEach((d) => existingDates.add(d));
      listing.bookedDates = Array.from(existingDates);
      await listing.save();
    }

    return res.json({
      success: true,
      message: 'Booking officially approved by Admin! Listing calendar updated.',
      booking,
    });
  } catch (err) {
    console.error('❌ Admin Approve Error:', err);
    return res.status(500).json({ message: 'Server error approving booking' });
  }
};

exports.rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    booking.status = 'rejected';
    await booking.save();

    return res.json({
      success: true,
      message: 'Booking request rejected.',
      booking,
    });
  } catch (err) {
    console.error('❌ Reject Booking Error:', err);
    return res.status(500).json({ message: 'Server error rejecting booking' });
  }
};
