import { useState, useEffect } from 'react';
import { getListings, createListing, updateListingAvailability } from '../services/listingsApi';
import { getBookings, landlordApproveBooking, rejectBooking } from '../services/bookingsApi';
import { flagTenant } from '../services/trustScoreApi';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import AvailabilityCalendar from '../components/admin/AvailabilityCalendar';
import ChatModal from '../components/chat/ChatModal';

export default function LandlordListings() {
  const { user } = useAuth();
  const [listings, setListings] = useState([]);
  const [tenantBookings, setTenantBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isPendingVerification, setIsPendingVerification] = useState(false);

  // Dismissed notification IDs
  const [readBookingIds, setReadBookingIds] = useState(() => {
    try {
      const saved = localStorage.getItem(`rentease_landlord_read_bookings_${user?.id || 'demo'}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showHistory, setShowHistory] = useState(false);

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeCalendarListing, setActiveCalendarListing] = useState(null);
  const [chatListing, setChatListing] = useState(null);

  // Flag Tenant Modal State
  const [flaggingBooking, setFlaggingBooking] = useState(null);
  const [flagReason, setFlagReason] = useState('');
  const [flagSeverity, setFlagSeverity] = useState('medium');
  const [submittingFlag, setSubmittingFlag] = useState(false);

  // Add listing form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [amenities, setAmenities] = useState('');

  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      setError('');
      setIsPendingVerification(false);
      const res = await getListings();
      setListings(res.data);
    } catch (err) {
      if (err.response && err.response.status === 403 && err.response.data?.status === 'pending_verification') {
        setIsPendingVerification(true);
      } else {
        setError('Failed to load listings.');
        showToast('Error loading properties', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchTenantBookings = async () => {
    try {
      const res = await getBookings();
      setTenantBookings(res.data);
    } catch (err) {
      console.error('Error fetching tenant bookings:', err);
    }
  };

  useEffect(() => {
    if (user?.role === 'landlord') {
      fetchListings();
      fetchTenantBookings();
    }
  }, [user?.role]);

  const markAllAsRead = () => {
    const allIds = tenantBookings.map((b) => b._id);
    setReadBookingIds(allIds);
    localStorage.setItem(`rentease_landlord_read_bookings_${user?.id || 'demo'}`, JSON.stringify(allIds));
    showToast('All notifications marked as read!', 'info');
  };

  // Landlord approves tenant booking
  const handleApproveTenantBooking = async (id) => {
    try {
      await landlordApproveBooking(id);
      showToast('Booking request approved! Sent to Admin for final approval.');
      fetchTenantBookings();
      fetchListings();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to approve booking', 'error');
    }
  };

  // Landlord rejects tenant booking
  const handleRejectTenantBooking = async (id) => {
    try {
      await rejectBooking(id);
      showToast('Booking request rejected.', 'info');
      fetchTenantBookings();
    } catch (err) {
      showToast('Failed to reject booking', 'error');
    }
  };

  // Submit Flag Tenant
  const handleFlagSubmit = async (e) => {
    e.preventDefault();
    if (!flagReason.trim() || !flaggingBooking) return;

    try {
      setSubmittingFlag(true);
      await flagTenant({
        tenantId: flaggingBooking.tenantId,
        tenantName: flaggingBooking.tenantName,
        tenantEmail: flaggingBooking.tenantEmail,
        reason: flagReason,
        severity: flagSeverity,
      });

      showToast(`Flag added against ${flaggingBooking.tenantName}. Trust Score updated.`);
      setFlaggingBooking(null);
      setFlagReason('');
      setFlagSeverity('medium');
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to flag tenant', 'error');
    } finally {
      setSubmittingFlag(false);
    }
  };

  const activeUnreadBookings = tenantBookings.filter((b) => !readBookingIds.includes(b._id));

  // ── Role Gate ─────────────────────────────────────────────────
  if (user?.role !== 'landlord') {
    return (
      <div className="container">
        <div className="empty-state" style={{ marginTop: '5rem' }}>
          <div className="empty-state-icon">🔒</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '.5rem' }}>
            Landlord Access Required
          </h2>
          <div className="empty-state-text">
            Use the <strong style={{ color: 'var(--green)' }}>🏠 Landlord</strong> toggle
            in the top-right header to switch roles and manage listings.
          </div>
        </div>
      </div>
    );
  }

  // ── Pending Verification Screen ────────────────────────────────
  if (isPendingVerification) {
    return (
      <div className="container">
        <div className="empty-state" style={{ marginTop: '5rem' }}>
          <div className="empty-state-icon">⏳</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '.5rem' }}>
            Account Pending Approval
          </h2>
          <div className="empty-state-text" style={{ maxWidth: '520px', margin: '0 auto', lineHeight: '1.6' }}>
            Your landlord account (<strong style={{ color: 'var(--green)' }}>{user.email}</strong>) is currently awaiting admin verification.
            <br /><br />
            Please toggle to the <strong style={{ color: 'var(--purple)' }}>🛡 Admin</strong> role in the header and approve your landlord account in the verification queue first.
          </div>
        </div>
      </div>
    );
  }

  const handleAddListing = async (e) => {
    e.preventDefault();
    if (!title || !location || !description || !price) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    try {
      const amenitiesArray = amenities
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a !== '');

      await createListing({
        title,
        location,
        description,
        price: Number(price),
        amenities: amenitiesArray,
      });

      showToast('Property listing submitted for admin review!');
      setIsAddModalOpen(false);
      // Reset form
      setTitle('');
      setLocation('');
      setDescription('');
      setPrice('');
      setAmenities('');
      fetchListings();
    } catch (err) {
      showToast(err.response?.data?.message || 'Failed to create listing', 'error');
    }
  };

  const handleSaveAvailability = async (bookedDates) => {
    if (!activeCalendarListing) return;
    try {
      await updateListingAvailability(activeCalendarListing._id, bookedDates);
      showToast('Availability calendar updated successfully!');
      setActiveCalendarListing(null);
      fetchListings();
    } catch (err) {
      showToast('Failed to update availability', 'error');
    }
  };

  return (
    <div className="container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">Landlord Dashboard & Properties</h1>
          <p className="page-subtitle">Manage rental listings, chat with tenants, review booking requests, and manage availability.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          ➕ Add Property
        </button>
      </div>

      {/* ── TENANT BOOKING REQUESTS PANEL ───────────────────────────── */}
      <div
        className="panel"
        style={{
          marginBottom: '2.5rem',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderTop: '3px solid var(--green)',
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
              📥 Tenant Booking Requests
              <span
                style={{
                  fontSize: '0.75rem',
                  background: 'rgba(16, 185, 129, 0.15)',
                  color: 'var(--green)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  padding: '0.2rem 0.6rem',
                  borderRadius: '12px',
                }}
              >
                {activeUnreadBookings.length} Active
              </span>
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Review rental requests submitted by prospective tenants for your properties.
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
                onClick={markAllAsRead}
                title="Clear notification requests panel"
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
              onClick={fetchTenantBookings}
            >
              🔄 Refresh Requests
            </button>
          </div>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {activeUnreadBookings.length === 0 && !showHistory ? (
            <div style={{ padding: '1rem 0', textAlign: 'center' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
                ✨ All tenant booking requests are clear or marked as read!
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                        {b.listingTitle}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.75rem',
                          background: 'rgba(16, 185, 129, 0.15)',
                          color: '#34d399',
                          border: '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontWeight: 600,
                        }}
                      >
                        Tenant: {b.tenantName} ({b.tenantEmail})
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
                      📍 {b.listingLocation} | 📅 Requested Dates: <strong style={{ color: '#38bdf8' }}>{b.dates?.join(', ')}</strong>
                    </p>
                    {b.notes && (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                        Note: "{b.notes}"
                      </p>
                    )}
                  </div>

                  {/* Actions / Status */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                      onClick={() => setChatListing({ _id: b.listingId, title: b.listingTitle, location: b.listingLocation })}
                    >
                      💬 Chat Tenant
                    </button>

                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.78rem', padding: '0.4rem 0.75rem', color: '#fbbf24', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                      onClick={() => setFlaggingBooking(b)}
                    >
                      🚩 Flag Tenant
                    </button>

                    {b.status === 'pending_landlord' && (
                      <>
                        <button
                          className="btn"
                          style={{
                            fontSize: '0.8rem',
                            padding: '0.45rem 0.9rem',
                            background: 'linear-gradient(135deg, #10b981, #047857)',
                            color: '#ffffff',
                            borderColor: 'transparent',
                            boxShadow: '0 0 12px rgba(16, 185, 129, 0.3)',
                          }}
                          onClick={() => handleApproveTenantBooking(b._id)}
                        >
                          ✅ Approve Booking
                        </button>
                        <button
                          className="btn btn-reject"
                          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                          onClick={() => handleRejectTenantBooking(b._id)}
                        >
                          🔴 Reject
                        </button>
                      </>
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
                        🔵 Approved by You — Sent to Admin ⏳
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
                        🟢 ✅ Admin Approved Booking! Dates Reserved
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
                        🔴 Rejected
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
                {tenantBookings.filter((b) => readBookingIds.includes(b._id)).map((hb) => (
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
                    <span>{hb.listingTitle} — {hb.tenantName} ({hb.dates?.join(', ')})</span>
                    <span style={{ fontWeight: 600 }}>{hb.status.toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Property Cards */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p className="empty-state-text">Loading properties...</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-state-text">{error}</div>
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏠</div>
          <p className="empty-state-text">No properties found. Click "Add Property" to submit your first listing!</p>
        </div>
      ) : (
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          {listings.map((listing) => (
            <div key={listing._id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <h3 className="card-title" style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                  {listing.title}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--t3)' }}>📍 {listing.location}</p>
              </div>
              <div className="card-body" style={{ flexGrow: 1, padding: '1rem 0' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--t2)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {listing.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--purple)' }}>
                    BDT {listing.price.toLocaleString()}/mo
                  </span>
                  <span className={`badge badge-${listing.status === 'approved' ? 'success' : listing.status === 'pending' ? 'warning' : 'danger'}`}>
                    {listing.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--t3)', borderTop: '1px dashed var(--border)', paddingTop: '0.75rem' }}>
                  📅 {listing.bookedDates ? listing.bookedDates.length : 0} Booked/Blocked dates
                </div>
              </div>
              <div className="card-footer" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)', display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn btn-secondary"
                  onClick={() => setChatListing(listing)}
                  style={{ flexGrow: 1, color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.3)' }}
                >
                  💬 Chat
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => setActiveCalendarListing(listing)}
                  style={{ flexGrow: 1 }}
                >
                  🗓 Availability
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Listing Modal */}
      {isAddModalOpen && (
        <Modal title="Add New Property Listing" onClose={() => setIsAddModalOpen(false)}>
          <form onSubmit={handleAddListing} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Property Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Modern Studio in Dhanmondi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location / Address *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Dhanmondi, Dhaka"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Rent (BDT) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 25000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amenities (Comma separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="WiFi, Generator, AC, Security"
                value={amenities}
                onChange={(e) => setAmenities(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                className="form-textarea"
                placeholder="Describe your property in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Submit Listing
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Flag Tenant Modal */}
      {flaggingBooking && (
        <Modal title={`🚩 Flag Tenant: ${flaggingBooking.tenantName}`} onClose={() => setFlaggingBooking(null)}>
          <form onSubmit={handleFlagSubmit} style={{ padding: '1rem' }}>
            <div style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1rem' }}>
              <h4 style={{ margin: '0 0 0.25rem 0', color: '#f87171' }}>{flaggingBooking.tenantName} ({flaggingBooking.tenantEmail})</h4>
              <p style={{ margin: 0, fontSize: '0.82rem', color: '#cbd5e1' }}>
                Property: {flaggingBooking.listingTitle}
              </p>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Flag Severity Level *</label>
              <select
                className="form-select"
                value={flagSeverity}
                onChange={(e) => setFlagSeverity(e.target.value)}
              >
                <option value="low">Low (-5 pts penalty)</option>
                <option value="medium">Medium (-10 pts penalty)</option>
                <option value="high">High (-20 pts penalty)</option>
                <option value="critical">Critical (-30 pts penalty)</option>
              </select>
            </div>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label">Reason for Flagging *</label>
              <textarea
                className="form-textarea"
                rows={3}
                required
                placeholder="Describe reason (e.g. Unpaid rent, lease violation, property damage)..."
                value={flagReason}
                onChange={(e) => setFlagReason(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setFlaggingBooking(null)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-reject" disabled={submittingFlag}>
                {submittingFlag ? 'Flagging...' : '🚩 Flag Tenant'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Calendar Availability Modal */}
      {activeCalendarListing && (
        <Modal
          title={`Availability: ${activeCalendarListing.title}`}
          onClose={() => setActiveCalendarListing(null)}
        >
          <div style={{ padding: '1rem' }}>
            <AvailabilityCalendar
              initialBookedDates={activeCalendarListing.bookedDates}
              onSave={handleSaveAvailability}
              onCancel={() => setActiveCalendarListing(null)}
            />
          </div>
        </Modal>
      )}

      {/* Chat Modal */}
      {chatListing && (
        <ChatModal listing={chatListing} onClose={() => setChatListing(null)} />
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
