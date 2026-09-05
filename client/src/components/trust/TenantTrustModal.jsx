import { useState, useEffect } from 'react';
import Modal from '../Modal';
import { getTrustScore, submitAppeal } from '../../services/trustApi';

export default function TenantTrustModal({ tenantId, onClose }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appealingFlag, setAppealingFlag] = useState(null);
  const [appealReason, setAppealReason] = useState('');
  const [submittingAppeal, setSubmittingAppeal] = useState(false);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'audit' | 'flags'
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchScore = async () => {
    try {
      setLoading(true);
      const res = await getTrustScore(tenantId || '');
      setProfile(res.data?.profile);
    } catch (err) {
      console.error('Error fetching trust score:', err);
      showToast('Failed to load trust score', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, [tenantId]);

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!appealingFlag || !appealReason.trim()) return;

    try {
      setSubmittingAppeal(true);
      const res = await submitAppeal(appealingFlag._id, appealReason.trim());
      setProfile(res.data?.profile);
      showToast('Appeal submitted! Penalty provisionally excluded pending admin review.', 'success');
      setAppealingFlag(null);
      setAppealReason('');
    } catch (err) {
      console.error('Appeal error:', err);
      showToast(err.response?.data?.message || 'Failed to submit appeal', 'error');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const getBandBadge = (band, isBlacklisted) => {
    if (isBlacklisted || band === 'Blacklisted') {
      return { label: 'Blacklisted', color: '#ef4444', bg: 'rgba(239, 68, 68, 0.15)', icon: '🚫' };
    }
    switch (band) {
      case 'Excellent':
        return { label: 'Excellent Trust', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)', icon: '🟢' };
      case 'Good':
        return { label: 'Good / Verified', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)', icon: '🔵' };
      case 'Fair':
        return { label: 'Fair / Moderate', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', icon: '🟡' };
      case 'Low':
      default:
        return { label: 'Low Trust / Caution', color: '#f97316', bg: 'rgba(249, 115, 22, 0.15)', icon: '🟠' };
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'critical':
        return { color: '#ef4444', bg: 'rgba(239, 68, 68, 0.2)' };
      case 'severe':
        return { color: '#f97316', bg: 'rgba(249, 115, 22, 0.2)' };
      case 'moderate':
        return { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.2)' };
      case 'minor':
      default:
        return { color: '#94a3b8', bg: 'rgba(148, 163, 184, 0.2)' };
    }
  };

  const bandInfo = getBandBadge(profile?.scoreBand, profile?.isBlacklisted);

  return (
    <Modal title="⭐ Tenant Trust Score & Verification Profile" onClose={onClose}>
      <div style={{ padding: '1.25rem', maxHeight: '78vh', overflowY: 'auto' }}>
        {/* Toast Notification */}
        {toast && (
          <div
            style={{
              padding: '0.75rem 1rem',
              borderRadius: '8px',
              marginBottom: '1rem',
              background: toast.type === 'error' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)',
              border: `1px solid ${toast.type === 'error' ? '#ef4444' : '#10b981'}`,
              color: '#f8fafc',
              fontSize: '0.85rem',
            }}
          >
            {toast.message}
          </div>
        )}

        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>
            🔄 Calculating grounded Trust Score & Audit Trail...
          </div>
        ) : !profile ? (
          <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
            Could not load trust profile. Please try again.
          </div>
        ) : (
          <div>
            {/* ── TOP HERO SCORE GAUGE ────────────────────────────────────────── */}
            <div
              style={{
                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.15), rgba(59, 130, 246, 0.1))',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '16px',
                padding: '1.5rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '1.25rem',
                marginBottom: '1.25rem',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                <div
                  style={{
                    width: '88px',
                    height: '88px',
                    borderRadius: '50%',
                    border: `4px solid ${bandInfo.color}`,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'rgba(0, 0, 0, 0.3)',
                    boxShadow: `0 0 20px ${bandInfo.color}33`,
                  }}
                >
                  <span style={{ fontSize: '1.75rem', fontWeight: 800, color: '#f8fafc', lineHeight: 1 }}>
                    {profile.trustScore}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.1rem' }}>/ 100</span>
                </div>

                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <h3 style={{ margin: 0, fontSize: '1.2rem', color: '#f8fafc' }}>{profile.tenantName}</h3>
                    <span
                      style={{
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        padding: '0.2rem 0.6rem',
                        borderRadius: '12px',
                        background: bandInfo.bg,
                        color: bandInfo.color,
                        border: `1px solid ${bandInfo.color}55`,
                      }}
                    >
                      {bandInfo.icon} {bandInfo.label}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>
                    Normalized single-score rating evaluating payment punctuality, landlord reviews & verified flags.
                  </p>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Last recalculated: {new Date(profile.lastCalculatedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              {profile.isBlacklisted && (
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.2)',
                    border: '1px solid #ef4444',
                    padding: '0.6rem 1rem',
                    borderRadius: '8px',
                    color: '#fca5a5',
                    fontSize: '0.8rem',
                  }}
                >
                  ⚠️ <strong>Blacklisted Status Active:</strong> {profile.blacklistReason || 'Critical landlord infraction or low score threshold.'}
                </div>
              )}
            </div>

            {/* ── NAVIGATION TABS ────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255, 255, 255, 0.1)', marginBottom: '1.25rem' }}>
              <button
                className="btn btn-sm"
                onClick={() => setActiveTab('overview')}
                style={{
                  background: activeTab === 'overview' ? 'var(--purple)' : 'transparent',
                  borderBottom: activeTab === 'overview' ? '2px solid var(--accent)' : 'none',
                  color: '#f8fafc',
                }}
              >
                📊 Score Summary
              </button>
              <button
                className="btn btn-sm"
                onClick={() => setActiveTab('flags')}
                style={{
                  background: activeTab === 'flags' ? 'var(--purple)' : 'transparent',
                  borderBottom: activeTab === 'flags' ? '2px solid var(--accent)' : 'none',
                  color: '#f8fafc',
                }}
              >
                🚩 Landlord Flags ({profile.flags?.length || 0})
              </button>
              <button
                className="btn btn-sm"
                onClick={() => setActiveTab('audit')}
                style={{
                  background: activeTab === 'audit' ? 'var(--purple)' : 'transparent',
                  borderBottom: activeTab === 'audit' ? '2px solid var(--accent)' : 'none',
                  color: '#f8fafc',
                }}
              >
                📜 Full Audit Trail ({profile.auditTrail?.length || 0})
              </button>
            </div>

            {/* ── TAB 1: OVERVIEW ────────────────────────────────────────────── */}
            {activeTab === 'overview' && (
              <div>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: '0.85rem',
                    marginBottom: '1.25rem',
                  }}
                >
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Base Starting Score</span>
                    <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1.2rem', color: '#f8fafc' }}>85 pts</h4>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Active Infractions</span>
                    <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1.2rem', color: profile.flags?.some(f => f.status === 'active') ? '#ef4444' : '#10b981' }}>
                      {profile.flags?.filter(f => f.status === 'active').length || 0}
                    </h4>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Appeals in Review</span>
                    <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1.2rem', color: '#38bdf8' }}>
                      {profile.flags?.filter(f => f.appeal?.status === 'pending').length || 0}
                    </h4>
                  </div>
                  <div style={{ background: 'rgba(255, 255, 255, 0.04)', padding: '1rem', borderRadius: '10px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>Time Decay Window</span>
                    <h4 style={{ margin: '0.35rem 0 0 0', fontSize: '1.1rem', color: '#c084fc' }}>180-Day Half-Life</h4>
                  </div>
                </div>

                <div
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    padding: '1rem',
                    borderRadius: '10px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                  }}
                >
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.92rem', color: '#f8fafc' }}>
                    ℹ️ How Your Trust Score is Calculated:
                  </h4>
                  <ul style={{ margin: 0, paddingLeft: '1.2rem', fontSize: '0.82rem', color: '#94a3b8', lineHeight: 1.6 }}>
                    <li><strong>Rent Punctuality:</strong> On-time rent payments reward positive trust credits (+4 pts each). Overdue rents apply penalties.</li>
                    <li><strong>Time-Decay Recency:</strong> Older infractions gradually decay and lose negative impact over time (half-life of 6 months).</li>
                    <li><strong>Landlord Reviews:</strong> High ratings from verified tenancies grant trust bonuses; low reviews trigger penalties.</li>
                    <li><strong>Dispute / Appeal Protection:</strong> If a landlord files an unfair flag, you can file a dispute. While pending admin review, the penalty is <strong>provisionally excluded</strong> from your score!</li>
                  </ul>
                </div>
              </div>
            )}

            {/* ── TAB 2: LANDLORD FLAGS & APPEALS ─────────────────────────────── */}
            {activeTab === 'flags' && (
              <div>
                {!profile.flags || profile.flags.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '2.5rem', color: '#10b981' }}>
                    🎉 No landlord infractions or flags reported! Your record is spotless.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {profile.flags.map((flag) => {
                      const sevBadge = getSeverityBadge(flag.severity);
                      const isPending = flag.appeal?.status === 'pending';
                      const isApproved = flag.appeal?.status === 'approved' || flag.status === 'dismissed_by_admin';
                      const isRejected = flag.appeal?.status === 'rejected';

                      return (
                        <div
                          key={flag._id}
                          style={{
                            background: isPending
                              ? 'rgba(56, 189, 248, 0.06)'
                              : isApproved
                              ? 'rgba(16, 185, 129, 0.06)'
                              : 'rgba(255, 255, 255, 0.04)',
                            border: `1px solid ${isPending ? '#38bdf8' : isApproved ? '#10b981' : 'rgba(255, 255, 255, 0.1)'}`,
                            borderRadius: '12px',
                            padding: '1rem',
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.5rem' }}>
                            <div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontWeight: 700, fontSize: '0.95rem', color: '#f8fafc' }}>
                                  {flag.category.replace('_', ' ').toUpperCase()}
                                </span>
                                <span
                                  style={{
                                    fontSize: '0.7rem',
                                    fontWeight: 700,
                                    padding: '0.15rem 0.5rem',
                                    borderRadius: '8px',
                                    background: sevBadge.bg,
                                    color: sevBadge.color,
                                  }}
                                >
                                  {flag.severity.toUpperCase()}
                                </span>
                              </div>
                              <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                                Reported by {flag.landlordName} on {flag.listingTitle} &bull; {new Date(flag.createdAt).toLocaleDateString()}
                              </span>
                            </div>

                            {/* Appeal Status Banner */}
                            <div>
                              {isPending ? (
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', padding: '0.2rem 0.6rem', borderRadius: '10px', background: 'rgba(56, 189, 248, 0.15)' }}>
                                  ⏳ Appeal Pending Review (Penalty Excluded)
                                </span>
                              ) : isApproved ? (
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#10b981', padding: '0.2rem 0.6rem', borderRadius: '10px', background: 'rgba(16, 185, 129, 0.15)' }}>
                                  ✅ Appeal Approved (Dismissed)
                                </span>
                              ) : isRejected ? (
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#ef4444', padding: '0.2rem 0.6rem', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.15)' }}>
                                  ❌ Appeal Rejected by Admin
                                </span>
                              ) : (
                                <button
                                  className="btn btn-sm"
                                  style={{ background: 'rgba(139, 92, 246, 0.25)', border: '1px solid var(--purple)', color: '#c084fc', fontSize: '0.75rem' }}
                                  onClick={() => {
                                    setAppealingFlag(flag);
                                    setAppealReason('');
                                  }}
                                >
                                  🛡️ Dispute / Appeal Flag
                                </button>
                              )}
                            </div>
                          </div>

                          <p style={{ margin: '0.35rem 0 0.5rem 0', fontSize: '0.86rem', color: '#cbd5e1' }}>
                            {flag.description}
                          </p>

                          {flag.appeal?.reason && (
                            <div
                              style={{
                                marginTop: '0.5rem',
                                padding: '0.6rem 0.8rem',
                                borderRadius: '8px',
                                background: 'rgba(0, 0, 0, 0.3)',
                                borderLeft: '3px solid #38bdf8',
                                fontSize: '0.8rem',
                              }}
                            >
                              <strong style={{ color: '#38bdf8' }}>Your Appeal Reason:</strong> {flag.appeal.reason}
                              {flag.appeal.adminNotes && (
                                <div style={{ marginTop: '0.3rem', color: '#94a3b8' }}>
                                  <strong>Admin Decision Note:</strong> {flag.appeal.adminNotes}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ── TAB 3: FULL AUDIT TRAIL ─────────────────────────────────────── */}
            {activeTab === 'audit' && (
              <div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {profile.auditTrail?.map((entry, idx) => {
                    const isPositive = entry.pointsChange > 0;
                    const isZero = entry.pointsChange === 0;

                    return (
                      <div
                        key={entry._id || idx}
                        style={{
                          padding: '0.75rem 1rem',
                          borderRadius: '10px',
                          background: 'rgba(255, 255, 255, 0.03)',
                          border: '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          gap: '1rem',
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#c084fc', textTransform: 'uppercase' }}>
                              [{entry.factor.replace('_', ' ')}]
                            </span>
                            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                              {new Date(entry.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.84rem', color: '#f8fafc' }}>
                            {entry.reason}
                          </p>
                          {entry.decayFactor < 1.0 && (
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                              Recency weight: {(entry.decayFactor * 100).toFixed(0)}%
                            </span>
                          )}
                        </div>

                        <div style={{ textAlign: 'right', minWidth: '70px' }}>
                          <span
                            style={{
                              fontSize: '1rem',
                              fontWeight: 800,
                              color: isPositive ? '#10b981' : isZero ? '#38bdf8' : '#ef4444',
                            }}
                          >
                            {isPositive ? `+${entry.pointsChange}` : entry.pointsChange === 0 ? '0' : entry.pointsChange}
                          </span>
                          <span style={{ display: 'block', fontSize: '0.68rem', color: '#64748b' }}>pts</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── DISPUTE / APPEAL SUBMISSION FORM MODAL ───────────────────────── */}
        {appealingFlag && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.75)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 10000,
              padding: '1rem',
            }}
          >
            <div
              style={{
                background: '#131b2e',
                border: '1px solid var(--purple)',
                borderRadius: '16px',
                padding: '1.5rem',
                maxWidth: '520px',
                width: '100%',
                boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
              }}
            >
              <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
                🛡️ Dispute Infraction Flag
              </h3>
              <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#94a3b8' }}>
                Disputing flag for <strong>{appealingFlag.category.replace('_', ' ')}</strong>. Once submitted,
                this infraction penalty is <strong>provisionally excluded</strong> from your Trust Score while under review by an administrator.
              </p>

              <form onSubmit={handleAppealSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                    Reason for Dispute / Evidence:
                  </label>
                  <textarea
                    rows={4}
                    className="form-input"
                    placeholder="Provide a detailed factual explanation of why this flag was mistaken, adjusted, or unjustified..."
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                    required
                    style={{ width: '100%', resize: 'vertical' }}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setAppealingFlag(null)}
                    disabled={submittingAppeal}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={submittingAppeal || !appealReason.trim()}
                  >
                    {submittingAppeal ? 'Submitting Dispute...' : 'Submit Appeal 🚀'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
