const Review = require('../models/Review');
const Booking = require('../models/Booking');

/**
 * Controller (C) — Review
 * Handles creation and retrieval of property and tenant reviews.
 */

/**
 * POST /api/reviews
 * Creates a review. Validates the booking is 'approved' and the author
 * is authorised (tenant for property reviews, landlord for tenant reviews).
 * Prevents duplicate reviews via unique index on (authorId, bookingId, reviewType).
 */
exports.createReview = async (req, res) => {
  try {
    const { bookingId, reviewType, targetId, listingId, rating, comment } = req.body;
    const authorId   = req.user.id;
    const authorName = req.user.name || `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || 'Anonymous';

    if (!bookingId || !reviewType || !targetId || !rating) {
      return res.status(400).json({ message: 'bookingId, reviewType, targetId, and rating are required.' });
    }
    if (!['property', 'tenant'].includes(reviewType)) {
      return res.status(400).json({ message: 'reviewType must be "property" or "tenant".' });
    }

    // Validate the booking exists and is approved
    const booking = await Booking.findById(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found.' });
    if (booking.status !== 'approved') {
      return res.status(403).json({ message: 'You can only review after your booking is approved.' });
    }

    // Authorisation: tenant reviews property, landlord reviews tenant
    if (reviewType === 'property' && booking.tenantId !== authorId) {
      return res.status(403).json({ message: 'Only the booking tenant can review this property.' });
    }
    if (reviewType === 'tenant' && booking.landlordId !== authorId) {
      return res.status(403).json({ message: 'Only the booking landlord can review this tenant.' });
    }

    const review = await Review.create({
      reviewType,
      authorId,
      authorName,
      targetId,
      listingId: listingId || null,
      bookingId,
      rating: Math.min(5, Math.max(1, Number(rating))),
      comment: comment || '',
    });

    return res.status(201).json({ success: true, review });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ message: 'You have already submitted a review for this booking.' });
    }
    console.error('❌ Create Review Error:', err);
    return res.status(500).json({ message: 'Server error creating review.' });
  }
};

/**
 * GET /api/reviews/listing/:listingId
 * Returns all property reviews for a given listing, plus the average rating.
 */
exports.getReviewsByListing = async (req, res) => {
  try {
    const { listingId } = req.params;
    const reviews = await Review.find({ reviewType: 'property', targetId: listingId }).sort({ createdAt: -1 });

    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    return res.json({ reviews, averageRating: avg ? Number(avg) : null, count: reviews.length });
  } catch (err) {
    console.error('❌ Get Reviews By Listing Error:', err);
    return res.status(500).json({ message: 'Server error fetching reviews.' });
  }
};

/**
 * GET /api/reviews/tenant/:tenantId
 * Returns all tenant reviews for a given tenantId, plus the average rating.
 */
exports.getReviewsByTenant = async (req, res) => {
  try {
    const { tenantId } = req.params;
    const reviews = await Review.find({ reviewType: 'tenant', targetId: tenantId }).sort({ createdAt: -1 });

    const avg = reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : null;

    return res.json({ reviews, averageRating: avg ? Number(avg) : null, count: reviews.length });
  } catch (err) {
    console.error('❌ Get Reviews By Tenant Error:', err);
    return res.status(500).json({ message: 'Server error fetching tenant reviews.' });
  }
};

/**
 * GET /api/reviews/mine
 * Returns all reviews authored by the currently logged-in user.
 */
exports.getMyReviews = async (req, res) => {
  try {
    const reviews = await Review.find({ authorId: req.user.id }).sort({ createdAt: -1 });
    return res.json(reviews);
  } catch (err) {
    console.error('❌ Get My Reviews Error:', err);
    return res.status(500).json({ message: 'Server error fetching your reviews.' });
  }
};
