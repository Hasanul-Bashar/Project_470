import { useState, useEffect } from 'react';
import { getAdminTrustOverview, adminReviewAppeal, adminSetBlacklist } from '../../services/trustApi';

export default function TrustAppealsQueue({ onAction }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [reviewingAppeal, setReviewingAppeal] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchOverview = async () => {
    try {
      setLoading(true);
      const res = await getAdminTrustOverview();
      setOverview(res.data);
    } catch (err) {
      console.error('Error fetching admin trust overview:', err);
      showToast('Failed to load appeals queue', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleDecision = async (decision) => {
    if (!reviewingAppeal) return;
    try {
      setActionLoading(true);
      await adminReviewAppeal({
        tenantId: reviewingAppeal.tenantId,
        flagId: reviewingAppeal.flagId,
        decision,
        adminNotes: adminNotes.trim(),
      });
      showToast(
        `Appeal ${decision === 'approve' ? 'approved (flag permanently dismissed)' : 'rejected (penalty reinstated)'}!`,
        'success'
      );
      setReviewingAppeal(null);
      setAdminNotes('');
      fetchOverview();
      if (onAction) onAction();
    } catch (err) {
      console.error('Decision error:', err);
      showToast(err.response?.data?.message || 'Failed to submit decision', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRemoveBlacklist = async (tenantId) => {
    if (!confirm('Are you sure you want to remove this tenant from the Blacklist?')) return;
    try {
      await adminSetBlacklist({ tenantId, isBlacklisted: false });
      showToast('Tenant removed from blacklist and trust score recalculated.', 'success');
      fetchOverview();
      if (onAction) onAction();
    } catch (err) {
      console.error('Blacklist error:', err);
      showToast('Failed to update blacklist status', 'error');
    }
  };

  return (
    <div style={{ marginBottom: '2.5rem' }}>
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
        <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
          Loading Trust Appeals & Blacklist status...
        </div>
      ) : (
        <div>
          {/* ── 1. PENDING APPEALS SECTION ──────────────────────────── */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🛡️ Pending Tenant Infraction Appeals</span>
              <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.6rem', borderRadius: '12px', background: 'rgba(56, 189, 248, 0.2)', color: '#38bdf8' }}>
                {overview?.pendingAppeals?.length || 0} Pending
              </span>
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.82rem', color: '#94a3b8' }}>
              Tenants who disputed a landlord infraction flag. While pending, their penalty is provisionally excluded from their Trust Score.
            </p>

            {!overview?.pendingAppeals || overview.pendingAppeals.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', color: '#10b981' }}>
                ✅ No pending tenant appeals to review.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {overview.pendingAppeals.map((appeal) => (
                  <div
                    key={appeal.flagId}
                    style={{
                      background: 'rgba(255, 255, 255, 0.03)',
                      border: '1px solid rgba(56, 189, 248, 0.3)',
                      borderRadius: '12px',
                      padding: '1.25rem',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.75rem' }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <strong style={{ fontSize: '1rem', color: '#f8fafc' }}>{appeal.tenantName}</strong>
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>({appeal.tenantEmail})</span>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '0.15rem 0.5rem', borderRadius: '8px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981' }}>
                            Score: {appeal.currentScore}/100 [{appeal.scoreBand}]
                          </span>
                        </div>
                        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                          Flagged by {appeal.landlordName} on {new Date(appeal.flagDate).toLocaleDateString()} &bull; Appeal submitted on {new Date(appeal.submittedAt).toLocaleDateString()}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#10b981', color: '#fff', fontSize: '0.78rem' }}
                          onClick={() => setReviewingAppeal(appeal)}
                        >
                          ⚖️ Review & Decide
                        </button>
                      </div>
                    </div>

                    <div style={{ background: 'rgba(0, 0, 0, 0.25)', padding: '0.85rem', borderRadius: '8px', marginBottom: '0.5rem' }}>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.3rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase' }}>
                          {appeal.category.replace('_', ' ')} ({appeal.severity.toUpperCase()})
                        </span>
                      </div>
                      <p style={{ margin: 0, fontSize: '0.84rem', color: '#cbd5e1' }}>
                        <strong>Landlord Claim:</strong> {appeal.description}
                      </p>
                    </div>

                    <div style={{ background: 'rgba(56, 189, 248, 0.08)', padding: '0.85rem', borderRadius: '8px', borderLeft: '3px solid #38bdf8' }}>
                      <p style={{ margin: 0, fontSize: '0.84rem', color: '#f8fafc' }}>
                        <strong style={{ color: '#38bdf8' }}>Tenant Dispute Reason:</strong> {appeal.appealReason}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── 2. BLACKLISTED TENANTS SECTION ──────────────────────── */}
          <div>
            <h3 style={{ fontSize: '1.1rem', color: '#f8fafc', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>🚫 Blacklisted Tenants</span>
              <span style={{ fontSize: '0.75rem', padding: '0.15rem 0.6rem', borderRadius: '12px', background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}>
                {overview?.blacklistedTenants?.length || 0} Listed
              </span>
            </h3>

            {!overview?.blacklistedTenants || overview.blacklistedTenants.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '12px', border: '1px solid rgba(255, 255, 255, 0.06)', color: '#94a3b8' }}>
                No tenants currently on the blacklist.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Tenant</th>
                      <th>Email</th>
                      <th>Trust Score</th>
                      <th>Reason</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.blacklistedTenants.map((t) => (
                      <tr key={t.tenantId}>
                        <td><strong>{t.tenantName}</strong></td>
                        <td>{t.tenantEmail || '—'}</td>
                        <td>
                          <span style={{ color: '#ef4444', fontWeight: 700 }}>
                            {t.trustScore}/100 [Blacklisted]
                          </span>
                        </td>
                        <td style={{ fontSize: '0.82rem', color: '#94a3b8' }}>{t.reason || 'Critical infractions'}</td>
                        <td>
                          <button
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: '0.75rem' }}
                            onClick={() => handleRemoveBlacklist(t.tenantId)}
                          >
                            Restore Tenant
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── DECISION MODAL ────────────────────────────────────────── */}
      {reviewingAppeal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
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
              maxWidth: '540px',
              width: '100%',
              boxShadow: '0 20px 50px rgba(0,0,0,0.8)',
            }}
          >
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc' }}>
              ⚖️ Resolve Dispute: {reviewingAppeal.tenantName}
            </h3>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.84rem', color: '#94a3b8' }}>
              Decide whether to uphold the tenant's appeal (permanently dismissing the flag) or reject it (reinstating the penalty).
            </p>

            <div style={{ background: 'rgba(0, 0, 0, 0.3)', padding: '0.85rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.82rem' }}>
              <div><strong>Category:</strong> {reviewingAppeal.category.replace('_', ' ')} ({reviewingAppeal.severity.toUpperCase()})</div>
              <div><strong>Claim:</strong> {reviewingAppeal.description}</div>
              <div style={{ marginTop: '0.3rem', color: '#38bdf8' }}><strong>Tenant Appeal:</strong> {reviewingAppeal.appealReason}</div>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
                Admin Decision Notes (Visible in Audit Trail):
              </label>
              <textarea
                rows={3}
                className="form-input"
                placeholder="Explain the reason for this decision (e.g. verified receipts, landlord evidence, mutual settlement)..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                style={{ width: '100%', resize: 'vertical' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setReviewingAppeal(null)}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  type="button"
                  className="btn"
                  style={{ background: '#ef4444', color: '#fff' }}
                  onClick={() => handleDecision('reject')}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : '❌ Reject (Reinstate Penalty)'}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleDecision('approve')}
                  disabled={actionLoading}
                >
                  {actionLoading ? 'Saving...' : '✅ Approve (Dismiss Flag)'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
