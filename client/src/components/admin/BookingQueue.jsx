import { useState, useEffect } from 'react';
import { getBookings, adminApproveBooking, rejectBooking } from '../../services/bookingsApi';

export default function BookingQueue({ onAction }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Dismissed / Read notification IDs stored in localStorage
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('rentease_admin_read_bookings');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [showHistory, setShowHistory] = useState(false);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getBookings();
      setBookings(res.data);
    } catch (err) {
      console.error('Error fetching admin booking queue:', err);
      setError('Failed to load booking approval queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const markAllAsRead = () => {
    const allIds = bookings.map((b) => b._id);
    setReadIds(allIds);
    localStorage.setItem('rentease_admin_read_bookings', JSON.stringify(allIds));
  };

  const handleAdminApprove = async (id) => {
    try {
      setActionLoading(id);
      await adminApproveBooking(id);
      fetchBookings();
      if (onAction) onAction();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to approve booking');
    } finally {
      setActionLoading(null);
    }
  };

  const handleAdminReject = async (id) => {
    try {
      setActionLoading(id);
      await rejectBooking(id);
      fetchBookings();
      if (onAction) onAction();
    } catch (err) {
      alert('Failed to reject booking');
    } finally {
      setActionLoading(null);
    }
  };

  // Active unread bookings
  const pendingAdminBookings = bookings.filter(
    (b) => (b.status === 'pending_admin' || b.status === 'pending_landlord') && !readIds.includes(b._id)
  );

  // Past completed bookings
  const pastBookings = bookings.filter(
    (b) => (b.status === 'approved' || b.status === 'rejected') && !readIds.includes(b._id)
  );

  const totalUnreadCount = pendingAdminBookings.length + pastBookings.length;

  return (
    <div
      className="panel"
      style={{
        marginBottom: '2.5rem',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderTop: '3px solid var(--teal)',
        background: 'rgba(13, 20, 37, 0.85)',
        backdropFilter: 'blur(16px)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      {/* Panel Header */}
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
            🛡 Tenant Booking Approval Queue
            <span
              style={{
                fontSize: '0.75rem',
                background: 'rgba(34, 211, 238, 0.12)',
                color: 'var(--teal)',
                border: '1px solid rgba(34, 211, 238, 0.3)',
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
              }}
            >
              {pendingAdminBookings.length} Pending
            </span>
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
            Final approval reserves requested dates on property calendars and notifies Tenant & Landlord.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          {totalUnreadCount > 0 && (
            <button
              className="btn"
              style={{
                fontSize: '0.78rem',
                background: 'rgba(255, 255, 255, 0.06)',
                borderColor: 'rgba(255, 255, 255, 0.15)',
                color: '#f8fafc',
              }}
              onClick={markAllAsRead}
              title="Clear notifications panel"
            >
              ✔️ Mark All as Read
            </button>
          )}

          {readIds.length > 0 && (
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
              {showHistory ? '🙈 Hide Dismissed' : `👁️ Show Dismissed (${readIds.length})`}
            </button>
          )}

          <button
            className="btn btn-secondary"
            style={{ fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.05)', color: '#f8fafc' }}
            onClick={fetchBookings}
          >
            🔄 Refresh Queue
          </button>
        </div>
      </div>

      {/* Panel Body */}
      <div style={{ padding: '1.25rem 1.5rem' }}>
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p className="empty-state-text" style={{ color: '#94a3b8' }}>Loading queue...</p>
          </div>
        ) : error ? (
          <p className="empty-state-text" style={{ color: '#ef4444' }}>{error}</p>
        ) : totalUnreadCount === 0 && !showHistory ? (
          <div style={{ padding: '1.5rem 0', textAlign: 'center' }}>
            <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
              ✨ All booking notifications marked as read or clear! No pending approvals awaiting action.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {/* PENDING BOOKINGS */}
            {pendingAdminBookings.map((b) => (
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
                  transition: 'all 0.2s',
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
                        background: 'rgba(139, 92, 246, 0.15)',
                        color: '#c084fc',
                        border: '1px solid rgba(139, 92, 246, 0.3)',
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        fontWeight: 600,
                      }}
                    >
                      Tenant: {b.tenantName} ({b.tenantEmail})
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
                    📍 {b.listingLocation} | 📅 Dates: <strong style={{ color: '#38bdf8' }}>{b.dates?.join(', ')}</strong>
                  </p>
                  <div style={{ marginTop: '0.35rem' }}>
                    <span
                      style={{
                        fontSize: '0.78rem',
                        color: b.status === 'pending_admin' ? '#60a5fa' : '#fbbf24',
                        fontWeight: 600,
                      }}
                    >
                      Status: {b.status === 'pending_admin' ? '🔵 Approved by Landlord — Awaiting Admin Final Approval' : '🟡 Pending Landlord Review'}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn"
                    style={{
                      fontSize: '0.8rem',
                      padding: '0.45rem 1rem',
                      background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                      color: '#ffffff',
                      borderColor: 'transparent',
                      boxShadow: '0 0 12px rgba(79, 70, 229, 0.3)',
                    }}
                    onClick={() => handleAdminApprove(b._id)}
                    disabled={actionLoading === b._id}
                  >
                    {actionLoading === b._id ? 'Approving...' : '🛡 Final Approve Booking'}
                  </button>
                  <button
                    className="btn btn-reject"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                    onClick={() => handleAdminReject(b._id)}
                    disabled={actionLoading === b._id}
                  >
                    🔴 Reject
                  </button>
                </div>
              </div>
            ))}

            {/* COMPLETED / REJECTED BOOKINGS WITH HIGH CONTRAST */}
            {pastBookings.length > 0 && (
              <div style={{ marginTop: '1.25rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
                <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.85rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Completed & Historical Bookings ({pastBookings.length})
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                  {pastBookings.map((pb) => (
                    <div
                      key={pb._id}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.07)',
                        fontSize: '0.85rem',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <span style={{ color: '#f8fafc', fontWeight: 500 }}>
                        <strong style={{ color: '#ffffff' }}>{pb.listingTitle}</strong> — {pb.tenantName} (<span style={{ color: '#38bdf8' }}>{pb.dates?.join(', ')}</span>)
                      </span>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          padding: '0.2rem 0.6rem',
                          borderRadius: '12px',
                          background: pb.status === 'approved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                          color: pb.status === 'approved' ? '#34d399' : '#f87171',
                          border: `1px solid ${pb.status === 'approved' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
                        }}
                      >
                        {pb.status === 'approved' ? '🟢 APPROVED' : '🔴 REJECTED'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* SHOW DISMISSED HISTORY IF TOGGLED */}
        {showHistory && readIds.length > 0 && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px dashed rgba(255, 255, 255, 0.1)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontSize: '0.85rem', fontWeight: 600, color: '#64748b' }}>
                Dismissed Notifications ({readIds.length})
              </h4>
              <button
                className="btn"
                style={{ fontSize: '0.72rem', color: '#38bdf8', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onClick={() => { setReadIds([]); localStorage.removeItem('rentease_admin_read_bookings'); }}
              >
                Clear Dismissed History
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {bookings.filter((b) => readIds.includes(b._id)).map((hb) => (
                <div
                  key={hb._id}
                  style={{
                    padding: '0.6rem 0.85rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.015)',
                    border: '1px solid rgba(255, 255, 255, 0.04)',
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
  );
}
