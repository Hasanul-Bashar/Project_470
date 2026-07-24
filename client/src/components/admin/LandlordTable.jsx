import { useState, useEffect } from 'react';
import { getPendingLandlords, verifyLandlord } from '../../services/adminApi';

/**
 * LandlordTable — shows all landlords with isVerified: false.
 * Admin can Approve (sets isVerified: true, verificationStatus: 'approved')
 * or Reject (keeps account, sets verificationStatus: 'rejected').
 * On action: row animates out, then is removed from state, and onAction()
 * is called so the parent can refresh the stat cards.
 */
export default function LandlordTable({ onAction }) {
  const [landlords, setLandlords] = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [actionId,  setActionId]  = useState(null);   // ID currently being actioned
  const [exitIds,   setExitIds]   = useState(new Set()); // IDs playing exit animation

  useEffect(() => {
    getPendingLandlords()
      .then((res) => setLandlords(res.data))
      .catch((err) => console.error('Failed to load landlords:', err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id, action) => {
    setActionId(id);
    try {
      await verifyLandlord(id, action);
      // Trigger row exit animation
      setExitIds((prev) => new Set([...prev, id]));
      // Remove row after animation completes
      setTimeout(() => {
        setLandlords((prev) => prev.filter((l) => l._id !== id));
        setExitIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        if (onAction) onAction(); // tell parent to refresh stat cards
      }, 380);
    } catch (err) {
      alert(`Action failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionId(null);
    }
  };

  return (
    <div className="panel">
      <div className="panel-header">
        <span className="panel-title">🏢 Landlord Verification Queue</span>
        <span className="panel-badge" id="landlord-count">{landlords.length} pending</span>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="loading-state"><div className="spinner" /></div>
        ) : landlords.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">✅</div>
            <div className="empty-state-text">All landlords have been verified</div>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Registered</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {landlords.map((landlord) => (
                <tr
                  key={landlord._id}
                  className={exitIds.has(landlord._id) ? 'table-row-exit' : ''}
                >
                  <td>
                    <strong>{landlord.firstName} {landlord.lastName}</strong>
                  </td>
                  <td>
                    <span style={{ color: 'var(--t2)' }}>{landlord.email}</span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--t3)', fontSize: '.82rem' }}>
                      {new Date(landlord.createdAt).toLocaleDateString('en-GB', {
                        day: 'numeric', month: 'short', year: 'numeric',
                      })}
                    </span>
                  </td>
                  <td>
                    <div className="btn-actions">
                      <button
                        id={`approve-landlord-${landlord._id}`}
                        className="btn btn-approve"
                        onClick={() => handleAction(landlord._id, 'approve')}
                        disabled={actionId === landlord._id}
                      >
                        ✓ Approve
                      </button>
                      <button
                        id={`reject-landlord-${landlord._id}`}
                        className="btn btn-reject"
                        onClick={() => handleAction(landlord._id, 'reject')}
                        disabled={actionId === landlord._id}
                      >
                        ✕ Reject
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
