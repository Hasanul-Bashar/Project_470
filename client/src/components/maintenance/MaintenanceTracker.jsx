import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getMaintenanceRequests,
  createMaintenanceRequest,
  updateMaintenanceStage,
  deleteMaintenanceRequest,
} from '../../services/maintenanceApi';

const CATEGORIES = [
  { name: 'Plumbing', icon: '🚰' },
  { name: 'Electrical', icon: '⚡' },
  { name: 'HVAC / AC', icon: '❄️' },
  { name: 'Appliance', icon: '🍳' },
  { name: 'Structural / Lock', icon: '🔑' },
  { name: 'Pest Control', icon: '🐛' },
  { name: 'General', icon: '🛠' },
];

const STAGES = ['Submitted', 'Acknowledged', 'In Progress', 'Scheduled', 'Resolved'];

const SAMPLE_PHOTOS = [
  { label: 'Leaky Pipe / Water Spill', url: 'https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=600&auto=format&fit=crop' },
  { label: 'Air Conditioner Malfunction', url: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=600&auto=format&fit=crop' },
  { label: 'Electrical Wiring / Socket Issue', url: 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?w=600&auto=format&fit=crop' },
  { label: 'Door Lock / Key Repair', url: 'https://images.unsplash.com/photo-1558002038-1055907df827?w=600&auto=format&fit=crop' },
];

export default function MaintenanceTracker() {
  const { user } = useAuth();
  const isLandlord = user?.role === 'landlord';
  const isAdmin = user?.role === 'admin';
  const canManage = isLandlord; // Exclusively Landlords manage maintenance repair stages

  const [requests, setRequests] = useState([]);
  const [summary, setSummary] = useState({
    total: 0,
    submittedCount: 0,
    acknowledgedCount: 0,
    inProgressCount: 0,
    scheduledCount: 0,
    resolvedCount: 0,
    emergencyCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [urgencyFilter, setUrgencyFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // New Request Modal (Tenant)
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [newRequestData, setNewRequestData] = useState({
    listingTitle: '',
    category: 'Plumbing',
    title: '',
    description: '',
    urgency: 'Medium',
    photoUrl: SAMPLE_PHOTOS[0].url,
  });

  // Stage Update Modal (Landlord)
  const [activeRequest, setActiveRequest] = useState(null);
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false);
  const [stageFormData, setStageFormData] = useState({
    status: 'Submitted',
    landlordNotes: '',
    scheduledDate: '',
    cost: '',
    note: '',
  });

  // History Timeline Modal
  const [timelineRequest, setTimelineRequest] = useState(null);

  const fetchRequests = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (categoryFilter !== 'all') params.category = categoryFilter;
      if (urgencyFilter !== 'all') params.urgency = urgencyFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await getMaintenanceRequests(params);
      setRequests(res.data.requests || []);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching maintenance requests:', err);
      setError('Failed to load maintenance requests.');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, categoryFilter, urgencyFilter, searchQuery]);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const handleOpenNewModal = () => {
    setNewRequestData({
      listingTitle: '',
      category: 'Plumbing',
      title: '',
      description: '',
      urgency: 'Medium',
      photoUrl: SAMPLE_PHOTOS[0].url,
    });
    setIsNewModalOpen(true);
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      await createMaintenanceRequest(newRequestData);
      setSuccessMsg('Maintenance request submitted successfully!');
      setIsNewModalOpen(false);
      fetchRequests();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error submitting maintenance request');
    }
  };

  const handleOpenUpdateModal = (item) => {
    setActiveRequest(item);
    setStageFormData({
      status: item.status,
      landlordNotes: item.landlordNotes || '',
      scheduledDate: item.scheduledDate ? new Date(item.scheduledDate).toISOString().slice(0, 10) : '',
      cost: item.cost || '',
      note: '',
    });
    setIsUpdateModalOpen(true);
  };

  const handleUpdateStageSubmit = async (e) => {
    e.preventDefault();
    if (!activeRequest) return;
    try {
      await updateMaintenanceStage(activeRequest._id, stageFormData);
      setSuccessMsg(`Request stage updated to '${stageFormData.status}'`);
      setIsUpdateModalOpen(false);
      fetchRequests();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error updating stage');
    }
  };

  const handleQuickAcknowledge = async (item) => {
    try {
      await updateMaintenanceStage(item._id, {
        status: 'Acknowledged',
        note: 'Landlord acknowledged preliminary submitted ticket.',
      });
      setSuccessMsg(`Issue '${item.title}' acknowledged by Landlord.`);
      fetchRequests();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error acknowledging request');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this maintenance request?')) return;
    try {
      await deleteMaintenanceRequest(id);
      setSuccessMsg('Request deleted successfully');
      fetchRequests();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to delete request');
    }
  };

  const getCategoryIcon = (catName) => {
    const cat = CATEGORIES.find((c) => c.name === catName);
    return cat ? cat.icon : '🛠';
  };

  const getUrgencyBadge = (urg) => {
    switch (urg) {
      case 'Emergency':
        return (
          <span className="badge" style={{ background: '#ef4444', color: '#fff', fontWeight: 700, animation: 'pulse 1.5s infinite' }}>
            🔴 Emergency
          </span>
        );
      case 'High':
        return <span className="badge" style={{ background: '#f9731622', color: '#f97316', border: '1px solid #f9731644' }}>🟠 High</span>;
      case 'Medium':
        return <span className="badge" style={{ background: '#eab30822', color: '#eab308', border: '1px solid #eab30844' }}>🟡 Medium</span>;
      default:
        return <span className="badge" style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}>🟢 Low</span>;
    }
  };

  const getStatusBadge = (st) => {
    switch (st) {
      case 'Submitted':
        return (
          <span
            className="badge"
            style={{
              background: 'rgba(59, 130, 246, 0.15)',
              color: '#60a5fa',
              border: '1px solid rgba(59, 130, 246, 0.35)',
              fontWeight: 700,
              fontSize: '0.78rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '8px',
            }}
          >
            📩 Submitted (Preliminary)
          </span>
        );
      case 'Acknowledged':
        return (
          <span
            className="badge"
            style={{
              background: 'rgba(139, 92, 246, 0.15)',
              color: '#a78bfa',
              border: '1px solid rgba(139, 92, 246, 0.35)',
              fontWeight: 600,
              fontSize: '0.78rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '8px',
            }}
          >
            👁️ Acknowledged
          </span>
        );
      case 'In Progress':
        return (
          <span
            className="badge"
            style={{
              background: 'rgba(234, 179, 8, 0.15)',
              color: '#facc15',
              border: '1px solid rgba(234, 179, 8, 0.35)',
              fontWeight: 600,
              fontSize: '0.78rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '8px',
            }}
          >
            🛠️ In Progress
          </span>
        );
      case 'Scheduled':
        return (
          <span
            className="badge"
            style={{
              background: 'rgba(6, 182, 212, 0.15)',
              color: '#38bdf8',
              border: '1px solid rgba(6, 182, 212, 0.35)',
              fontWeight: 600,
              fontSize: '0.78rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '8px',
            }}
          >
            📅 Scheduled
          </span>
        );
      case 'Resolved':
        return (
          <span
            className="badge"
            style={{
              background: 'rgba(16, 185, 129, 0.15)',
              color: '#34d399',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              fontWeight: 700,
              fontSize: '0.78rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '8px',
            }}
          >
            ✅ Resolved
          </span>
        );
      case 'Cancelled':
        return (
          <span
            className="badge"
            style={{
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#f87171',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              fontWeight: 600,
              fontSize: '0.78rem',
              padding: '0.2rem 0.6rem',
              borderRadius: '8px',
            }}
          >
            ❌ Cancelled
          </span>
        );
      default:
        return <span className="badge">{st}</span>;
    }
  };

  return (
    <div className="maintenance-tracker-container" style={{ marginTop: '1.5rem' }}>
      {/* Notifications */}
      {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}
      {error && <div className="alert alert-danger">⚠️ {error}</div>}
      {isAdmin && (
        <div className="alert alert-info" style={{ background: 'rgba(59, 130, 246, 0.15)', borderColor: '#3b82f6', color: '#93c5fd', marginBottom: '1.5rem' }}>
          🛡️ <strong>Admin Monitoring Mode (Read-Only):</strong> Maintenance ticket repair stage updates and scheduling are managed exclusively by the assigned Landlord.
        </div>
      )}

      {/* ── KPI Summary Cards ───────────────────────────────── */}
      <div className="rent-stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Submitted Tickets</span>
            <span style={{ fontSize: '1.4rem' }}>📩</span>
          </div>
          <div className="stat-card-value" style={{ color: '#3b82f6' }}>
            {summary.submittedCount}
          </div>
          <div className="stat-card-sub">Awaiting landlord acknowledgment</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #8b5cf6' }}>
          <div className="stat-card-header">
            <span className="stat-card-title">In Progress / Scheduled</span>
            <span style={{ fontSize: '1.4rem' }}>🛠️</span>
          </div>
          <div className="stat-card-value" style={{ color: '#8b5cf6' }}>
            {summary.inProgressCount + summary.scheduledCount}
          </div>
          <div className="stat-card-sub">{summary.acknowledgedCount} acknowledged</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Resolved Issues</span>
            <span style={{ fontSize: '1.4rem' }}>✅</span>
          </div>
          <div className="stat-card-value" style={{ color: '#10b981' }}>
            {summary.resolvedCount}
          </div>
          <div className="stat-card-sub">Successfully fixed</div>
        </div>

        <div className="stat-card" style={{
          borderLeft: '4px solid #ef4444',
          background: summary.emergencyCount > 0 ? 'rgba(239, 68, 68, 0.06)' : 'inherit'
        }}>
          <div className="stat-card-header">
            <span className="stat-card-title" style={{ color: summary.emergencyCount > 0 ? '#ef4444' : 'inherit' }}>
              Emergency Alerts
            </span>
            <span style={{ fontSize: '1.4rem' }}>🚨</span>
          </div>
          <div className="stat-card-value" style={{ color: '#ef4444' }}>
            {summary.emergencyCount}
          </div>
          <div className="stat-card-sub" style={{ color: '#ef4444', fontWeight: 600 }}>
            High priority active issues
          </div>
        </div>
      </div>

      {/* ── Filter Controls & Action Bar ───────────────────── */}
      <div className="maintenance-controls-bar" style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '1rem',
        justifyContent: 'space-between',
        alignItems: 'center',
        background: 'var(--card-bg, #181920)',
        padding: '1.2rem',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', alignItems: 'center' }}>
          {/* Search Box */}
          <input
            type="text"
            className="input"
            placeholder="🔍 Search ticket title, issue..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '220px' }}
          />

          {/* Category Filter */}
          <select
            className="input"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="all">All Categories</option>
            {CATEGORIES.map((c) => (
              <option key={c.name} value={c.name}>
                {c.icon} {c.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '150px' }}
          >
            <option value="all">All Stages</option>
            {STAGES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Action Button: Tenant Submit Ticket */}
        <button
          className="btn btn-primary"
          onClick={handleOpenNewModal}
          style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          🛠️ Report Maintenance Issue
        </button>
      </div>

      {/* ── Maintenance Cards List ──────────────────────────── */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          ⏳ Loading maintenance requests...
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--card-bg, #181920)', padding: '3rem', borderRadius: '12px' }}>
          <div className="empty-state-icon">🧰</div>
          <h3>No Maintenance Tickets Found</h3>
          <p>
            Click "Report Maintenance Issue" to submit a new issue with a category, details, and photo attachment.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {requests.map((reqItem) => {
            const currentStageIndex = STAGES.indexOf(reqItem.status);

            return (
              <div
                key={reqItem._id}
                style={{
                  background: 'var(--card-bg, #181920)',
                  borderRadius: '16px',
                  border: reqItem.urgency === 'Emergency' ? '1px solid rgba(239, 68, 68, 0.4)' : '1px solid #272a37',
                  padding: '1.5rem',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                  display: 'grid',
                  gridTemplateColumns: reqItem.photoUrl ? '160px 1fr' : '1fr',
                  gap: '1.5rem',
                  alignItems: 'start',
                }}
              >
                {/* Photo Preview */}
                {reqItem.photoUrl && (
                  <div style={{ borderRadius: '10px', overflow: 'hidden', height: '140px', background: '#0f1117' }}>
                    <img
                      src={reqItem.photoUrl}
                      alt={reqItem.title}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        e.target.src = 'https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=500&auto=format&fit=crop';
                      }}
                    />
                  </div>
                )}

                {/* Main Card Content */}
                <div>
                  {/* Header Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '0.8rem' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '1.2rem' }}>{getCategoryIcon(reqItem.category)}</span>
                        <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 700, color: '#f8fafc' }}>
                          {reqItem.title}
                        </h3>
                        {getUrgencyBadge(reqItem.urgency)}
                        {getStatusBadge(reqItem.status)}
                      </div>
                      <div style={{ fontSize: '0.82rem', color: '#94a3b8', marginTop: '0.2rem' }}>
                        📍 {reqItem.listingTitle} | Reported by <strong>{reqItem.tenantName}</strong> ({reqItem.tenantEmail})
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => setTimelineRequest(reqItem)}
                        title="View stage history timeline"
                        style={{ fontSize: '0.8rem' }}
                      >
                        📜 History Timeline ({reqItem.statusHistory?.length || 1})
                      </button>

                      {canManage && reqItem.status === 'Submitted' && (
                        <button
                          className="btn btn-sm"
                          onClick={() => handleQuickAcknowledge(reqItem)}
                          style={{
                            fontSize: '0.8rem',
                            background: 'rgba(59, 130, 246, 0.2)',
                            color: '#60a5fa',
                            border: '1px solid rgba(59, 130, 246, 0.4)',
                            fontWeight: 600,
                          }}
                          title="Acknowledge this preliminary submitted request"
                        >
                          👁️ Acknowledge Issue
                        </button>
                      )}

                      {canManage && (
                        <button
                          className="btn btn-sm btn-primary"
                          onClick={() => handleOpenUpdateModal(reqItem)}
                          style={{ fontSize: '0.8rem' }}
                        >
                          ⚙️ Update Stage
                        </button>
                      )}

                      {isLandlord && (
                        <button
                          className="btn btn-sm btn-danger"
                          onClick={() => handleDelete(reqItem._id)}
                          style={{ fontSize: '0.8rem' }}
                          title="Delete ticket"
                        >
                          🗑 Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <p style={{ color: '#cbd5e1', fontSize: '0.9rem', lineHeight: '1.5', margin: '0.5rem 0 1.2rem 0' }}>
                    {reqItem.description}
                  </p>

                  {/* ── DEFINED STAGES PIPELINE PROGRESS BAR ───────────── */}
                  <div style={{
                    background: '#11131a',
                    padding: '1rem',
                    borderRadius: '12px',
                    border: '1px solid #232635',
                    marginBottom: '1rem',
                  }}>
                    {reqItem.status === 'Submitted' && (
                      <div style={{
                        fontSize: '0.78rem',
                        color: '#93c5fd',
                        background: 'rgba(59, 130, 246, 0.08)',
                        padding: '6px 12px',
                        borderRadius: '6px',
                        marginBottom: '0.75rem',
                        borderLeft: '3px solid #3b82f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <span>ℹ️ <strong>Preliminary Submission:</strong> Stays in "Submitted" status awaiting Landlord review and acknowledgment.</span>
                      </div>
                    )}

                    <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600, marginBottom: '0.75rem' }}>
                      DEFINED REPAIR STAGES PIPELINE:
                    </div>

                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(5, 1fr)',
                      gap: '0.5rem',
                      position: 'relative',
                    }}>
                      {STAGES.map((st, idx) => {
                        const isPassed = currentStageIndex >= idx;
                        const isCurrent = currentStageIndex === idx;

                        return (
                          <div
                            key={st}
                            style={{
                              textAlign: 'center',
                              padding: '8px 4px',
                              borderRadius: '8px',
                              background: isCurrent
                                ? 'linear-gradient(135deg, #6366f1, #4f46e5)'
                                : isPassed
                                ? 'rgba(16, 185, 129, 0.15)'
                                : '#1a1d27',
                              border: isCurrent
                                ? '1px solid #818cf8'
                                : isPassed
                                ? '1px solid rgba(16, 185, 129, 0.3)'
                                : '1px solid #272b3a',
                              color: isCurrent ? '#fff' : isPassed ? '#34d399' : '#64748b',
                              fontSize: '0.78rem',
                              fontWeight: isCurrent || isPassed ? 700 : 500,
                              transition: 'all 0.3s ease',
                            }}
                          >
                            <div style={{ fontSize: '0.9rem', marginBottom: '2px' }}>
                              {idx === 0 && '📩'}
                              {idx === 1 && '👁️'}
                              {idx === 2 && '🛠️'}
                              {idx === 3 && '📅'}
                              {idx === 4 && '✅'}
                            </div>
                            {st === 'Submitted' ? 'Submitted (Preliminary)' : st}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Additional Landlord Details Footer */}
                  <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap', fontSize: '0.83rem', color: '#94a3b8' }}>
                    {reqItem.scheduledDate && (
                      <div>📅 Scheduled Fix: <strong style={{ color: '#38bdf8' }}>{new Date(reqItem.scheduledDate).toLocaleDateString()}</strong></div>
                    )}
                    {reqItem.cost > 0 && (
                      <div>💵 Repair Cost: <strong style={{ color: '#10b981' }}>${reqItem.cost}</strong></div>
                    )}
                    {reqItem.landlordNotes && (
                      <div>📝 Landlord Note: <span style={{ color: '#e2e8f0', fontStyle: 'italic' }}>"{reqItem.landlordNotes}"</span></div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Modal 1: Submit Maintenance Request (Tenant) ───── */}
      {isNewModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsNewModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '540px' }}>
            <div className="modal-header">
              <h3>🛠️ Report Maintenance Issue</h3>
              <button className="close-btn" onClick={() => setIsNewModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleCreateRequest}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Property / Unit *</label>
                  <input
                    type="text"
                    className="input"
                    required
                    placeholder="e.g. Modern Apartment Apt 3B"
                    value={newRequestData.listingTitle}
                    onChange={(e) => setNewRequestData({ ...newRequestData, listingTitle: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Category *</label>
                    <select
                      className="input"
                      value={newRequestData.category}
                      onChange={(e) => setNewRequestData({ ...newRequestData, category: e.target.value })}
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.icon} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Urgency Level *</label>
                    <select
                      className="input"
                      value={newRequestData.urgency}
                      onChange={(e) => setNewRequestData({ ...newRequestData, urgency: e.target.value })}
                    >
                      <option value="Low">🟢 Low</option>
                      <option value="Medium">🟡 Medium</option>
                      <option value="High">🟠 High</option>
                      <option value="Emergency">🔴 Emergency</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="form-label">Issue Title *</label>
                  <input
                    type="text"
                    className="input"
                    required
                    placeholder="e.g. Leaking kitchen sink pipe under the counter"
                    value={newRequestData.title}
                    onChange={(e) => setNewRequestData({ ...newRequestData, title: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Detailed Description *</label>
                  <textarea
                    className="input"
                    rows="3"
                    required
                    placeholder="Describe the issue in detail (when it started, severity, symptoms)..."
                    value={newRequestData.description}
                    onChange={(e) => setNewRequestData({ ...newRequestData, description: e.target.value })}
                  />
                </div>

                {/* Sample Photo Attachment Picker */}
                <div>
                  <label className="form-label">Attach Photo (Select Sample Image or Enter URL)</label>
                  <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <input
                      type="url"
                      className="input"
                      placeholder="https://..."
                      value={newRequestData.photoUrl}
                      onChange={(e) => setNewRequestData({ ...newRequestData, photoUrl: e.target.value })}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                    {SAMPLE_PHOTOS.map((sp) => (
                      <button
                        key={sp.label}
                        type="button"
                        className="btn btn-sm btn-outline"
                        style={{
                          fontSize: '0.73rem',
                          padding: '3px 8px',
                          borderColor: newRequestData.photoUrl === sp.url ? '#6366f1' : '#334155',
                          background: newRequestData.photoUrl === sp.url ? '#6366f122' : 'transparent',
                        }}
                        onClick={() => setNewRequestData({ ...newRequestData, photoUrl: sp.url })}
                      >
                        📷 {sp.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsNewModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Maintenance Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Update Stage & Landlord Notes ──────────── */}
      {isUpdateModalOpen && activeRequest && (
        <div className="modal-backdrop" onClick={() => setIsUpdateModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>⚙️ Update Repair Stage</h3>
              <button className="close-btn" onClick={() => setIsUpdateModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleUpdateStageSubmit}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div style={{ background: '#11131a', padding: '0.8rem', borderRadius: '8px' }}>
                  <strong style={{ color: '#f8fafc' }}>{activeRequest.title}</strong>
                  <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Tenant: {activeRequest.tenantName}</div>
                </div>

                <div>
                  <label className="form-label">Select Repair Stage *</label>
                  <select
                    className="input"
                    value={stageFormData.status}
                    onChange={(e) => setStageFormData({ ...stageFormData, status: e.target.value })}
                  >
                    <option value="Submitted">📩 1. Submitted (Preliminary)</option>
                    <option value="Acknowledged">👁️ 2. Acknowledged</option>
                    <option value="In Progress">🛠️ 3. In Progress</option>
                    <option value="Scheduled">📅 4. Scheduled</option>
                    <option value="Resolved">✅ 5. Resolved</option>
                    <option value="Cancelled">❌ Cancelled</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Scheduled Repair Date</label>
                    <input
                      type="date"
                      className="input"
                      value={stageFormData.scheduledDate}
                      onChange={(e) => setStageFormData({ ...stageFormData, scheduledDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Repair Cost ($)</label>
                    <input
                      type="number"
                      className="input"
                      placeholder="0"
                      value={stageFormData.cost}
                      onChange={(e) => setStageFormData({ ...stageFormData, cost: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Landlord Public Notes / Instructions</label>
                  <textarea
                    className="input"
                    rows="2"
                    placeholder="e.g. Plumber scheduled to arrive on Tuesday morning between 9-11 AM."
                    value={stageFormData.landlordNotes}
                    onChange={(e) => setStageFormData({ ...stageFormData, landlordNotes: e.target.value })}
                  />
                </div>

                <div>
                  <label className="form-label">Stage Update Log Note (Audit Trail)</label>
                  <input
                    type="text"
                    className="input"
                    placeholder="e.g. Contacted technician and ordered replacement valve."
                    value={stageFormData.note}
                    onChange={(e) => setStageFormData({ ...stageFormData, note: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsUpdateModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Stage Update
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 3: Status History Audit Trail Timeline ───── */}
      {timelineRequest && (
        <div className="modal-backdrop" onClick={() => setTimelineRequest(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <div className="modal-header">
              <h3>📜 Stage History & Audit Trail</h3>
              <button className="close-btn" onClick={() => setTimelineRequest(null)}>×</button>
            </div>
            <div className="modal-body">
              <h4 style={{ margin: '0 0 0.5rem 0', color: '#f8fafc' }}>{timelineRequest.title}</h4>
              <p style={{ fontSize: '0.83rem', color: '#94a3b8', marginBottom: '1.5rem' }}>
                Category: <strong>{timelineRequest.category}</strong> | Current Stage: <strong style={{ color: '#818cf8' }}>{timelineRequest.status}</strong>
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', borderLeft: '2px solid #334155', paddingLeft: '1rem', marginLeft: '0.5rem' }}>
                {timelineRequest.statusHistory?.map((hist, idx) => (
                  <div key={idx} style={{ position: 'relative' }}>
                    <div style={{
                      position: 'absolute',
                      left: '-1.45rem',
                      top: '2px',
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      background: idx === timelineRequest.statusHistory.length - 1 ? '#10b981' : '#6366f1',
                    }} />
                    <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '0.9rem' }}>
                      Stage: {hist.status}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#94a3b8' }}>
                      By {hist.updatedBy} • {new Date(hist.updatedAt).toLocaleString()}
                    </div>
                    {hist.note && (
                      <div style={{ fontSize: '0.83rem', color: '#cbd5e1', fontStyle: 'italic', marginTop: '0.2rem' }}>
                        "{hist.note}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setTimelineRequest(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
