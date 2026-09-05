const Booking      = require('../models/Booking');
const Listing      = require('../models/Listing');
const User         = require('../models/User');
const Notification = require('../models/Notification');

// ─── Helper: Create a Notification record ──────────────────────────────────
async function notify({ recipientId, recipientEmail, recipientRole, type, title, message, link, sourceId }) {
  try {
    await Notification.create({
      recipientId,
      recipientEmail,
      recipientRole,
      type,
      title,
      message,
      link: link || '',
      sourceId: sourceId || '',
      sourceType: 'Booking',
    });
  } catch (err) {
    console.error('⚠️ Notification creation failed:', err.message);
    // Non-fatal — do not block the main response
  }
}

// ─── 1. Tenant submits a booking request ───────────────────────────────────
exports.createBooking = async (req, res) => {
  try {
    const { listingId, dates, notes } = req.body;

    if (!listingId || !dates || !Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({ message: 'listingId and at least one requested date are required.' });
    }

    const listing = await Listing.findById(listingId);
    if (!listing) return res.status(404).json({ message: 'Listing not found.' });

    const alreadyBooked = dates.some((d) => listing.bookedDates?.includes(d));
    if (alreadyBooked) {
      return res.status(400).json({ message: 'One or more selected dates are already booked/unavailable.' });
    }

    const tenantId    = req.user.id;
    const tenantName  = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Tenant User';
    const tenantEmail = req.user.email || '';
    const landlordId  = listing.landlordId ? listing.landlordId.toString() : 'demo-landlord-001';

    // Fetch landlord info for notifications
    let landlordName  = '';
    let landlordEmail = '';
    try {
      const landlordUser = await User.findById(landlordId).lean();
      if (landlordUser) {
        landlordName  = landlordUser.name || `${landlordUser.firstName || ''} ${landlordUser.lastName || ''}`.trim() || 'Landlord';
        landlordEmail = landlordUser.email || '';
      }
    } catch (_) { /* non-fatal */ }

    const booking = await Booking.create({
      listingId:    listing._id,
      listingTitle: listing.title,
      listingLocation: listing.location,
      tenantId,
      tenantName,
      tenantEmail,
      landlordId,
      landlordName,
      landlordEmail,
      dates,
      notes:  notes || '',
      status: 'pending_landlord',
    });

    // ── Notify landlord about new booking request ─────────────────────────
    if (landlordId && landlordEmail) {
      await notify({
        recipientId:   landlordId,
        recipientEmail: landlordEmail,
        recipientRole: 'landlord',
        type:    'booking_request',
        title:   '📥 New Rental Booking Request',
        message: `Tenant "${tenantName}" has submitted a rental booking request for your property "${listing.title}" on date(s): ${dates.join(', ')}. Please review and approve or reject in your Landlord Dashboard.`,
        link:    '/landlord-dashboard',
        sourceId: booking._id.toString(),
      });
    }

    // ── Notify tenant that request was submitted ─────────────────────────
    await notify({
      recipientId:   tenantId,
      recipientEmail: tenantEmail,
      recipientRole: 'user',
      type:    'booking_request',
      title:   '📋 Booking Request Submitted',
      message: `Your rental request for "${listing.title}" on ${dates.join(', ')} has been submitted and is now awaiting Landlord review.`,
      link:    '/user-dashboard',
      sourceId: booking._id.toString(),
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

// ─── 2. Get bookings (role-filtered) ──────────────────────────────────────
exports.getBookings = async (req, res) => {
  try {
    const { tenantId, landlordId, status } = req.query;
    const filter = {};

    if (tenantId)   filter.tenantId   = tenantId;
    if (landlordId) filter.landlordId = landlordId;
    if (status)     filter.status     = status;

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

// ─── 3. Landlord approves → status becomes pending_admin ──────────────────
exports.landlordApprove = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    if (booking.status !== 'pending_landlord') {
      return res.status(400).json({ message: `Cannot approve booking in status: ${booking.status}` });
    }

    booking.status = 'pending_admin';
    await booking.save();

    // ── Notify tenant: landlord approved, waiting for admin ───────────────
    await notify({
      recipientId:   booking.tenantId,
      recipientEmail: booking.tenantEmail,
      recipientRole: 'user',
      type:    'booking_approved',
      title:   '🏠 Landlord Approved Your Request!',
      message: `Great news! The landlord has approved your rental request for "${booking.listingTitle}" on ${booking.dates.join(', ')}. Your request is now pending final Admin approval. You'll be notified once the Admin reviews it.`,
      link:    '/user-dashboard',
      sourceId: booking._id.toString(),
    });

    // ── Notify admin: new booking needs final approval ────────────────────
    await notify({
      recipientId:   'admin',
      recipientEmail: process.env.ADMIN_EMAIL || 'admin@rentease.com',
      recipientRole: 'admin',
      type:    'booking_request',
      title:   '🛡 Booking Awaiting Your Final Approval',
      message: `Landlord-approved booking from tenant "${booking.tenantName}" for property "${booking.listingTitle}" on ${booking.dates.join(', ')} is now in your queue for final approval.`,
      link:    '/admin',
      sourceId: booking._id.toString(),
    });

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

// ─── 4. Admin final approval → status becomes approved ────────────────────
exports.adminApprove = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    // Admin can only approve bookings that have already been approved by landlord
    if (booking.status !== 'pending_admin') {
      return res.status(400).json({
        message: booking.status === 'pending_landlord'
          ? 'This booking is still awaiting Landlord approval first.'
          : `Cannot approve booking in status: ${booking.status}`,
      });
    }

    booking.status = 'approved';
    await booking.save();

    // Reserve dates on the listing calendar
    const listing = await Listing.findById(booking.listingId);
    if (listing) {
      const existingDates = new Set(listing.bookedDates || []);
      booking.dates.forEach((d) => existingDates.add(d));
      listing.bookedDates = Array.from(existingDates);
      await listing.save();

      // Auto-create day-based rent payment record
      try {
        const RentPayment = require('../models/RentPayment');
        const bookedDaysCount = booking.dates?.length || 1;
        const primaryMonth    = booking.dates?.[0]?.slice(0, 7) || new Date().toISOString().slice(0, 7);
        const [yStr, mStr]    = primaryMonth.split('-');
        const daysInMonth     = (yStr && mStr) ? new Date(parseInt(yStr, 10), parseInt(mStr, 10), 0).getDate() : 30;
        const monthlyRent     = listing.price || 30000;
        const dailyRate       = Math.round(monthlyRent / daysInMonth);
        const calculatedRent  = Math.round(dailyRate * bookedDaysCount);
        const dueDate         = new Date();
        dueDate.setDate(dueDate.getDate() + 5);

        await RentPayment.findOneAndUpdate(
          { bookingId: booking._id },
          {
            tenantId:     booking.tenantId,
            tenantName:   booking.tenantName,
            tenantEmail:  booking.tenantEmail,
            landlordId:   booking.landlordId,
            listingId:    listing._id,
            listingTitle: listing.title,
            month:        primaryMonth,
            amount:       calculatedRent,
            bookedDays:   bookedDaysCount,
            dailyRate,
            bookingId:    booking._id,
            dueDate,
            notes: `Calculated for ${bookedDaysCount} booked day(s) @ ৳${dailyRate.toLocaleString()}/day (Monthly rate: ৳${monthlyRent.toLocaleString()})`,
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      } catch (rentErr) {
        console.error('⚠️ Could not auto-generate rent record:', rentErr.message);
      }
    }

    // ── Notify tenant: fully approved! ────────────────────────────────────
    await notify({
      recipientId:   booking.tenantId,
      recipientEmail: booking.tenantEmail,
      recipientRole: 'user',
      type:    'booking_approved',
      title:   '🎉 Booking Fully Approved!',
      message: `Congratulations! Your rental booking for "${booking.listingTitle}" on ${booking.dates.join(', ')} has been officially approved by the Admin. Your dates are now reserved. Check your Rent Tracking page for the upcoming payment.`,
      link:    '/user-dashboard',
      sourceId: booking._id.toString(),
    });

    // ── Notify landlord: admin confirmed ─────────────────────────────────
    if (booking.landlordId && booking.landlordEmail) {
      await notify({
        recipientId:   booking.landlordId,
        recipientEmail: booking.landlordEmail,
        recipientRole: 'landlord',
        type:    'booking_approved',
        title:   '✅ Admin Confirmed Booking',
        message: `The Admin has officially confirmed the booking from tenant "${booking.tenantName}" for your property "${booking.listingTitle}" on ${booking.dates.join(', ')}. The dates have been reserved on the property calendar.`,
        link:    '/landlord-dashboard',
        sourceId: booking._id.toString(),
      });
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

// ─── 5. Reject booking (landlord or admin) ────────────────────────────────
exports.rejectBooking = async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });

    if (booking.status === 'approved') {
      return res.status(400).json({ message: 'Cannot reject an already approved booking.' });
    }

    const rejecterRole   = req.user?.role || 'admin';   // 'landlord' or 'admin'
    const rejectionReason = req.body?.reason || '';

    booking.status          = 'rejected';
    booking.rejectedBy      = rejecterRole === 'landlord' ? 'landlord' : 'admin';
    booking.rejectionReason = rejectionReason;
    await booking.save();

    const rejectedByLabel = rejecterRole === 'landlord' ? 'the Landlord' : 'the Admin';
    const reasonSuffix    = rejectionReason ? ` Reason: "${rejectionReason}".` : '';

    // ── Notify tenant ────────────────────────────────────────────────────
    await notify({
      recipientId:   booking.tenantId,
      recipientEmail: booking.tenantEmail,
      recipientRole: 'user',
      type:    'booking_rejected',
      title:   '❌ Booking Request Rejected',
      message: `Your rental request for "${booking.listingTitle}" on ${booking.dates.join(', ')} has been rejected by ${rejectedByLabel}.${reasonSuffix} You may submit a new request for different dates.`,
      link:    '/user-dashboard',
      sourceId: booking._id.toString(),
    });

    // ── Notify landlord if admin rejected ────────────────────────────────
    if (rejecterRole === 'admin' && booking.landlordId && booking.landlordEmail) {
      await notify({
        recipientId:   booking.landlordId,
        recipientEmail: booking.landlordEmail,
        recipientRole: 'landlord',
        type:    'booking_rejected',
        title:   '🔴 Booking Rejected by Admin',
        message: `The Admin has rejected the booking from tenant "${booking.tenantName}" for your property "${booking.listingTitle}" on ${booking.dates.join(', ')}.${reasonSuffix}`,
        link:    '/landlord-dashboard',
        sourceId: booking._id.toString(),
      });
    }

    return res.json({
      success: true,
      message: `Booking rejected by ${rejectedByLabel}.`,
      booking,
    });
  } catch (err) {
    console.error('❌ Reject Booking Error:', err);
    return res.status(500).json({ message: 'Server error rejecting booking' });
  }
};
