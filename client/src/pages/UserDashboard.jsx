import { useState, useEffect } from 'react';
import { getListings, searchListings } from '../services/listingsApi';
import { getBookings, createBooking } from '../services/bookingsApi';
import { getSavedListings, toggleSavedListing } from '../services/userApi';
import { recordView } from '../services/analyticsApi';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import AvailabilityCalendar from '../components/admin/AvailabilityCalendar';
import CompareBar from '../components/CompareBar';
import CompareModal from '../components/CompareModal';
import ReviewSection from '../components/ReviewSection';
import ChatModal from '../components/chat/ChatModal';
import SpatialSearchFilter from '../components/SpatialSearchFilter';
import NeighborhoodInfo from '../components/NeighborhoodInfo';
import PolygonMap from '../components/PolygonMap';
import { getImageUrl, PLACEHOLDER_IMAGE } from '../utils/imageUtils';
import AiAssistantWidget from '../components/assistant/AiAssistantWidget';

export default function UserDashboard() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [myBookings, setMyBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  // Saved / Shortlisted listings from Database
  const [savedIds, setSavedIds] = useState([]);
  const [savedListings, setSavedListings] = useState([]);

  // Modal States
  const [activeCalendarListing, setActiveCalendarListing] = useState(null);
  const [detailListing, setDetailListing] = useState(null);
  const [bookingListing, setBookingListing] = useState(null);
  const [bookingDateInput, setBookingDateInput] = useState('');
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [toast, setToast] = useState(null);
  const [submittingBooking, setSubmittingBooking] = useState(false);

  // Feature 1: Property Comparison
  const [compareList, setCompareList] = useState([]); // max 3 listings
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Feature 2: Tenant-Landlord Chat
  const [chatListing, setChatListing] = useState(null);
  const [isAiAssistantOpen, setIsAiAssistantOpen] = useState(false);

  // Feature 3: Expanded listing view (for reviews)
  const [expandedListingId, setExpandedListingId] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchListings();
    fetchMyBookings();
    fetchSavedProperties();
  }, []);

  const fetchListings = async (params = {}) => {
    try {
      setLoading(true);
      setError('');
      const res = await searchListings(params);
      setListings(res.data?.listings || res.data || []);
    } catch (err) {
      console.error('Error fetching listings:', err);
      // Fallback to standard listings API
      try {
        const fallbackRes = await getListings();
        setListings(fallbackRes.data);
      } catch (fErr) {
        setError('Failed to load rental listings.');
      }
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

  const fetchSavedProperties = async () => {
    try {
      const res = await getSavedListings();
      const saved = res.data?.savedListings || [];
      setSavedListings(saved);
      setSavedIds(saved.map((item) => item._id || item));
    } catch (err) {
      console.warn('Saved listings backend fetch warning:', err.message);
    }
  };

  // Compare helpers
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
  const clearCompare = () => setCompareList([]);

  const markAllBookingsAsRead = () => {
    const allIds = myBookings.map((b) => b._id);
    setReadBookingIds(allIds);
    localStorage.setItem(`rentease_user_read_bookings_${user?.id || 'demo'}`, JSON.stringify(allIds));
    showToast('All notifications marked as read!', 'info');
  };

  // Toggle Saved / Bookmarked Property
  const handleToggleSave = async (listing) => {
    try {
      const isCurrentlySaved = savedIds.includes(listing._id);
      await toggleSavedListing(listing._id);

      if (isCurrentlySaved) {
        setSavedIds((prev) => prev.filter((id) => id !== listing._id));
        setSavedListings((prev) => prev.filter((item) => item._id !== listing._id));
        showToast(`Removed "${listing.title}" from saved properties`, 'info');
      } else {
        setSavedIds((prev) => [...prev, listing._id]);
        setSavedListings((prev) => [...prev, listing]);
        showToast(`Saved "${listing.title}" to your shortlisted list! ❤️`, 'success');
      }
    } catch (err) {
      showToast('Failed to update saved properties', 'error');
    }
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

  const activeUnreadBookings = myBookings.filter((b) => !readBookingIds.includes(b._id));
  const displayedListings = activeTab === 'wishes' ? savedListings : listings;

  // Role Gate
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
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Tenant Rental Dashboard & Spatial Search</h1>
          <p className="page-subtitle">
            Browse verified rental properties, spatial radius search (Haversine), polygon geofencing, saved properties, and neighborhood POIs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            className="btn btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', padding: '0.55rem 1rem' }}
            onClick={() => setIsAiAssistantOpen((prev) => !prev)}
            id="btn-user-ai-assistant"
          >
            <span>🤖 AI Assistant</span>
          </button>
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
          marginBottom: '2rem',
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
                ✨ All booking notifications are clear! Use "Book / Request Rental" on any property listing to submit a new request.
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
        </div>
      </div>

      {/* ── ADVANCED SPATIAL SEARCH & GEOSPATIAL RADIUS FILTER ───────── */}
      <SpatialSearchFilter
        onFilterChange={(params) => fetchListings(params)}
        onReset={() => fetchListings()}
      />

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.5rem',
          marginBottom: '1.5rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          paddingBottom: '0.75rem',
        }}
      >
        <button
          className={`btn ${activeTab === 'all' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('all')}
        >
          🏠 All Available Properties ({listings.length})
        </button>
        <button
          className={`btn ${activeTab === 'wishes' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('wishes')}
        >
          ❤️ Saved & Shortlisted ({savedListings.length})
        </button>
      </div>

      {/* Main Properties Grid */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p className="empty-state-text">Searching properties with spatial index & Haversine formula...</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-state-text">{error}</div>
        </div>
      ) : displayedListings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">
            {activeTab === 'wishes' ? '💔' : '🔍'}
          </div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>
            {activeTab === 'wishes' ? 'No Saved Properties' : 'No Matching Properties Found'}
          </h2>
          <p className="empty-state-text">
            {activeTab === 'wishes'
              ? 'Click the "❤️ Save" button on any rental property to add it to your saved shortlisted list!'
              : 'Try broadening your search radius or price filters.'}
          </p>
        </div>
      ) : (
        <div
          className="dashboard-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '1.5rem',
          }}
        >
          {displayedListings.map((listing) => {
            const isSaved = savedIds.includes(listing._id);
            const bookedCount = listing.bookedDates ? listing.bookedDates.length : 0;
            const matchScore = listing.matchScore ?? 95;
            const distKm = listing.distanceKm;

            return (
              <div
                key={listing._id}
                className="card"
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  height: '100%',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Photo Banner */}
                {listing.photos && listing.photos.length > 0 && (
                  <div style={{ height: '170px', width: '100%', overflow: 'hidden', position: 'relative' }}>
                    <img
                      src={getImageUrl(listing.photos[0])}
                      alt={listing.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.src = PLACEHOLDER_IMAGE;
                      }}
                    />
                    {distKm != null && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          left: '8px',
                          background: 'rgba(15, 23, 42, 0.8)',
                          backdropFilter: 'blur(8px)',
                          color: '#38bdf8',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          padding: '0.25rem 0.55rem',
                          borderRadius: '12px',
                          border: '1px solid rgba(56, 189, 248, 0.3)',
                        }}
                      >
                        🚀 {distKm} km away
                      </span>
                    )}

                    {matchScore && (
                      <span
                        style={{
                          position: 'absolute',
                          top: '8px',
                          right: '8px',
                          background: 'rgba(139, 92, 246, 0.85)',
                          backdropFilter: 'blur(8px)',
                          color: '#ffffff',
                          fontSize: '0.74rem',
                          fontWeight: '700',
                          padding: '0.25rem 0.6rem',
                          borderRadius: '12px',
                        }}
                      >
                        ⭐ {matchScore}% Match
                      </span>
                    )}
                  </div>
                )}

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
                    paddingTop: listing.photos?.length ? '0.85rem' : '1.1rem',
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

                  {/* Bookmark Save Button */}
                  <button
                    onClick={() => handleToggleSave(listing)}
                    style={{
                      background: isSaved ? 'rgba(239, 68, 68, 0.15)' : 'rgba(255, 255, 255, 0.05)',
                      border: `1px solid ${isSaved ? 'rgba(239, 68, 68, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
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
                    title={isSaved ? 'Remove from saved' : 'Save / Bookmark listing'}
                  >
                    {isSaved ? '❤️' : '🤍'}
                  </button>
                </div>

                {/* Body */}
                <div className="card-body" style={{ flexGrow: 1, padding: '1rem 0' }}>
                  <div
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
                    dangerouslySetInnerHTML={{ __html: listing.description }}
                  />

                  {/* Attributes Tags */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '1rem' }}>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', padding: '0.2rem 0.55rem', borderRadius: '12px' }}>
                      🏠 {listing.propertyType || 'Apartment'}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.2rem 0.55rem', borderRadius: '12px' }}>
                      🛋️ {listing.furnishedStatus || 'Furnished'}
                    </span>
                    <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.2rem 0.55rem', borderRadius: '12px' }}>
                      📐 {listing.size || 1000} sqft
                    </span>
                    {listing.polygon && listing.polygon.length >= 3 && (
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', padding: '0.2rem 0.55rem', borderRadius: '12px' }}>
                        📐 Polygon Area Tagged
                      </span>
                    )}
                  </div>

                  {/* Rent Price & Status */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--purple)' }}>
                      BDT {listing.price?.toLocaleString()}/mo
                    </span>
                    <span className={`badge badge-${listing.status === 'approved' ? 'success' : listing.status === 'pending' ? 'warning' : 'danger'}`}>
                      {listing.status?.toUpperCase()}
                    </span>
                  </div>

                  {/* Booked dates indicator */}
                  <div style={{ fontSize: '0.8rem', color: 'var(--t3)', borderTop: '1px dashed var(--border)', paddingTop: '0.65rem' }}>
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
                    onClick={() => setDetailListing(listing)}
                  >
                    🏢 Details & Neighborhood
                  </button>

                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.5rem' }}
                    onClick={() => setBookingListing(listing)}
                  >
                    📩 Book / Request Rental
                  </button>

                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.5rem' }}
                    onClick={() => {
                      setActiveCalendarListing(listing);
                      recordView(listing._id).catch(() => {});
                    }}
                  >
                    🗓 View Calendar
                  </button>

                  {/* Compare toggle */}
                  <button
                    className={`btn compare-toggle-btn ${compareList.some((l) => l._id === listing._id) ? 'compare-active' : ''}`}
                    style={{ fontSize: '0.78rem', padding: '0.5rem' }}
                    onClick={() => toggleCompare(listing)}
                    title="Add to comparison (max 3)"
                  >
                    {compareList.some((l) => l._id === listing._id) ? '✓ In Compare' : '⚖️ Compare'}
                  </button>

                  {/* Chat with Landlord */}
                  <button
                    className="btn btn-secondary"
                    style={{ fontSize: '0.78rem', padding: '0.5rem', gridColumn: '1 / -1' }}
                    onClick={() => setChatListing(listing)}
                  >
                    💬 Chat with Landlord
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

                {/* Review Section */}
                {expandedListingId === listing._id && (() => {
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

      {/* ── Compare Bar & Modal ───────────────────────────────────────── */}
      <CompareBar
        selected={compareList}
        onRemove={removeFromCompare}
        onCompare={() => setShowCompareModal(true)}
        onClear={clearCompare}
      />

      {showCompareModal && compareList.length >= 2 && (
        <CompareModal
          listings={compareList}
          onClose={() => setShowCompareModal(false)}
        />
      )}

      {/* ── Chat Modal ──────────────────────────────────────────── */}
      {chatListing && (
        <ChatModal
          listing={chatListing}
          onClose={() => setChatListing(null)}
        />
      )}

      {/* Property Details & Neighborhood Info Modal */}
      {detailListing && (
        <Modal
          title={`Property & Neighborhood: ${detailListing.title}`}
          onClose={() => setDetailListing(null)}
        >
          <div style={{ padding: '1rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc' }}>{detailListing.title}</h3>
            <p style={{ margin: 0, color: '#94a3b8', fontSize: '0.88rem' }}>
              📍 {detailListing.location} | BDT {detailListing.price?.toLocaleString()}/month
            </p>

            {/* Polygon Map & Location Boundary */}
            <PolygonMap
              coordinates={detailListing.coordinates}
              polygon={detailListing.polygon}
              readOnly={true}
              title="📍 Property Center & Neighborhood Polygon Boundary"
            />

            {/* Google Places & Manual Neighborhood Info */}
            <NeighborhoodInfo
              coordinates={detailListing.coordinates}
              propertyTitle={detailListing.title}
              manualFacilities={detailListing.nearbyFacilities}
            />

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button
                className="btn btn-primary"
                onClick={() => {
                  setBookingListing(detailListing);
                  setDetailListing(null);
                }}
              >
                📩 Request Booking for This Property
              </button>
            </div>
          </div>
        </Modal>
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
              <label className="form-label">Requested Date(s) * (Comma separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. 2026-09-15, 2026-09-16, 2026-09-17"
                value={bookingDateInput}
                onChange={(e) => setBookingDateInput(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ marginBottom: '1.25rem' }}>
              <label className="form-label">Note for Landlord (Optional)</label>
              <textarea
                className="form-textarea"
                rows="3"
                placeholder="Include your move-in timeline or family details..."
                value={inquiryMsg}
                onChange={(e) => setInquiryMsg(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setBookingListing(null)}
                disabled={submittingBooking}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={submittingBooking}
              >
                {submittingBooking ? 'Submitting...' : '🚀 Submit Rental Request'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* AI Rental Search Assistant Widget */}
      <AiAssistantWidget
        isOpen={isAiAssistantOpen}
        onClose={() => setIsAiAssistantOpen(false)}
        onOpenBooking={(listing) => setBookingListing(listing)}
        onOpenCalendar={(listing) => setActiveCalendarListing(listing)}
        onOpenChat={(listing) => setChatListing(listing)}
      />

      {/* Floating AI Assistant Launcher Button (visible when widget is closed) */}
      {!isAiAssistantOpen && (
        <button
          onClick={() => setIsAiAssistantOpen(true)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            padding: '0.75rem 1.25rem',
            borderRadius: '30px',
            background: 'linear-gradient(135deg, #8b5cf6, #3b82f6)',
            color: '#ffffff',
            fontWeight: 700,
            fontSize: '0.9rem',
            border: 'none',
            cursor: 'pointer',
            boxShadow: '0 8px 24px rgba(139, 92, 246, 0.45)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.55rem',
            zIndex: 9998,
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
        >
          <span style={{ fontSize: '1.2rem' }}>🤖</span>
          <span>AI Rental Assistant</span>
          <span
            style={{
              fontSize: '0.65rem',
              background: '#10b981',
              color: '#ffffff',
              padding: '0.15rem 0.45rem',
              borderRadius: '10px',
              fontWeight: 800,
            }}
          >
            AI
          </span>
        </button>
      )}

      {/* Toasts */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
    </div>
  );
}
