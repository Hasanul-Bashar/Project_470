import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getListings, createListing, updateListingAvailability } from '../services/listingsApi';
import { getBookings, landlordApproveBooking, rejectBooking } from '../services/bookingsApi';
import { getMaintenanceRequests, updateMaintenanceStage } from '../services/maintenanceApi';
import { useAuth } from '../context/AuthContext';
import Modal from '../components/Modal';
import AvailabilityCalendar from '../components/admin/AvailabilityCalendar';
import ReviewSection from '../components/ReviewSection';
import RichTextEditor from '../components/RichTextEditor';
import ImageUpload from '../components/ImageUpload';
import PolygonMap from '../components/PolygonMap';
import { getImageUrl, PLACEHOLDER_IMAGE } from '../utils/imageUtils';

export default function LandlordListings() {
  const { user } = useAuth();
  const navigate = useNavigate();
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

  // Add listing rich form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [size, setSize] = useState('1000');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [furnishedStatus, setFurnishedStatus] = useState('Furnished');
  const [amenities, setAmenities] = useState('');
  const [photos, setPhotos] = useState([]);
  const [nearbyFacilities, setNearbyFacilities] = useState([]);
  const [newFacilityName, setNewFacilityName] = useState('');
  const [newFacilityCategory, setNewFacilityCategory] = useState('Schools');
  const [newFacilityDistance, setNewFacilityDistance] = useState('500m');
  const [coordinates, setCoordinates] = useState({ lat: 23.777176, lng: 90.399452 });
  const [polygon, setPolygon] = useState([]);

  const handleAddFacility = () => {
    if (!newFacilityName.trim()) return;
    setNearbyFacilities([
      ...nearbyFacilities,
      { name: newFacilityName.trim(), category: newFacilityCategory, distance: newFacilityDistance.trim() || 'Nearby' },
    ]);
    setNewFacilityName('');
    setNewFacilityDistance('500m');
  };

  const handleRemoveFacility = (index) => {
    setNearbyFacilities(nearbyFacilities.filter((_, i) => i !== index));
  };

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

  const [tenantMaintenance, setTenantMaintenance] = useState([]);

  const fetchTenantBookings = async () => {
    try {
      const res = await getBookings();
      setTenantBookings(res.data);
    } catch (err) {
      console.error('Error fetching tenant bookings:', err);
    }
  };

  const fetchTenantMaintenance = async () => {
    try {
      const res = await getMaintenanceRequests();
      setTenantMaintenance(res.data.requests || []);
    } catch (err) {
      console.error('Error fetching tenant maintenance:', err);
    }
  };

  const handleAcknowledgeMaintenance = async (id, mTitle) => {
    try {
      await updateMaintenanceStage(id, {
        status: 'Acknowledged',
        note: 'Landlord acknowledged preliminary submitted ticket from dashboard.',
      });
      showToast(`Maintenance issue "${mTitle}" acknowledged!`);
      fetchTenantMaintenance();
    } catch (err) {
      showToast('Failed to acknowledge maintenance ticket', 'error');
    }
  };

  useEffect(() => {
    if (user?.role === 'landlord') {
      fetchListings();
      fetchTenantBookings();
      fetchTenantMaintenance();
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

  const activeUnreadBookings = tenantBookings.filter((b) => !readBookingIds.includes(b._id));

  // Role Gate
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

  // Pending Verification Screen
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
        size: Number(size) || 1000,
        propertyType,
        furnishedStatus,
        amenities: amenitiesArray,
        photos,
        nearbyFacilities,
        coordinates,
        polygon,
      });

      showToast('Property listing submitted with custom POIs & polygon boundary for admin review!');
      setIsAddModalOpen(false);
      // Reset form
      setTitle('');
      setLocation('');
      setDescription('');
      setPrice('');
      setSize('1000');
      setPropertyType('Apartment');
      setFurnishedStatus('Furnished');
      setAmenities('');
      setPhotos([]);
      setNearbyFacilities([]);
      setCoordinates({ lat: 23.777176, lng: 90.399452 });
      setPolygon([]);
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
          <p className="page-subtitle">Manage property listings with polygon neighborhood tagging, photos, and calendar availability.</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/rent-tracking')}
            id="btn-open-rent-tracking"
            title="Track rent payments per tenant per month"
          >
            💳 Rent Tracking
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/maintenance')}
            id="btn-open-maintenance"
            title="Manage maintenance requests and repair stages"
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            🛠 Maintenance
            {tenantMaintenance.filter((m) => m.status === 'Submitted').length > 0 && (
              <span
                style={{
                  background: '#3b82f6',
                  color: '#ffffff',
                  fontSize: '0.72rem',
                  padding: '2px 7px',
                  borderRadius: '10px',
                  fontWeight: 700,
                }}
              >
                {tenantMaintenance.filter((m) => m.status === 'Submitted').length} Submitted
              </span>
            )}
          </button>
          <button
            className="btn btn-secondary"
            onClick={() => navigate('/landlord-analytics')}
            id="btn-open-analytics"
            title="View your property analytics"
          >
            📊 Analytics
          </button>
          <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
            ➕ Add Property
          </button>
        </div>
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
        </div>
      </div>

      {/* ── TENANT MAINTENANCE ISSUES PANEL ───────────────────────────── */}
      <div
        className="panel"
        style={{
          marginBottom: '2.5rem',
          border: '1px solid rgba(59, 130, 246, 0.3)',
          borderTop: '3px solid #3b82f6',
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
              🛠️ Tenant Maintenance Issues
              {tenantMaintenance.filter((m) => m.status === 'Submitted').length > 0 ? (
                <span
                  style={{
                    fontSize: '0.75rem',
                    background: 'rgba(59, 130, 246, 0.15)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                    fontWeight: 700,
                  }}
                >
                  {tenantMaintenance.filter((m) => m.status === 'Submitted').length} Submitted (Preliminary)
                </span>
              ) : (
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
                  {tenantMaintenance.length} Active Tickets
                </span>
              )}
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              When a maintenance issue is submitted by a tenant, it preliminarily stays as <strong>"Submitted"</strong> until you review and acknowledge or advance its repair stage.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <button
              className="btn btn-primary"
              style={{ fontSize: '0.78rem' }}
              onClick={() => navigate('/maintenance')}
              title="Open full maintenance repair tracker"
            >
              🛠 Open Full Maintenance Tracker ➔
            </button>
            <button
              className="btn btn-secondary"
              style={{ fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc' }}
              onClick={fetchTenantMaintenance}
              title="Refresh maintenance requests"
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        <div style={{ padding: '1.25rem 1.5rem' }}>
          {tenantMaintenance.length === 0 ? (
            <div style={{ padding: '1rem 0', textAlign: 'center' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0 }}>
                ✨ No active maintenance issues reported for your properties.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {tenantMaintenance.map((m) => (
                <div
                  key={m._id}
                  style={{
                    padding: '1rem 1.15rem',
                    borderRadius: '12px',
                    border: m.status === 'Submitted' ? '1px solid rgba(59, 130, 246, 0.35)' : '1px solid rgba(255, 255, 255, 0.08)',
                    background: m.status === 'Submitted' ? 'rgba(59, 130, 246, 0.05)' : 'rgba(255, 255, 255, 0.03)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: '1rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem', flexWrap: 'wrap' }}>
                      <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                        {m.title}
                      </h4>
                      <span
                        style={{
                          fontSize: '0.72rem',
                          background: 'rgba(255, 255, 255, 0.08)',
                          color: '#cbd5e1',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '8px',
                        }}
                      >
                        {m.category}
                      </span>
                      {m.urgency === 'Emergency' && (
                        <span style={{ fontSize: '0.72rem', background: '#ef4444', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '8px', fontWeight: 700 }}>
                          🔴 Emergency
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '0.75rem',
                          background: m.status === 'Submitted' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.15)',
                          color: m.status === 'Submitted' ? '#60a5fa' : '#34d399',
                          border: m.status === 'Submitted' ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(16, 185, 129, 0.3)',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          fontWeight: 700,
                        }}
                      >
                        {m.status === 'Submitted' ? '📩 Submitted (Preliminary)' : m.status}
                      </span>
                    </div>
                    <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
                      📍 {m.listingTitle} | Reported by <strong>{m.tenantName}</strong> ({m.tenantEmail})
                    </p>
                    {m.description && (
                      <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.8rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                        "{m.description}"
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {m.status === 'Submitted' && (
                      <button
                        className="btn"
                        style={{
                          fontSize: '0.8rem',
                          padding: '0.45rem 0.9rem',
                          background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
                          color: '#ffffff',
                          border: 'none',
                          boxShadow: '0 0 12px rgba(59, 130, 246, 0.3)',
                          fontWeight: 600,
                        }}
                        onClick={() => handleAcknowledgeMaintenance(m._id, m.title)}
                        title="Acknowledge this preliminary submitted issue"
                      >
                        👁️ Acknowledge Issue
                      </button>
                    )}
                    <button
                      className="btn btn-secondary"
                      style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                      onClick={() => navigate('/maintenance')}
                    >
                      ⚙️ Manage Stages
                    </button>
                  </div>
                </div>
              ))}
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
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          {listings.map((listing) => (
            <div key={listing._id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Photo Header */}
              {listing.photos && listing.photos.length > 0 && (
                <div style={{ height: '160px', width: '100%', overflow: 'hidden', position: 'relative' }}>
                  <img
                    src={getImageUrl(listing.photos[0])}
                    alt={listing.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = PLACEHOLDER_IMAGE;
                    }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      bottom: '8px',
                      right: '8px',
                      background: 'rgba(15, 23, 42, 0.75)',
                      backdropFilter: 'blur(6px)',
                      color: '#ffffff',
                      fontSize: '0.72rem',
                      padding: '0.2rem 0.5rem',
                      borderRadius: '10px',
                    }}
                  >
                    📸 {listing.photos.length} Photos
                  </span>
                </div>
              )}

              <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', paddingTop: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h3 className="card-title" style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                    {listing.title}
                  </h3>
                  <span className={`badge badge-${listing.status === 'approved' ? 'success' : listing.status === 'pending' ? 'warning' : 'danger'}`}>
                    {listing.status.toUpperCase()}
                  </span>
                </div>
                <p style={{ fontSize: '0.8rem', color: 'var(--t3)' }}>📍 {listing.location}</p>
              </div>

              <div className="card-body" style={{ flexGrow: 1, padding: '1rem 0' }}>
                <div
                  style={{ fontSize: '0.85rem', color: 'var(--t2)', marginBottom: '0.85rem' }}
                  dangerouslySetInnerHTML={{ __html: listing.description }}
                />

                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.85rem' }}>
                  <span style={{ fontSize: '0.74rem', background: 'rgba(139, 92, 246, 0.15)', color: '#c084fc', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>
                    🏠 {listing.propertyType || 'Apartment'}
                  </span>
                  <span style={{ fontSize: '0.74rem', background: 'rgba(56, 189, 248, 0.15)', color: '#38bdf8', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>
                    🛋️ {listing.furnishedStatus || 'Furnished'}
                  </span>
                  <span style={{ fontSize: '0.74rem', background: 'rgba(16, 185, 129, 0.15)', color: '#34d399', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>
                    📐 {listing.size || 1000} sqft
                  </span>
                  {listing.polygon && listing.polygon.length >= 3 && (
                    <span style={{ fontSize: '0.74rem', background: 'rgba(236, 72, 153, 0.15)', color: '#f472b6', padding: '0.2rem 0.5rem', borderRadius: '10px' }}>
                      📐 Polygon Boundary ({listing.polygon.length}pts)
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '1.2rem', fontWeight: '800', color: 'var(--purple)' }}>
                    BDT {listing.price?.toLocaleString()}/mo
                  </span>
                </div>

                <div style={{ fontSize: '0.82rem', color: 'var(--t3)', borderTop: '1px dashed var(--border)', paddingTop: '0.75rem' }}>
                  📅 {listing.bookedDates ? listing.bookedDates.length : 0} Booked/Blocked dates
                </div>
              </div>

              <div className="card-footer" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-secondary w-full"
                  onClick={() => setActiveCalendarListing(listing)}
                  style={{ width: '100%' }}
                >
                  🗓 Manage Availability Calendar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Listing Modal */}
      {isAddModalOpen && (
        <Modal title="Add New Property Listing" onClose={() => setIsAddModalOpen(false)}>
          <form onSubmit={handleAddListing} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem', maxHeight: '80vh', overflowY: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Property Title *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Luxury 3BR Apartment in Dhanmondi"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Location / Area Address *</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dhanmondi Road 27, Dhaka"
                  value={location}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocation(val);
                    const lower = val.toLowerCase();
                    const presets = [
                      { keywords: ['dhanmondi'], lat: 23.7542, lng: 90.3769, polygon: [{ lat: 23.752, lng: 90.374 }, { lat: 23.756, lng: 90.374 }, { lat: 23.756, lng: 90.378 }, { lat: 23.752, lng: 90.378 }] },
                      { keywords: ['gulshan'], lat: 23.7925, lng: 90.4078, polygon: [{ lat: 23.791, lng: 90.406 }, { lat: 23.794, lng: 90.406 }, { lat: 23.794, lng: 90.409 }, { lat: 23.791, lng: 90.409 }] },
                      { keywords: ['banani'], lat: 23.7937, lng: 90.4066, polygon: [{ lat: 23.792, lng: 90.404 }, { lat: 23.795, lng: 90.404 }, { lat: 23.795, lng: 90.408 }, { lat: 23.792, lng: 90.408 }] },
                      { keywords: ['uttara'], lat: 23.8724, lng: 90.3984, polygon: [{ lat: 23.870, lng: 90.396 }, { lat: 23.875, lng: 90.396 }, { lat: 23.875, lng: 90.400 }, { lat: 23.870, lng: 90.400 }] },
                      { keywords: ['mirpur'], lat: 23.8069, lng: 90.3687, polygon: [{ lat: 23.804, lng: 90.366 }, { lat: 23.809, lng: 90.366 }, { lat: 23.809, lng: 90.371 }, { lat: 23.804, lng: 90.371 }] },
                      { keywords: ['bashundhara'], lat: 23.8151, lng: 90.4255, polygon: [{ lat: 23.813, lng: 90.423 }, { lat: 23.818, lng: 90.423 }, { lat: 23.818, lng: 90.428 }, { lat: 23.813, lng: 90.428 }] },
                    ];
                    const match = presets.find((p) => p.keywords.some((kw) => lower.includes(kw)));
                    if (match) {
                      setCoordinates({ lat: match.lat, lng: match.lng });
                      setPolygon(match.polygon);
                    }
                  }}
                  required
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '0.75rem' }}>
              <div className="form-group">
                <label className="form-label">Rent (BDT/mo) *</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="e.g. 35000"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Size (sqft)</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="1200"
                  value={size}
                  onChange={(e) => setSize(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Property Type</label>
                <select
                  className="form-input"
                  style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}
                  value={propertyType}
                  onChange={(e) => setPropertyType(e.target.value)}
                >
                  <option value="Apartment">Apartment</option>
                  <option value="House">House</option>
                  <option value="Sublet">Sublet</option>
                  <option value="Studio Apartment">Studio Apartment</option>
                  <option value="Duplex">Duplex</option>
                  <option value="Villa">Villa</option>
                  <option value="Commercial">Commercial</option>
                  <option value="Office">Office</option>
                  <option value="Room">Room Single/Shared</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Furnished Status</label>
                <select
                  className="form-input"
                  style={{ backgroundColor: '#0f172a', color: '#f8fafc' }}
                  value={furnishedStatus}
                  onChange={(e) => setFurnishedStatus(e.target.value)}
                >
                  <option value="Furnished">Furnished</option>
                  <option value="Unfurnished">Unfurnished / Not Furnished</option>
                  <option value="Semi-Furnished">Semi-Furnished</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Amenities (Comma separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="WiFi, Generator, Elevator, 24/7 Security, Balcony"
                value={amenities}
                onChange={(e) => setAmenities(e.target.value)}
              />
            </div>

            {/* Rich Text Description */}
            <div className="form-group">
              <label className="form-label">Rich Text Property Description *</label>
              <RichTextEditor
                value={description}
                onChange={setDescription}
                placeholder="Write a detailed description including rooms, features, nearby places..."
              />
            </div>

            {/* Multi-Image Upload */}
            <ImageUpload photos={photos} onChange={setPhotos} />

            {/* Manual Nearby Schools, Hospitals & POI Entry */}
            <div
              style={{
                border: '1px solid rgba(16, 185, 129, 0.3)',
                borderRadius: '12px',
                padding: '1.25rem',
                background: 'rgba(16, 185, 129, 0.04)',
                display: 'flex',
                flexDirection: 'column',
                gap: '0.75rem',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label className="form-label" style={{ margin: 0, fontWeight: 700, color: '#f8fafc' }}>
                  🏫 Nearby Schools, Hospitals & Facilities (Manual Entry)
                </label>
                <span style={{ fontSize: '0.78rem', color: '#34d399' }}>
                  {nearbyFacilities.length} Added
                </span>
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                Manually specify key nearby institutions like schools, colleges, hospitals, transit points or shopping centers.
              </p>

              {/* Add Input Controls */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '0.5rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Facility Name (e.g. Scholastica School, Square Hospital)"
                  value={newFacilityName}
                  onChange={(e) => setNewFacilityName(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
                <select
                  className="form-input"
                  value={newFacilityCategory}
                  onChange={(e) => setNewFacilityCategory(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                >
                  <option value="Schools">🏫 Schools</option>
                  <option value="Hospitals">🏥 Hospitals</option>
                  <option value="Transport">🚆 Transport</option>
                  <option value="Shopping">🛍️ Shopping</option>
                  <option value="Other">📍 Other</option>
                </select>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Distance (e.g. 500m)"
                  value={newFacilityDistance}
                  onChange={(e) => setNewFacilityDistance(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleAddFacility}
                  style={{ fontSize: '0.82rem', padding: '0.5rem 0.85rem', whiteSpace: 'nowrap' }}
                >
                  ➕ Add
                </button>
              </div>

              {/* Added Facilities Badges List */}
              {nearbyFacilities.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginTop: '0.25rem' }}>
                  {nearbyFacilities.map((fac, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.4rem',
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(16, 185, 129, 0.3)',
                        padding: '0.25rem 0.6rem',
                        borderRadius: '20px',
                        fontSize: '0.8rem',
                        color: '#f8fafc',
                      }}
                    >
                      <span>
                        {fac.category === 'Schools' ? '🏫' : fac.category === 'Hospitals' ? '🏥' : fac.category === 'Transport' ? '🚆' : fac.category === 'Shopping' ? '🛍️' : '📍'}{' '}
                        <strong>{fac.name}</strong> ({fac.distance})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveFacility(idx)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#f87171',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.85rem',
                          padding: '0 0.2rem',
                        }}
                        title="Remove facility"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Polygon Map & Neighborhood Boundary Tagging */}
            <PolygonMap
              coordinates={coordinates}
              polygon={polygon}
              onCoordinatesChange={setCoordinates}
              onPolygonChange={setPolygon}
              title="📍 Pin Property Location & Draw Custom Neighborhood Polygon Boundary"
            />

            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                🚀 Submit Property Listing
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

      {/* Toasts */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
    </div>
  );
}
