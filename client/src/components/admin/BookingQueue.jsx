import { useState, useEffect } from 'react';
import { getBookings, adminApproveBooking, rejectBooking } from '../../services/bookingsApi';

export default function BookingQueue({ onAction }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  // Rejection reason prompt state
  const [rejectTarget, setRejectTarget] = useState(null); // { id, title }
  const [rejectReason, setRejectReason] = useState('');

  // Dismissed / Read notification IDs
  const [readIds, setReadIds] = useState(() => {
    try {
      const saved = localStorage.getItem('rentease_admin_read_bookings');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
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

  useEffect(() => { fetchBookings(); }, []);

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

  const handleAdminReject = async () => {
    if (!rejectTarget) return;
    try {
      setActionLoading(rejectTarget.id);
      await rejectBooking(rejectTarget.id, rejectReason);
      setRejectTarget(null);
      setRejectReason('');
      fetchBookings();
      if (onAction) onAction();
    } catch (err) {
      alert('Failed to reject booking');
    } finally {
      setActionLoading(null);
    }
  };

  // Bookings waiting for landlord (shown as read-only info)
  const waitingLandlord = bookings.filter(
    (b) => b.status === 'pending_landlord' && !readIds.includes(b._id)
  );

  // Bookings ready for admin action (landlord already approved)
  const pendingAdminBookings = bookings.filter(
    (b) => b.status === 'pending_admin' && !readIds.includes(b._id)
  );

  // Completed bookings (approved or rejected)
  const pastBookings = bookings.filter(
    (b) => (b.status === 'approved' || b.status === 'rejected') && !readIds.includes(b._id)
  );

  const totalUnreadCount = waitingLandlord.length + pendingAdminBookings.length + pastBookings.length;

  return (
    <>
      {/* ── Reject Confirmation Modal ───────────────────────────────── */}
      {rejectTarget && (
        <div
          style={{
            position: 'fixed', inset: 0,
            background: 'rgba(0,0,0,0.72)',
            backdropFilter: 'blur(6px)',
            zIndex: 300,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '1rem',
          }}
          onClick={() => setRejectTarget(null)}
        >
          <div
            style={{
              background: '#111827',
              border: '1px solid rgba(239,68,68,0.3)',
              borderTop: '3px solid #ef4444',
              borderRadius: '16px',
              padding: '1.75rem',
              width: '100%',
              maxWidth: '460px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.65)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ margin: '0 0 0.5rem', color: '#f8fafc', fontSize: '1rem', fontWeight: 700 }}>
              🔴 Reject Booking
            </h3>
            <p style={{ margin: '0 0 1rem', fontSize: '0.84rem', color: '#94a3b8' }}>
              Rejecting: <strong style={{ color: '#f8fafc' }}>{rejectTarget.title}</strong>
              <br />
              The tenant will be notified immediately with the reason below.
            </p>
            <textarea
              className="form-textarea"
              rows="3"
              placeholder="Optional: reason for rejection (e.g. 'Dates conflict with existing reservation')"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              style={{ marginBottom: '1rem', fontSize: '0.85rem' }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                className="btn btn-secondary"
                onClick={() => { setRejectTarget(null); setRejectReason(''); }}
              >
                Cancel
              </button>
              <button
                className="btn"
                style={{
                  background: 'linear-gradient(135deg, #b91c1c, #ef4444)',
                  color: '#fff', borderColor: 'transparent',
                  boxShadow: '0 0 12px rgba(239,68,68,0.3)',
                }}
                onClick={handleAdminReject}
                disabled={actionLoading === rejectTarget.id}
              >
                {actionLoading === rejectTarget.id ? 'Rejecting...' : '🔴 Confirm Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}

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
                {pendingAdminBookings.length} Ready for Admin
              </span>
              {waitingLandlord.length > 0 && (
                <span
                  style={{
                    fontSize: '0.75rem',
                    background: 'rgba(245,158,11,0.12)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245,158,11,0.3)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '12px',
                  }}
                >
                  {waitingLandlord.length} Awaiting Landlord
                </span>
              )}
            </h3>
            <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Workflow: Tenant → <strong style={{ color: '#fbbf24' }}>Landlord Approves</strong> → <strong style={{ color: 'var(--teal)' }}>Admin Final Approval</strong> → Tenant Notified
            </p>
          </div>

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            {totalUnreadCount > 0 && (
              <button
                className="btn"
                style={{ fontSize: '0.78rem', background: 'rgba(255, 255, 255, 0.06)', borderColor: 'rgba(255, 255, 255, 0.15)', color: '#f8fafc' }}
                onClick={markAllAsRead}
                title="Clear notifications panel"
              >
                ✔️ Mark All as Read
              </button>
            )}
            {readIds.length > 0 && (
              <button
                className="btn"
                style={{ fontSize: '0.78rem', background: 'transparent', borderColor: 'rgba(255, 255, 255, 0.1)', color: '#94a3b8' }}
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
              <div className="spinner" />
              <p className="empty-state-text" style={{ color: '#94a3b8' }}>Loading queue...</p>
            </div>
          ) : error ? (
            <p className="empty-state-text" style={{ color: '#ef4444' }}>{error}</p>
          ) : totalUnreadCount === 0 && !showHistory ? (
            <div style={{ padding: '1.5rem 0', textAlign: 'center' }}>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', margin: 0 }}>
                ✨ No pending approvals. All booking notifications are clear.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>

              {/* ── STEP 1: Waiting on Landlord (admin cannot act yet) ─── */}
              {waitingLandlord.length > 0 && (
                <div style={{ marginBottom: '0.5rem' }}>
                  <p style={{
                    fontSize: '0.75rem', fontWeight: 700, color: '#fbbf24',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                    margin: '0 0 0.5rem 0',
                  }}>
                    🟡 Step 1 — Awaiting Landlord Decision
                  </p>
                  {waitingLandlord.map((b) => (
                    <div
                      key={b._id}
                      style={{
                        padding: '0.9rem 1.15rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(245, 158, 11, 0.2)',
                        background: 'rgba(245, 158, 11, 0.04)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '0.75rem',
                        opacity: 0.8,
                        marginBottom: '0.5rem',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.25rem' }}>
                          <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                            {b.listingTitle}
                          </h4>
                          <span style={{
                            fontSize: '0.72rem', background: 'rgba(245,158,11,0.15)', color: '#fbbf24',
                            border: '1px solid rgba(245,158,11,0.3)', padding: '0.15rem 0.5rem',
                            borderRadius: '10px', fontWeight: 600,
                          }}>
                            Pending Landlord
                          </span>
                        </div>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: '#94a3b8' }}>
                          👤 {b.tenantName} ({b.tenantEmail}) | 📅 {b.dates?.join(', ')}
                        </p>
                      </div>
                      <span style={{
                        fontSize: '0.75rem', color: '#64748b', fontStyle: 'italic',
                        border: '1px solid rgba(255,255,255,0.07)',
                        padding: '0.3rem 0.65rem', borderRadius: '8px',
                        background: 'rgba(255,255,255,0.02)',
                      }}>
                        🔒 Landlord must approve first
                      </span>
                    </div>
                  ))}
                </div>
              )}

              {/* ── STEP 2: Ready for Admin Final Approval ─────────────── */}
              {pendingAdminBookings.length > 0 && (
                <div>
                  <p style={{
                    fontSize: '0.75rem', fontWeight: 700, color: 'var(--teal)',
                    textTransform: 'uppercase', letterSpacing: '0.5px',
                    margin: '0 0 0.5rem 0',
                  }}>
                    🔵 Step 2 — Ready for Admin Final Decision
                  </p>
                  {pendingAdminBookings.map((b) => (
                    <div
                      key={b._id}
                      style={{
                        padding: '1rem 1.15rem',
                        borderRadius: '12px',
                        border: '1px solid rgba(34, 211, 238, 0.25)',
                        background: 'rgba(34, 211, 238, 0.04)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        flexWrap: 'wrap',
                        gap: '1rem',
                        marginBottom: '0.5rem',
                        transition: 'all 0.2s',
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', marginBottom: '0.35rem' }}>
                          <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#f8fafc' }}>
                            {b.listingTitle}
                          </h4>
                          <span style={{
                            fontSize: '0.75rem', background: 'rgba(34,211,238,0.12)', color: '#22d3ee',
                            border: '1px solid rgba(34,211,238,0.3)', padding: '0.2rem 0.6rem',
                            borderRadius: '12px', fontWeight: 600,
                          }}>
                            ✅ Landlord Approved
                          </span>
                        </div>
                        <p style={{ margin: '0 0 0.25rem', fontSize: '0.84rem', color: '#94a3b8' }}>
                          👤 {b.tenantName} ({b.tenantEmail})
                        </p>
                        <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
                          📍 {b.listingLocation} | 📅 <strong style={{ color: '#38bdf8' }}>{b.dates?.join(', ')}</strong>
                        </p>
                        {b.notes && (
                          <p style={{ margin: '0.3rem 0 0', fontSize: '0.78rem', color: '#cbd5e1', fontStyle: 'italic' }}>
                            Note: "{b.notes}"
                          </p>
                        )}
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        <button
                          className="btn"
                          style={{
                            fontSize: '0.8rem', padding: '0.45rem 1rem',
                            background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                            color: '#ffffff', borderColor: 'transparent',
                            boxShadow: '0 0 12px rgba(79, 70, 229, 0.3)',
                          }}
                          onClick={() => handleAdminApprove(b._id)}
                          disabled={actionLoading === b._id}
                        >
                          {actionLoading === b._id ? 'Approving...' : '🛡 Final Approve'}
                        </button>
                        <button
                          className="btn btn-reject"
                          style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem' }}
                          onClick={() => setRejectTarget({ id: b._id, title: b.listingTitle })}
                          disabled={actionLoading === b._id}
                        >
                          🔴 Reject
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ── Completed / historical bookings ───────────────────── */}
              {pastBookings.length > 0 && (
                <div style={{ marginTop: '1rem', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
                  <h4 style={{ margin: '0 0 0.75rem 0', fontSize: '0.82rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    ✅ Completed & Historical ({pastBookings.length})
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {pastBookings.map((pb) => (
                      <div
                        key={pb._id}
                        style={{
                          padding: '0.75rem 1rem', borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.07)',
                          fontSize: '0.84rem',
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        <div>
                          <span style={{ color: '#f8fafc', fontWeight: 600 }}>{pb.listingTitle}</span>
                          <span style={{ color: '#94a3b8', margin: '0 0.4rem' }}>—</span>
                          <span style={{ color: '#94a3b8' }}>{pb.tenantName}</span>
                          <span style={{ color: '#38bdf8', marginLeft: '0.4rem' }}>({pb.dates?.join(', ')})</span>
                          {pb.rejectedBy && pb.status === 'rejected' && (
                            <span style={{ fontSize: '0.72rem', color: '#94a3b8', marginLeft: '0.5rem' }}>
                              by {pb.rejectedBy}
                              {pb.rejectionReason && ` — "${pb.rejectionReason}"`}
                            </span>
                          )}
                        </div>
                        <span
                          style={{
                            fontWeight: 700, fontSize: '0.78rem', padding: '0.2rem 0.65rem',
                            borderRadius: '12px', whiteSpace: 'nowrap',
                            background: pb.status === 'approved' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                            color:      pb.status === 'approved' ? '#34d399' : '#f87171',
                            border:     `1px solid ${pb.status === 'approved' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(239, 68, 68, 0.3)'}`,
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

          {/* Dismissed History */}
          {showHistory && readIds.length > 0 && (
            <div style={{ marginTop: '1.5rem', borderTop: '1px dashed rgba(255, 255, 255, 0.08)', paddingTop: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 600, color: '#64748b' }}>
                  Dismissed Notifications ({readIds.length})
                </h4>
                <button
                  className="btn"
                  style={{ fontSize: '0.72rem', color: '#38bdf8', background: 'transparent', border: 'none', cursor: 'pointer' }}
                  onClick={() => { setReadIds([]); localStorage.removeItem('rentease_admin_read_bookings'); }}
                >
                  Clear History
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {bookings.filter((b) => readIds.includes(b._id)).map((hb) => (
                  <div
                    key={hb._id}
                    style={{
                      padding: '0.55rem 0.85rem', borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.015)',
                      border: '1px solid rgba(255, 255, 255, 0.04)',
                      fontSize: '0.78rem', color: '#64748b',
                      display: 'flex', justifyContent: 'space-between',
                    }}
                  >
                    <span>{hb.listingTitle} — {hb.tenantName} ({hb.dates?.join(', ')})</span>
                    <span style={{ fontWeight: 600 }}>{hb.status.replace('_', ' ').toUpperCase()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
