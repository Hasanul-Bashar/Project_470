import { useState, useEffect, useCallback } from 'react';
import { getAllComplaints } from '../../services/complaintsApi';
import DisputeDetailModal from './DisputeDetailModal';

const TABS = ['All', 'Pending', 'In Review', 'Resolved'];

/** Coloured pill badge */
function StatusBadge({ status }) {
  const classMap = {
    'Pending':   'badge-pending',
    'In Review': 'badge-review',
    'Resolved':  'badge-resolved',
  };
  return <span className={`badge ${classMap[status] ?? ''}`}>{status}</span>;
}

/**
 * DisputeTable — admin-only complaints management panel.
 *   - Status filter tabs: All | Pending | In Review | Resolved
 *   - Table with submitter name/email, related listing title, status badge, and date
 *   - "View" button opens DisputeDetailModal (no dead links to /users/:id or /listings/:id)
 *   - After admin updates a complaint, the row updates in-place without a full refetch
 */
export default function DisputeTable() {
  const [complaints,        setComplaints]        = useState([]);
  const [loading,           setLoading]           = useState(true);
  const [activeTab,         setActiveTab]         = useState('All');
  const [selectedComplaint, setSelectedComplaint] = useState(null);

  const fetchComplaints = useCallback(async (tab) => {
    setLoading(true);
    try {
      const statusParam = tab === 'All' ? '' : tab;
      const res = await getAllComplaints(statusParam);
      setComplaints(res.data);
    } catch (err) {
      console.error('Failed to load complaints:', err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // Refetch when tab changes
  useEffect(() => { fetchComplaints(activeTab); }, [activeTab, fetchComplaints]);

  /** Called by DisputeDetailModal after a successful save */
  const handleUpdated = (updatedComplaint) => {
    setComplaints((prev) =>
      prev.map((c) => (c._id === updatedComplaint._id ? updatedComplaint : c))
    );
  };

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">📣 Complaints & Disputes</span>
          <span className="panel-badge" id="complaint-count">{complaints.length} records</span>
        </div>

        {/* Status filter tabs */}
        <div className="filter-tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              id={`filter-tab-${tab.toLowerCase().replace(' ', '-')}`}
              className={`filter-tab${activeTab === tab ? ' active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state"><div className="spinner" /></div>
          ) : complaints.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">📭</div>
              <div className="empty-state-text">
                No complaints found{activeTab !== 'All' ? ` with status "${activeTab}"` : ''}
              </div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Submitted By</th>
                  <th>Related Listing</th>
                  <th>Status</th>
                  <th>Filed On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {complaints.map((c) => (
                  <tr key={c._id}>
                    <td>
                      <strong
                        style={{
                          display: 'block', maxWidth: '220px',
                          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                        }}
                        title={c.title}
                      >
                        {c.title}
                      </strong>
                    </td>
                    <td>
                      <span>{c.submittedBy?.firstName} {c.submittedBy?.lastName}</span>
                      <span className="td-sub">{c.submittedBy?.email}</span>
                    </td>
                    <td>
                      {c.relatedListingId ? (
                        <span style={{ color: 'var(--teal)', fontSize: '.83rem' }}>
                          {c.relatedListingId.title}
                        </span>
                      ) : (
                        <span style={{ color: 'var(--t3)', fontSize: '.82rem' }}>—</span>
                      )}
                    </td>
                    <td><StatusBadge status={c.status} /></td>
                    <td>
                      <span style={{ color: 'var(--t3)', fontSize: '.82rem' }}>
                        {new Date(c.createdAt).toLocaleDateString('en-GB', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                      </span>
                    </td>
                    <td>
                      <button
                        id={`view-complaint-${c._id}`}
                        className="btn btn-view"
                        onClick={() => setSelectedComplaint(c)}
                      >
                        👁 View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Detail modal — opens inline, no /complaints/:id route needed */}
      {selectedComplaint && (
        <DisputeDetailModal
          complaint={selectedComplaint}
          onClose={() => setSelectedComplaint(null)}
          onUpdated={handleUpdated}
        />
      )}
    </>
  );
}
