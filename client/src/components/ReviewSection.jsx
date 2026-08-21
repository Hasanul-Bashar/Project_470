import { useState, useEffect } from 'react';
import { getReviewsByListing, getReviewsByTenant, createReview } from '../services/reviewsApi';

/**
 * View (V) — ReviewSection
 * Dual-purpose review component:
 *   mode="property" — tenants review a listing, displayed on UserDashboard
 *   mode="tenant"   — landlords review a tenant, displayed on LandlordListings
 *
 * Props:
 *   mode          — 'property' | 'tenant'
 *   targetId      — listingId (mode=property) | tenantId (mode=tenant)
 *   listingId     — always the listingId (for bookingId lookup)
 *   eligibleBooking — the approved Booking object that qualifies the user to review, or null
 *   currentUser   — the user object from AuthContext
 */

function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="star-picker" role="group" aria-label="Select star rating">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star-pick-btn ${n <= (hovered || value) ? 'active' : ''}`}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          onClick={() => onChange(n)}
          aria-label={`${n} star${n !== 1 ? 's' : ''}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}

function StarDisplay({ rating, count }) {
  if (rating === null || rating === undefined) return <span className="no-reviews-yet">No reviews yet</span>;
  return (
    <span className="star-display" title={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n} className={n <= Math.round(rating) ? 'star filled' : 'star empty'}>★</span>
      ))}
      <span className="star-avg">{Number(rating).toFixed(1)}</span>
      {count != null && <span className="star-count">({count})</span>}
    </span>
  );
}

export default function ReviewSection({ mode, targetId, listingId, eligibleBooking, currentUser }) {
  const [reviews, setReviews]             = useState([]);
  const [avgRating, setAvgRating]         = useState(null);
  const [count, setCount]                 = useState(0);
  const [loading, setLoading]             = useState(true);
  const [showForm, setShowForm]           = useState(false);
  const [formRating, setFormRating]       = useState(5);
  const [formComment, setFormComment]     = useState('');
  const [submitting, setSubmitting]       = useState(false);
  const [submitError, setSubmitError]     = useState('');
  const [submitSuccess, setSubmitSuccess] = useState('');

  const fetchReviews = async () => {
    setLoading(true);
    try {
      let res;
      if (mode === 'property') {
        res = await getReviewsByListing(targetId);
      } else {
        res = await getReviewsByTenant(targetId);
      }
      setReviews(res.data.reviews || []);
      setAvgRating(res.data.averageRating);
      setCount(res.data.count || 0);
    } catch (err) {
      console.error('ReviewSection fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (targetId) fetchReviews();
  }, [targetId, mode]);

  // Has the current user already reviewed?
  const alreadyReviewed = reviews.some((r) => r.authorId === (currentUser?.id || ''));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    if (!eligibleBooking) {
      setSubmitError('You need an approved booking to leave a review.');
      return;
    }
    if (!formRating) {
      setSubmitError('Please select a star rating.');
      return;
    }
    setSubmitting(true);
    try {
      await createReview({
        reviewType:  mode,
        targetId,
        listingId:   listingId || null,
        bookingId:   eligibleBooking._id,
        rating:      formRating,
        comment:     formComment.trim(),
      });
      setSubmitSuccess('Review submitted! Thank you ✨');
      setShowForm(false);
      setFormComment('');
      setFormRating(5);
      await fetchReviews();
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const title = mode === 'property' ? '⭐ Tenant Reviews' : '⭐ Landlord Reviews of Tenant';

  return (
    <div className="review-section">
      <div className="review-section-header">
        <h4 className="review-section-title">{title}</h4>
        <StarDisplay rating={avgRating} count={count} />
      </div>

      {/* Submit button for eligible users */}
      {eligibleBooking && !alreadyReviewed && !showForm && !submitSuccess && (
        <button
          className="btn-write-review"
          onClick={() => setShowForm(true)}
          id={`btn-write-review-${targetId}`}
        >
          ✍️ Write a Review
        </button>
      )}

      {/* Review form */}
      {showForm && (
        <form className="review-form" onSubmit={handleSubmit}>
          <div className="review-form-inner">
            <div className="review-form-row">
              <label className="review-form-label">Your rating</label>
              <StarPicker value={formRating} onChange={setFormRating} />
            </div>
            <div className="review-form-row">
              <label className="review-form-label">Comment (optional)</label>
              <textarea
                className="review-form-textarea"
                value={formComment}
                onChange={(e) => setFormComment(e.target.value)}
                placeholder={mode === 'property'
                  ? 'Share your experience with this property...'
                  : 'How was your experience with this tenant?'}
                rows={3}
                maxLength={500}
              />
            </div>
            {submitError && <p className="review-form-error">{submitError}</p>}
            <div className="review-form-actions">
              <button type="submit" className="btn-submit-review" disabled={submitting}>
                {submitting ? 'Submitting…' : 'Submit Review'}
              </button>
              <button type="button" className="btn-cancel-review" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {submitSuccess && <p className="review-success-msg">{submitSuccess}</p>}

      {/* Review list */}
      {loading ? (
        <p className="review-loading">Loading reviews…</p>
      ) : reviews.length === 0 ? (
        <p className="review-empty">No reviews yet. {eligibleBooking && !alreadyReviewed ? 'Be the first!' : ''}</p>
      ) : (
        <ul className="review-list">
          {reviews.map((r) => (
            <li key={r._id} className="review-card">
              <div className="review-card-header">
                <span className="review-author">{r.authorName}</span>
                <span className="star-display small">
                  {[1,2,3,4,5].map((n) => (
                    <span key={n} className={n <= r.rating ? 'star filled' : 'star empty'}>★</span>
                  ))}
                </span>
                <span className="review-date">{new Date(r.createdAt).toLocaleDateString()}</span>
              </div>
              {r.comment && <p className="review-comment">{r.comment}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
