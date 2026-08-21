import { useState, useEffect } from 'react';
import Modal from '../Modal';
import { getTenantTrustScore, appealFlag } from '../../services/trustScoreApi';

export default function TrustScoreModal({ tenantId, onClose }) {
  const [trustData, setTrustData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [appealingFlagId, setAppealingFlagId] = useState(null);
  const [appealReason, setAppealReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchScore = async () => {
    try {
      setLoading(true);
      const res = await getTenantTrustScore(tenantId || '');
      setTrustData(res.data);
    } catch (err) {
      console.error('Error fetching trust score:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScore();
  }, [tenantId]);

  const handleAppealSubmit = async (e) => {
    e.preventDefault();
    if (!appealReason.trim() || !appealingFlagId) return;

    try {
      setSubmitting(true);
      await appealFlag({
        tenantId: trustData.tenantId,
        flagId: appealingFlagId,
        appealReason,
      });
      alert('Appeal submitted successfully! Flag is provisionally excluded pending admin review.');
      setAppealingFlagId(null);
      setAppealReason('');
      fetchScore();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to submit appeal');
    } finally {
      setSubmitting(false);
    }
  };

  const getBandColor = (band) => {
    switch (band) {
      case 'Excellent': return '#34d399';
      case 'Good': return '#60a5fa';
      case 'Fair': return '#fbbf24';
      case 'At Risk': return '#f97316';
      case 'Blacklisted': return '#f87171';
      default: return '#34d399';
    }
  };

  return (
    <Modal title="🛡 Tenant Trust Score & Audit Profile" onClose={onClose}>
      <div style={{ padding: '1rem', maxHeight: '78vh', overflowY: 'auto' }}>
        {loading ? (
          <p style={{ textAlign: 'center', color: '#94a3b8' }}>Loading trust score profile...</p>
        ) : !trustData ? (
          <p style={{ textAlign: 'center', color: '#ef4444' }}>Failed to load trust score.</p>
        ) : (
          <div>
            {/* Score & Band Header */}
            <div
              style={{
                padding: '1.25rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.03)',
                border: `2px solid ${getBandColor(trustData.band)}`,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '1.5rem',
              }}
            >
              <div>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Tenant Trust Rating
                </span>
                <h2 style={{ margin: '0.2rem 0', fontSize: '1.8rem', color: getBandColor(trustData.band) }}>
                  {trustData.score} <span style={{ fontSize: '1.1rem', color: '#94a3b8' }}>/ 100</span>
                </h2>
                <p style={{ margin: 0, fontSize: '0.88rem', color: '#f8fafc', fontWeight: 600 }}>
                  Band Status: <span style={{ color: getBandColor(trustData.band) }}>{trustData.band}</span>
                  {trustData.isBlacklisted && <span style={{ color: '#ef4444', marginLeft: '0.5rem' }}>🛑 BLACKLISTED</span>}
                </p>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>Tenant Profile</span>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.95rem', fontWeight: 700, color: '#f8fafc' }}>
                  {trustData.tenantName}
                </p>
                <span style={{ fontSize: '0.8rem', color: '#64748b' }}>{trustData.tenantEmail}</span>
              </div>
            </div>

            {/* Landlord Flags Section */}
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#f8fafc', fontSize: '0.95rem', fontWeight: 700 }}>
                🚩 Landlord Flags ({trustData.flags ? trustData.flags.length : 0})
              </h4>

              {!trustData.flags || trustData.flags.length === 0 ? (
                <p style={{ fontSize: '0.84rem', color: '#94a3b8', background: 'rgba(255, 255, 255, 0.02)', padding: '0.75rem', borderRadius: '8px' }}>
                  ✨ Clean record! No landlord flags recorded against your profile.
                </p>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                  {trustData.flags.map((f) => (
                    <div
                      key={f._id}
                      style={{
                        padding: '0.85rem 1rem',
                        borderRadius: '10px',
                        background: f.isProvisionallyExcluded ? 'rgba(59, 130, 246, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                        border: `1px solid ${f.isProvisionallyExcluded ? 'rgba(59, 130, 246, 0.25)' : 'rgba(239, 68, 68, 0.25)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#f8fafc' }}>
                          Reason: "{f.reason}"
                        </span>
                        <span
                          style={{
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            padding: '0.15rem 0.5rem',
                            borderRadius: '10px',
                            background: f.severity === 'critical' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(245, 158, 11, 0.2)',
                            color: f.severity === 'critical' ? '#f87171' : '#fbbf24',
                          }}
                        >
                          {f.severity.toUpperCase()} SEVERITY
                        </span>
                      </div>

                      <p style={{ margin: '0.2rem 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                        Flagged by: {f.landlordName} | Date: {new Date(f.date).toLocaleDateString()}
                      </p>

                      {/* Status Badges & Appeal Actions */}
                      <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        {f.isProvisionallyExcluded ? (
                          <span style={{ fontSize: '0.78rem', color: '#60a5fa', fontWeight: 600 }}>
                            🔵 Appeal Pending: Provisionally Excluded (0 Impact)
                          </span>
                        ) : f.status === 'dismissed' ? (
                          <span style={{ fontSize: '0.78rem', color: '#34d399', fontWeight: 600 }}>
                            🟢 Flag Dismissed by Admin
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.78rem', color: '#f87171', fontWeight: 600 }}>
                            🔴 Active Flag (Penalty Applied)
                          </span>
                        )}

                        {!f.isAppealed && f.status === 'active' && (
                          <button
                            className="btn btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.25rem 0.65rem' }}
                            onClick={() => setAppealingFlagId(f._id)}
                          >
                            📩 Appeal Flag
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Appeal Form Modal if Appealing */}
            {appealingFlagId && (
              <form onSubmit={handleAppealSubmit} style={{ background: 'rgba(0,0,0,0.3)', padding: '1rem', borderRadius: '10px', marginBottom: '1.5rem', border: '1px solid #4f46e5' }}>
                <h4 style={{ margin: '0 0 0.5rem 0', color: '#818cf8', fontSize: '0.9rem' }}>
                  📩 Dispute / Appeal Flag Entry
                </h4>
                <p style={{ margin: '0 0 0.75rem 0', fontSize: '0.8rem', color: '#94a3b8' }}>
                  Submitting an appeal provisionally excludes the flag penalty from your trust score while admin reviews it!
                </p>
                <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                  <label className="form-label">Reason for Dispute / Counter-Evidence *</label>
                  <textarea
                    className="form-textarea"
                    rows={3}
                    required
                    placeholder="Provide details or evidence why this flag is inaccurate..."
                    value={appealReason}
                    onChange={(e) => setAppealReason(e.target.value)}
                  />
                </div>
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button type="button" className="btn btn-secondary" style={{ fontSize: '0.78rem' }} onClick={() => setAppealingFlagId(null)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary" style={{ fontSize: '0.78rem' }} disabled={submitting}>
                    {submitting ? 'Submitting...' : 'Submit Appeal'}
                  </button>
                </div>
              </form>
            )}

            {/* Audit Log Section */}
            <div>
              <h4 style={{ margin: '0 0 0.75rem 0', color: '#f8fafc', fontSize: '0.95rem', fontWeight: 700 }}>
                📜 Audit Trail & Score Calculation Log ({trustData.auditTrail ? trustData.auditTrail.length : 0})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                {trustData.auditTrail && trustData.auditTrail.map((log, idx) => (
                  <div
                    key={log._id || idx}
                    style={{
                      padding: '0.55rem 0.85rem',
                      borderRadius: '8px',
                      background: 'rgba(255, 255, 255, 0.02)',
                      border: '1px solid rgba(255, 255, 255, 0.05)',
                      fontSize: '0.78rem',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <span>
                      <strong style={{ color: '#c084fc' }}>[{log.action}]</strong> {log.reason}
                    </span>
                    <span style={{ fontWeight: 700, color: log.deltaScore >= 0 ? '#34d399' : '#f87171' }}>
                      {log.deltaScore > 0 ? `+${log.deltaScore}` : log.deltaScore} pts ({log.newScore})
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
