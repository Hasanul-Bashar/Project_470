const Booking   = require('../models/Booking');
const Listing   = require('../models/Listing');
const ListingView = require('../models/ListingView');

/**
 * Controller (C) — Analytics
 * Provides landlord-specific analytics: views, booking metrics, revenue.
 */

/**
 * POST /api/analytics/view/:listingId
 * Records a single anonymous view event for a listing.
 * Called by the frontend when a user opens a listing's calendar/detail.
 */
exports.recordView = async (req, res) => {
  try {
    const { listingId } = req.params;
    await ListingView.create({ listingId, viewedAt: new Date() });
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('❌ Record View Error:', err);
    return res.status(500).json({ message: 'Server error recording view.' });
  }
};

/**
 * GET /api/analytics/landlord
 * Aggregates analytics for the authenticated landlord:
 *  - Per-listing: views, total requests, accepted requests, acceptance rate
 *  - Monthly revenue: approved bookings grouped by month (last 12 months)
 *  - Top-level KPIs: total views, total requests, overall acceptance rate, total revenue
 */
exports.getMyAnalytics = async (req, res) => {
  try {
    const landlordId = req.user.id;

    // Fetch all listings owned by this landlord
    const listings = await Listing.find({ landlordId }).lean();
    if (!listings.length) {
      return res.json({
        kpis: { totalViews: 0, totalRequests: 0, acceptanceRate: 0, totalRevenue: 0 },
        perListing: [],
        monthlyRevenue: [],
      });
    }

    const listingIds = listings.map((l) => l._id.toString());

    // Fetch all bookings for this landlord
    const bookings = await Booking.find({ landlordId }).lean();

    // Fetch all view events for this landlord's listings
    const viewEvents = await ListingView.find({
      listingId: { $in: listings.map((l) => l._id) },
    }).lean();

    // ── Per-listing aggregation ──────────────────────────────────
    const perListing = listings.map((listing) => {
      const lid = listing._id.toString();

      const views        = viewEvents.filter((v) => v.listingId.toString() === lid).length;
      const listingBks   = bookings.filter((b) => b.listingId.toString() === lid);
      const requests     = listingBks.length;
      const accepted     = listingBks.filter((b) => b.status === 'approved').length;
      const rejected     = listingBks.filter((b) => b.status === 'rejected').length;
      const acceptRate   = requests > 0 ? Math.round((accepted / requests) * 100) : 0;

      // Revenue: price × number of booked dates for approved bookings
      const revenue = listingBks
        .filter((b) => b.status === 'approved')
        .reduce((sum, b) => sum + (listing.price || 0) * (b.dates?.length || 1), 0);

      return {
        listingId: lid,
        title:       listing.title,
        location:    listing.location,
        price:       listing.price,
        status:      listing.status,
        views,
        requests,
        accepted,
        rejected,
        acceptRate,
        revenue,
      };
    });

    // ── Monthly revenue (last 12 months) ────────────────────────
    const now        = new Date();
    const months     = [];
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleString('default', { month: 'short', year: '2-digit' }),
        revenue: 0,
      });
    }

    const approvedBookings = bookings.filter((b) => b.status === 'approved');
    approvedBookings.forEach((bk) => {
      const listing = listings.find((l) => l._id.toString() === bk.listingId.toString());
      if (!listing) return;
      const price = listing.price || 0;
      (bk.dates || []).forEach((dateStr) => {
        const d = new Date(dateStr);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const bucket = months.find((m) => m.key === key);
        if (bucket) bucket.revenue += price;
      });
    });

    // ── Top-level KPIs ───────────────────────────────────────────
    const totalViews      = perListing.reduce((s, l) => s + l.views, 0);
    const totalRequests   = perListing.reduce((s, l) => s + l.requests, 0);
    const totalAccepted   = perListing.reduce((s, l) => s + l.accepted, 0);
    const acceptanceRate  = totalRequests > 0 ? Math.round((totalAccepted / totalRequests) * 100) : 0;
    const totalRevenue    = perListing.reduce((s, l) => s + l.revenue, 0);

    return res.json({
      kpis: { totalViews, totalRequests, acceptanceRate, totalRevenue },
      perListing,
      monthlyRevenue: months,
    });
  } catch (err) {
    console.error('❌ Get Analytics Error:', err);
    return res.status(500).json({ message: 'Server error fetching analytics.' });
  }
};
