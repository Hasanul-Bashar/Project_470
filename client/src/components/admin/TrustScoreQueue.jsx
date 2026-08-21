import { useState, useEffect } from 'react';
import { getAdminTrustScoreQueue, reviewAppeal } from '../../services/trustScoreApi';

export default function TrustScoreQueue({ onAction }) {
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [reviewingFlag, setReviewingFlag] = useState(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchQueue = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getAdminTrustScoreQueue();
      setQueue(res.data);
    } catch (err) {
      console.error('Error fetching trust score queue:', err);
      setError('Failed to load trust score queue.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleDecision = async (decision) => {
    if (!reviewingFlag) return;
    try {
      setSubmitting(true);
      await reviewAppeal({
        tenantId: reviewingFlag.tenantId,
        flagId: reviewingFlag.flag._id,
        decision, // 'approve' | 'reject'
        adminNotes,
      });
      alert(`Appeal decision (${decision.toUpperCase()}) submitted!`);
      setReviewingFlag(null);
      setAdminNotes('');
      fetchQueue();
      if (onAction) onAction();
    } catch (err) {
      alert('Failed to submit appeal decision');
    } finally {
      setSubmitting(false);
    }
  };

  // Extract all flags under appeal
  const appealedFlags = [];
  queue.forEach((tenantDoc) => {
    if (tenantDoc.flags) {
      tenantDoc.flags.forEach((f) => {
        if (f.status === 'appealed' || f.isAppealed) {
          appealedFlags.push({ tenantDoc, flag: f });
        }
      });
    }
  });

  return (
    <div
      className="panel"
      style={{
        marginBottom: '2.5rem',
        border: '1px solid rgba(239, 68, 68, 0.3)',
        borderTop: '3px solid var(--red)',
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
            🛑 Tenant Blacklist & Trust Appeals Queue
            <span
              style={{
                fontSize: '0.75rem',
                background: 'rgba(239, 68, 68, 0.15)',
                color: '#f87171',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                padding: '0.2rem 0.6rem',
                borderRadius: '12px',
              }}
            >
              {appealedFlags.length} Appeals Pending
            </span>
          </h3>
          <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
            Review tenant flag appeals. Approving dismisses the flag; rejecting reinstates penalty score deduction.
          </p>
        </div>
        <button className="btn btn-secondary" style={{ fontSize: '0.78rem' }} onClick={fetchQueue}>
          🔄 Refresh Queue
        </button>
      </div>

      <div style={{ padding: '1.25rem 1.5rem' }}>
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p className="empty-state-text">Loading queue...</p>
          </div>
        ) : error ? (
          <p className="empty-state-text" style={{ color: '#ef4444' }}>{error}</p>
        ) : appealedFlags.length === 0 ? (
          <p style={{ color: '#94a3b8', fontSize: '0.88rem', margin: 0, textAlign: 'center' }}>
            ✨ No pending tenant flag appeals awaiting admin review.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            {appealedFlags.map(({ tenantDoc, flag }) => (
              <div
                key={flag._id}
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
                      Tenant: {tenantDoc.tenantName} ({tenantDoc.tenantEmail})
                    </h4>
                    <span style={{ fontSize: '0.75rem', background: 'rgba(245, 158, 11, 0.15)', color: '#fbbf24', padding: '0.15rem 0.6rem', borderRadius: '10px' }}>
                      Current Score: {tenantDoc.score}/100 ({tenantDoc.band})
                    </span>
                  </div>

                  <p style={{ margin: 0, fontSize: '0.84rem', color: '#94a3b8' }}>
                    Landlord Flag Reason: "<strong style={{ color: '#f8fafc' }}>{flag.reason}</strong>" ({flag.severity.toUpperCase()} severity)
                  </p>

                  <p style={{ margin: '0.35rem 0 0 0', fontSize: '0.82rem', color: '#38bdf8', fontStyle: 'italic' }}>
                    Tenant Appeal Reason: "{flag.appealReason}"
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button
                    className="btn btn-primary"
                    style={{ fontSize: '0.8rem', padding: '0.45rem 0.9rem', background: '#10b981', borderColor: '#10b981' }}
                    onClick={() => setReviewingFlag({ tenantId: tenantDoc.tenantId, flag })}
                  >
                    ⚖️ Review & Decide
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for Admin Decision */}
      {reviewingFlag && (
        <div className="modal-overlay">
          <div className="modal-box" style={{ maxWidth: '520px', padding: '1.5rem', background: '#0d1425', color: '#f8fafc' }}>
            <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.1rem', fontWeight: 700 }}>
              ⚖️ Review Appeal: {reviewingFlag.flag.reason}
            </h3>
            <p style={{ fontSize: '0.85rem', color: '#94a3b8', marginBottom: '1rem' }}>
              Tenant Appeal Reason: "{reviewingFlag.flag.appealReason}"
            </p>

            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label className="form-label" style={{ color: '#cbd5e1' }}>Admin Decision Notes (Optional)</label>
              <textarea
                className="form-textarea"
                rows={3}
                placeholder="Explain the justification for approving or rejecting this appeal..."
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button className="btn btn-secondary" onClick={() => setReviewingFlag(null)}>
                Cancel
              </button>
              <button
                className="btn btn-reject"
                onClick={() => handleDecision('reject')}
                disabled={submitting}
              >
                🔴 Reject Appeal (Uphold Flag)
              </button>
              <button
                className="btn btn-primary"
                style={{ background: '#10b981' }}
                onClick={() => handleDecision('approve')}
                disabled={submitting}
              >
                🟢 Approve Appeal (Dismiss Flag)
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
