import { useState, useEffect } from 'react';
import { getListings } from '../services/listingsApi';
import { createBooking, getBookings } from '../services/bookingsApi';
import { recordView } from '../services/analyticsApi';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import AvailabilityCalendar from '../components/admin/AvailabilityCalendar';
import CompareBar from '../components/CompareBar';
import CompareModal from '../components/CompareModal';
import ReviewSection from '../components/ReviewSection';

export default function UserDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'wishes'

  // Dismissed notification IDs
  const [readBookingIds, setReadBookingIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`rentease_user_read_bookings_${user?.id || 'demo'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showHistory, setShowHistory] = useState(false);

  // Wishlist stored in state & localStorage
  const [wishes, setWishes] = useState(() => {
    try {
      const saved = localStorage.getItem(`rentease_wishes_${user?.id || 'demo'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Modal States
  const [activeCalendarListing, setActiveCalendarListing] = useState(null);
  const [bookingListing, setBookingListing] = useState(null);
  const [bookingDateInput, setBookingDateInput] = useState('');
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [toast, setToast] = useState(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // ── Feature 1: Property Comparison ──────────────────────────
  const [compareList, setCompareList] = useState([]);   // max 3 listings
  const [showCompareModal, setShowCompareModal] = useState(false);

  // ── Feature 3: Expanded listing view (for reviews) ──────────
  const [expandedListingId, setExpandedListingId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchListings();
    fetchMyBookings();
  }, []);

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getListings();
      setListings(res.data);
    } catch (err) {
      console.error('Error fetching listings:', err);
      setError('Failed to load rental listings.');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyBookings = async () => {
    try {
      const res = await getBookings();
      setMyBookings(res.data);
    } catch (err) {
      console.error('Error fetching my bookings:', err);
    }
  };

  // ── Compare helpers ──────────────────────────────────────────
  const toggleCompare = (listing) => {
    setCompareList((prev) => {
      const exists = prev.some((l) => l._id === listing._id);
      if (exists) return prev.filter((l) => l._id !== listing._id);
      if (prev.length >= 3) {
        showToast('You can compare up to 3 properties at once.', 'info');
        return prev;
      }
      return [...prev, listing];
    });
  };

  const removeFromCompare = (id) => setCompareList((prev) => prev.filter((l) => l._id !== id));
  const clearCompare     = ()   => setCompareList([]);

  const markAllBookingsAsRead = () => {
    const allIds = myBookings.map((b) => b._id);
    setReadBookingIds(allIds);
    localStorage.setItem(`rentease_user_read_bookings_${user?.id || 'demo'}`, JSON.stringify(allIds));
    showToast('All notifications marked as read!', 'info');
  };

  // Toggle Wishlist item
  const toggleWish = (listing) => {
    let updatedWishes;
    const exists = wishes.some((w) => w._id === listing._id);

    if (exists) {
      updatedWishes = wishes.filter((w) => w._id !== listing._id);
      showToast(`Removed "${listing.title}" from your wishes`, 'info');
    } else {
      updatedWishes = [...wishes, listing];
      showToast(`Added "${listing.title}" to your wishes! ❤️`, 'success');
    }

    setWishes(updatedWishes);
    localStorage.setItem(`rentease_wishes_${user?.id || 'demo'}`, JSON.stringify(updatedWishes));
  };

  // Submit booking request
  const handleBookingSubmit = async (e) => {
    e.preventDefault();
    if (!bookingDateInput.trim()) {
      showToast('Please specify your requested rental date(s).', 'error');
      return;
    }

    try {
      setSubmittingBooking(true);
      const datesArray = bookingDateInput
        .split(',')
        .map((d) => d.trim())
        .filter((d) => d !== '');

      await createBooking({
        listingId: bookingListing._id,
        dates: datesArray,
        notes: inquiryMsg,
      });

      showToast(`Booking request submitted for "${bookingListing.title}"! Waiting for Landlord approval.`);
      setBookingListing(null);
      setBookingDateInput('');
      setInquiryMsg('');
      fetchMyBookings();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to submit booking request', 'error');
    } finally {
      setSubmittingBooking(false);
    }
  };

  // Filter listings
  const filteredListings = (activeTab === 'wishes' ? wishes : listings).filter((item) => {
    const term = searchTerm.toLowerCase();
    return (
      item.title.toLowerCase().includes(term) ||
      item.location.toLowerCase().includes(term) ||
      item.description.toLowerCase().includes(term)
    );
  });

  const activeUnreadBookings = myBookings.filter((b) => !readBookingIds.includes(b._id));

  // ── Role Gate ─────────────────────────────────────────────────
  if (user?.role !== 'user') {
    return (
      <div className="container">
        <div className="empty-state" style={{ marginTop: '5rem' }}>
          <div className="empty-state-icon">🔒</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '.5rem' }}>
            Tenant Access Required
          </h2>
          <div className="empty-state-text">
            Use the <strong style={{ color: 'var(--blue)' }}>👤 User / Tenant</strong> role
            toggle in the top-right header to switch roles and browse rental listings.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Page Header */}
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Tenant Rental Dashboard</h1>
          <p className="page-subtitle">
            Browse verified rental properties, select dates to request rentals, and track live approval status.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="btn btn-secondary"
            onClick={() => window.location.href = '/rent-tracking'}
            id="btn-user-rent-tracking"
            title="View your monthly rent payments and status"
          >
            💳 My Rent Payments
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => window.location.href = '/maintenance'}
            id="btn-user-maintenance"
            title="Report & track maintenance issues"
          >
            🛠️ Maintenance
          </button>
        </div>
      </div>

      {/* ── MY BOOKING REQUESTS STATUS TRACKER ─────────────────────── */}
      <div
        className="panel"
        style={{
          marginBottom: '2.5rem',
          border: '1px solid rgba(139, 92, 246, 0.3)',
          borderTop: '3px solid var(--purple)',
          background: 'rgba(13, 20, 37, 0.85)',
          backdropFilter: 'blur(16px)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
        }}
      >
        <div
          style={{
            padding: '1.1rem 1.5rem',
            borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '0.75rem',
          }}
        >
          <div>
            <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📋 My Booking Requests & Approval Tracker
              <span
                style={{
                  fontSize: '0.75rem',
                  background: 'rgba(139, 92, 246, 0.15)',
                  color: 'var(--purple)',
                  border: '1px solid rgba(139, 92, 246, 0.3)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                }}
              >
                {activeUnreadBookings.length} Active
              </span>
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Track approval updates from Landlord & Admin for your requested rental dates.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {activeUnreadBookings.length > 0 && (
              <button
                className="btn"
                style={{
                  fontSize: '0.78rem',
                  background: 'rgba(255, 255, 255, 0.06)',
                  borderColor: 'rgba(255, 255, 255, 0.15)',
                  color: '#f8fafc',
                }}
                onClick={markAllBookingsAsRead}
                title="Clear notification tracker panel"
              >
                ✔️ Mark All as Read
              </button>
            )}

            {readBookingIds.length > 0 && (
              <button
                className="btn"
                style={{
                  fontSize: '0.78rem',
                  background: 'transparent',
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  color: '#94a3b8',
                }}
                onClick={() => setShowHistory(!showHistory)}
              >
                {showHistory ? '🙈 Hide Dismissed' : `👁️ Show Dismissed (${readBookingIds.length})`}
              </button>
            )}

            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc' }}
              onClick={fetchMyBookings}
            >
              🔄 Refresh Status
            </button>
          </div>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {activeUnreadBookings.length === 0 && !showHistory ? (
            <div style={{ padding: '1rem 0', textAlign: 'center' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
                ✨ All booking notifications are clear or marked as read! Use "Book / Wish to Rent" on any listing to submit a new rental request.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {activeUnreadBookings.map((b) => (
                <div
                  key={b._id}
                  style={{
                    padding: '1rem 1.15rem',
                    borderRadius: '12px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    background: 'rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <h4 style={{ margin: '0 0 0.35rem 0', fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                      {b.listingTitle}
                    </h4>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
                      📍 {b.listingLocation} | 📅 Requested Dates: <strong style={{ color: '#38bdf8' }}>{b.dates?.join(', ')}</strong>
                    </p>
                    {b.notes && (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                        Note: "{b.notes}"
                      </p>
                    )}
                  </div>

                  <div>
                    {b.status === 'pending_landlord' && (
                      <span
                        style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#fbbf24',
                          border: '1px solid rgba(245, 158, 11, 0.3)',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                        }}
                      >
                        🟡 Pending Landlord Review
                      </span>
                    )}

                    {b.status === 'pending_admin' && (
                      <span
                        style={{
                          background: 'rgba(59, 130, 246, 0.15)',
                          color: '#60a5fa',
                          border: '1px solid rgba(59, 130, 246, 0.3)',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                        }}
                      >
                        🔵 Landlord Approved — Admin Approval Pending ⏳
                      </span>
                    )}

                    {b.status === 'approved' && (
                      <span
                        style={{
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                        }}
                      >
                        🟢 🎉 Approved by Admin! Dates Reserved
                      </span>
                    )}

                    {b.status === 'rejected' && (
                      <span
                        style={{
                          background: 'rgba(239, 68, 68, 0.15)',
                          color: '#f87171',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          padding: '0.4rem 0.8rem',
                          borderRadius: '20px',
                          fontSize: '0.82rem',
                          fontWeight: '700',
                        }}
                      >
                        🔴 Request Rejected
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* SHOW DISMISSED HISTORY IF TOGGLED */}
          {showHistory && readBookingIds.length > 0 && (
            <div style={{ marginTop: '1.25rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8' }}>
                Dismissed Requests ({readBookingIds.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {myBookings.filter((b) => readBookingIds.includes(b._id)).map((hb) => (
                  <div
                    key={hb._id}
                    style={{
                      padding: '0.6rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '0.8rem',
                      color: '#94a3b8',
                      display: 'flex',
                      justifyContent: 'space-between',
                    }}
                  >
                    <span>{hb.listingTitle} ({hb.dates?.join(', ')})</span>
                    <span style={{ fontWeight: 600 }}>{hb.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div
        className="card"
        style={{
          marginBottom: '1.5rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem',
          padding: '1rem 1.25rem',
        }}
      >
        {/* Tabs */}
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('all')}
          >
            🏠 Available Properties ({listings.length})
          </button>
          <button
            className={`btn ${activeTab === 'wishes' ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setActiveTab('wishes')}
          >
            ❤️ My Wishes to Rent ({wishes.length})
          </button>
        </div>

        {/* Search Input */}
        <div style={{ minWidth: '280px', flexGrow: 1, maxWidth: '400px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="🔍 Search location, title, or keyword..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p className="empty-state-text">Loading rental listings...</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-state-text">{error}</div>
        </div>
      ) : filteredListings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {activeTab === 'wishes' ? '💔' : '🔍'}
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {activeTab === 'wishes' ? 'No Wishes Saved Yet' : 'No Rentals Found'}
          </h2>
          <p className="empty-state-text">
            {activeTab === 'wishes'
              ? 'Click the "❤️ Wish to Rent" button on any rental property to save it to your dashboard list!'
              : 'Try searching for a different location or neighborhood.'}
          </p>
        </div>
      ) : (
        <div
          className="dashboard-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {filteredListings.map((listing) => {
            const isWished = wishes.some((w) => w._id === listing._id);
            const bookedCount = listing.bookedDates ? listing.bookedDates.length : 0;

            return (
              <div
                key={listing._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  position: 'relative',
                  transition: 'transform 0.2s',
                }}
              >
                {/* Header */}
                <div
                  className="card-header"
                  style={{
                    borderBottom: '1px solid var(--border)',
                    paddingBottom: '0.75rem',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    gap: '0.5rem',
                  }}
                >
                  <div>
                    <h3
                      className="card-title"
                      style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.25rem' }}
                    >
                      {listing.title}
                    </h3>
                    <p style={{ fontSize: '0.82rem', color: 'var(--t3)' }}>📍 {listing.location}</p>
                  </div>

                  {/* Wish Toggle Button */}
                  <button
                    onClick={() => toggleWish(listing)}
                    style={{
                      background: isWished ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isWished ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
                      borderRadius: '50%',
                      width: '36px',
                      height: '36px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.1rem',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    title={isWished ? 'Remove from wishes' : 'Add to wishes to rent'}
                  >
                    {isWished ? '❤️' : '🤍'}
                  </button>
                </div>

                {/* Body */}
                <div className="card-body" style={{ flexGrow: 1, padding: '1rem 0' }}>
                  <p
                    style={{
                      fontSize: '0.875rem',
                      color: 'var(--t2)',
                      marginBottom: '1rem',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden',
                      lineHeight: '1.5',
                    }}
                  >
                    {listing.description}
                  </p>

                  {/* Amenities Tags */}
                  {listing.amenities && listing.amenities.length > 0 && (
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '0.4rem',
                        marginBottom: '1rem',
                      }}
                    >
                      {listing.amenities.map((amenity, idx) => (
                        <span
                          key={idx}
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: '600',
                            background: 'rgba(139, 92, 246, 0.12)',
                            color: '#c084fc',
                            border: '1px solid rgba(139, 92, 246, 0.25)',
                            padding: '0.2rem 0.55rem',
                            borderRadius: '12px',
                          }}
                        >
                          ✨ {amenity}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Rent Price & Status */}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--purple)' }}>
                      BDT {listing.price?.toLocaleString()}/mo
                    </span>
                    <span
                      className={`badge badge-${
                        listing.status === 'approved'
                          ? 'success'
                          : listing.status === 'pending'
                          ? 'warning'
                          : 'danger'
                      }`}
                    >
                      {listing.status?.toUpperCase()}
                    </span>
                  </div>

                  {/* Booked dates indicator */}
                  <div
                    style={{
                      fontSize: '0.8rem',
                      color: 'var(--t3)',
                      borderTop: '1px dashed var(--border)',
                      paddingTop: '0.65rem',
                    }}
                  >
                    📅 {bookedCount > 0 ? `${bookedCount} Reserved / Blocked dates` : 'Fully Available'}
                  </div>
                </div>

                {/* Footer Action Buttons */}
                <div
                  className="card-footer"
                  style={{
                    marginTop: 'auto',
                    paddingTop: '0.85rem',
                    borderTop: '1px solid var(--border)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '0.5rem',
                  }}
                >
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                    onClick={() => {
                      setActiveCalendarListing(listing);
                      // Record view for landlord analytics
                      recordView(listing._id).catch(() => {});
                    }}
                  >
                    🗓 View Calendar
                  </button>

                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                    onClick={() => setBookingListing(listing)}
                  >
                    📩 Book / Wish to Rent
                  </button>

                  {/* Compare toggle */}
                  <button
                    className={`btn compare-toggle-btn ${compareList.some((l) => l._id === listing._id) ? 'compare-active' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '0.5rem', gridColumn: '1 / -1' }}
                    onClick={() => toggleCompare(listing)}
                    title={compareList.some((l) => l._id === listing._id) ? 'Remove from comparison' : 'Add to comparison (max 3)'}
                  >
                    {compareList.some((l) => l._id === listing._id) ? '✓ In Comparison' : '⚖️ Add to Compare'}
                  </button>

                  {/* Reviews expander */}
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.5rem', gridColumn: '1 / -1' }}
                    onClick={() => setExpandedListingId(expandedListingId === listing._id ? null : listing._id)}
                  >
                    {expandedListingId === listing._id ? '▲ Hide Reviews' : '⭐ View Reviews'}
                  </button>
                </div>

                {/* ── Review Section (expandable) ─────────────────── */}
                {expandedListingId === listing._id && (() => {
                  // Find an approved booking for this listing by the current user
                  const eligibleBooking = myBookings.find(
                    (b) => b.listingId === listing._id && b.status === 'approved'
                  ) || null;
                  return (
                    <div style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                      <ReviewSection
                        mode="property"
                        targetId={listing._id}
                        listingId={listing._id}
                        eligibleBooking={eligibleBooking}
                        currentUser={user}
                      />
                    </div>
                  );
                })()}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Compare Bar ─────────────────────────────────────────── */}
      <CompareBar
        selected={compareList}
        onRemove={removeFromCompare}
        onCompare={() => setShowCompareModal(true)}
        onClear={clearCompare}
      />

      {/* ── Compare Modal ───────────────────────────────────────── */}
      {showCompareModal && compareList.length >= 2 && (
        <CompareModal
          listings={compareList}
          onClose={() => setShowCompareModal(false)}
        />
      )}

      {/* Calendar Preview Modal */}
      {activeCalendarListing && (
        <Modal
          title={`Property Availability: ${activeCalendarListing.title}`}
          onClose={() => setActiveCalendarListing(null)}
        >
          <div style={{ padding: '1rem' }}>
            <p style={{ fontSize: '0.85rem', color: 'var(--t2)', marginBottom: '1rem' }}>
              Dates highlighted in red are already booked by other tenants. Green dates are open for rental!
            </p>
            <AvailabilityCalendar
              initialBookedDates={activeCalendarListing.bookedDates}
              onSave={() => setActiveCalendarListing(null)}
              onCancel={() => setActiveCalendarListing(null)}
              readOnly={true}
            />
          </div>
        </Modal>
      )}

      {/* Rental Booking Request Modal */}
      {bookingListing && (
        <Modal
          title={`Book Property: ${bookingListing.title}`}
          onClose={() => setBookingListing(null)}
        >
          <form onSubmit={handleBookingSubmit} style={{ padding: '1rem' }}>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '8px',
                padding: '0.85rem',
                marginBottom: '1rem',
              }}
            >
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#f8fafc' }}>{bookingListing.title}</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                📍 {bookingListing.location} | BDT {bookingListing.price?.toLocaleString()}/month
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Requested Booking Date(s) (YYYY-MM-DD) *</label>
              <input
                type="text"
                className="form-input"
                required
                placeholder="e.g. 2026-08-01, 2026-08-02"
                value={bookingDateInput}
                onChange={(e) => setBookingDateInput(e.target.value)}
              />
              <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem', display: 'block' }}>
                Enter single date or comma-separated dates (e.g. 2026-08-15, 2026-08-16).
              </span>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Message / Notes to Landlord (Optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Specify preferred move-in time or any questions for the landlord..."
                value={inquiryMsg}
                onChange={(e) => setInquiryMsg(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setBookingListing(null)}
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submittingBooking}>
                {submittingBooking ? 'Submitting Request...' : '📩 Submit Booking Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Toast Alert */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'error' ? '❌' : '✅'} {toast.message}
        </div>
      )}
    </div>
  );
}
