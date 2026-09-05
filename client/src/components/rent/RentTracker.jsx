import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  getRentPayments,
  createRentPayment,
  updateRentStatus,
  deleteRentPayment,
  bulkGenerateRent,
} from '../../services/rentApi';

export default function RentTracker() {
  const { user } = useAuth();
  const isLandlord = user?.role === 'landlord';
  const isAdmin = user?.role === 'admin';
  const canManage = isLandlord || isAdmin;

  const [payments, setPayments] = useState([]);
  const [summary, setSummary] = useState({
    totalCollected: 0,
    totalDue: 0,
    totalOverdue: 0,
    overdueCount: 0,
    paidCount: 0,
    dueCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Filters
  const [selectedMonth, setSelectedMonth] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal State for New/Edit Record
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    tenantName: '',
    tenantEmail: '',
    listingTitle: '',
    month: new Date().toISOString().slice(0, 7), // "YYYY-MM"
    bookedDays: 7,
    dailyRate: 1000,
    amount: 7000,
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
    status: 'due',
    paymentMethod: 'Cash',
    notes: '',
  });

  // Bulk Generate Modal
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkMonth, setBulkMonth] = useState(new Date().toISOString().slice(0, 7));
  const [bulkDueDate, setBulkDueDate] = useState(
    new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );

  const fetchRentData = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const params = {};
      if (selectedMonth !== 'all') params.month = selectedMonth;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await getRentPayments(params);
      setPayments(res.data.payments || []);
      if (res.data.summary) {
        setSummary(res.data.summary);
      }
    } catch (err) {
      console.error('Error fetching rent payments:', err);
      setError('Failed to load rent records. Make sure the server is running.');
    } finally {
      setLoading(false);
    }
  }, [selectedMonth, statusFilter, searchQuery]);

  useEffect(() => {
    fetchRentData();
  }, [fetchRentData]);

  const handleOpenCreateModal = () => {
    setEditingId(null);
    setFormData({
      tenantName: '',
      tenantEmail: '',
      listingTitle: '',
      month: new Date().toISOString().slice(0, 7),
      bookedDays: 7,
      dailyRate: 1000,
      amount: 7000,
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10),
      status: 'due',
      paymentMethod: 'Cash',
      notes: 'Rent calculated for 7 booked days',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingId(item._id);
    const itemDays = item.bookedDays || (item.dailyRate ? Math.round(item.amount / item.dailyRate) : 1);
    const itemDaily = item.dailyRate || (itemDays ? Math.round(item.amount / itemDays) : item.amount);
    setFormData({
      tenantName: item.tenantName || '',
      tenantEmail: item.tenantEmail || '',
      listingTitle: item.listingTitle || '',
      month: item.month || new Date().toISOString().slice(0, 7),
      bookedDays: itemDays,
      dailyRate: itemDaily,
      amount: item.amount || 0,
      dueDate: item.dueDate ? new Date(item.dueDate).toISOString().slice(0, 10) : '',
      status: item.status || 'due',
      paymentMethod: item.paymentMethod || 'Cash',
      notes: item.notes || '',
    });
    setIsModalOpen(true);
  };

  const handleSavePayment = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateRentStatus(editingId, formData);
        setSuccessMsg('Rent record updated successfully!');
      } else {
        await createRentPayment(formData);
        setSuccessMsg('New rent record created successfully!');
      }
      setIsModalOpen(false);
      fetchRentData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error saving rent record');
    }
  };

  const handleQuickStatusChange = async (id, newStatus) => {
    try {
      await updateRentStatus(id, { status: newStatus });
      setSuccessMsg(`Status updated to ${newStatus.toUpperCase()}`);
      fetchRentData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update status');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this rent record?')) return;
    try {
      await deleteRentPayment(id);
      setSuccessMsg('Record deleted successfully');
      fetchRentData();
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      alert('Failed to delete record');
    }
  };

  const handleBulkGenerate = async (e) => {
    e.preventDefault();
    try {
      const res = await bulkGenerateRent({ month: bulkMonth, defaultDueDate: bulkDueDate });
      setSuccessMsg(res.data.message || 'Monthly rent records generated!');
      setIsBulkModalOpen(false);
      fetchRentData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      alert(err.response?.data?.message || 'Error generating monthly rent');
    }
  };

  // Helper function to calculate days overdue
  const getOverdueDays = (dueDateStr) => {
    if (!dueDateStr) return 0;
    const due = new Date(dueDateStr);
    const now = new Date();
    const diffTime = now - due;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays > 0 ? diffDays : 0;
  };

  return (
    <div className="rent-tracker-container" style={{ marginTop: '1.5rem' }}>
      {/* Flash Messages */}
      {successMsg && <div className="alert alert-success">✅ {successMsg}</div>}
      {error && <div className="alert alert-danger">⚠️ {error}</div>}

      {/* ── KPI Summary Header Cards ────────────────────────── */}
      <div className="rent-stats-grid" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1.25rem',
        marginBottom: '2rem'
      }}>
        <div className="stat-card" style={{ borderLeft: '4px solid #10b981' }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Collected Rent (Paid)</span>
            <span style={{ fontSize: '1.4rem' }}>💵</span>
          </div>
          <div className="stat-card-value" style={{ color: '#10b981' }}>
            ৳{summary.totalCollected.toLocaleString()}
          </div>
          <div className="stat-card-sub">{summary.paidCount} paid records</div>
        </div>

        <div className="stat-card" style={{ borderLeft: '4px solid #3b82f6' }}>
          <div className="stat-card-header">
            <span className="stat-card-title">Pending Rent (Due)</span>
            <span style={{ fontSize: '1.4rem' }}>⏳</span>
          </div>
          <div className="stat-card-value" style={{ color: '#3b82f6' }}>
            ৳{summary.totalDue.toLocaleString()}
          </div>
          <div className="stat-card-sub">{summary.dueCount} active due records</div>
        </div>

        <div className="stat-card overdue-flag-card" style={{
          borderLeft: '4px solid #ef4444',
          background: summary.overdueCount > 0 ? 'rgba(239, 68, 68, 0.06)' : 'inherit'
        }}>
          <div className="stat-card-header">
            <span className="stat-card-title" style={{ color: summary.overdueCount > 0 ? '#ef4444' : 'inherit' }}>
              Flagged Overdue
            </span>
            <span className="pulsing-warning-icon">🚨</span>
          </div>
          <div className="stat-card-value" style={{ color: '#ef4444' }}>
            ৳{summary.totalOverdue.toLocaleString()}
          </div>
          <div className="stat-card-sub" style={{ color: '#ef4444', fontWeight: 600 }}>
            {summary.overdueCount} tenant(s) overdue
          </div>
        </div>
      </div>

      {/* ── Filter Controls & Action Bar ───────────────────── */}
      <div className="rent-controls-bar" style={{
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
            placeholder="🔍 Search tenant, property..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '220px' }}
          />

          {/* Month Selector */}
          <input
            type="month"
            className="input"
            value={selectedMonth === 'all' ? '' : selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value || 'all')}
            style={{ width: '160px' }}
          />
          {selectedMonth !== 'all' && (
            <button
              className="btn btn-sm btn-outline"
              onClick={() => setSelectedMonth('all')}
              title="Reset Month Filter"
            >
              All Months
            </button>
          )}

          {/* Status Filter Tabs */}
          <div style={{ display: 'flex', gap: '0.3rem', background: '#0e1017', padding: '4px', borderRadius: '8px' }}>
            {['all', 'due', 'overdue', 'paid'].map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                style={{
                  padding: '6px 14px',
                  borderRadius: '6px',
                  border: 'none',
                  fontSize: '0.85rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  background: statusFilter === st ? (st === 'overdue' ? '#ef4444' : st === 'paid' ? '#10b981' : '#6366f1') : 'transparent',
                  color: statusFilter === st ? '#fff' : '#94a3b8',
                  transition: 'all 0.2s ease',
                }}
              >
                {st === 'overdue' ? '⚠️ Overdue' : st.charAt(0).toUpperCase() + st.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Action Buttons for Landlord/Admin */}
        {canManage && (
          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button
              className="btn btn-secondary"
              onClick={() => setIsBulkModalOpen(true)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              ⚡ Bulk Generate Rent
            </button>
            <button
              className="btn btn-primary"
              onClick={handleOpenCreateModal}
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              ➕ Log Rent Record
            </button>
          </div>
        )}
      </div>

      {/* ── Rent Payments Data Table ────────────────────────── */}
      {loading ? (
        <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
          ⏳ Loading rent tracking records...
        </div>
      ) : payments.length === 0 ? (
        <div className="empty-state" style={{ background: 'var(--card-bg, #181920)', padding: '3rem', borderRadius: '12px' }}>
          <div className="empty-state-icon">💳</div>
          <h3>No Rent Records Found</h3>
          <p>
            {canManage
              ? 'Click "Log Rent Record" or "Bulk Generate Rent" to start tracking rent payments per tenant.'
              : 'You have no rent payments logged for the selected criteria.'}
          </p>
        </div>
      ) : (
        <div className="table-responsive" style={{ background: 'var(--card-bg, #181920)', borderRadius: '12px', padding: '1rem', overflowX: 'auto' }}>
          <table className="table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #2a2d3d', textAlign: 'left', color: '#94a3b8', fontSize: '0.85rem' }}>
                <th style={{ padding: '12px' }}>Tenant Details</th>
                <th style={{ padding: '12px' }}>Property / Listing</th>
                <th style={{ padding: '12px' }}>Month</th>
                <th style={{ padding: '12px' }}>Amount</th>
                <th style={{ padding: '12px' }}>Due Date & Overdue Flag</th>
                <th style={{ padding: '12px' }}>Status</th>
                <th style={{ padding: '12px' }}>Payment Info</th>
                {canManage && <th style={{ padding: '12px', textAlign: 'right' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => {
                const overdueDays = getOverdueDays(p.dueDate);
                const isOverdueFlagged = p.status === 'overdue' || (p.status === 'due' && overdueDays > 0);

                return (
                  <tr
                    key={p._id}
                    style={{
                      borderBottom: '1px solid #232736',
                      background: isOverdueFlagged ? 'rgba(239, 68, 68, 0.05)' : 'transparent',
                      transition: 'background 0.2s',
                    }}
                  >
                    {/* Tenant Info */}
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 600, color: '#f8fafc' }}>{p.tenantName}</div>
                      <div style={{ fontSize: '0.8rem', color: '#94a3b8' }}>{p.tenantEmail}</div>
                    </td>

                    {/* Property */}
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 500, color: '#e2e8f0' }}>{p.listingTitle}</div>
                    </td>

                    {/* Month */}
                    <td style={{ padding: '14px 12px' }}>
                      <span className="badge" style={{ background: '#334155', color: '#f1f5f9' }}>
                        {p.month}
                      </span>
                    </td>

                    {/* Amount */}
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontWeight: 700, color: '#f8fafc', fontSize: '1rem' }}>
                        ৳{p.amount?.toLocaleString()}
                      </div>
                      {p.bookedDays > 0 ? (
                        <div style={{ fontSize: '0.76rem', color: '#38bdf8', marginTop: '2px', fontWeight: 500 }}>
                          📆 {p.bookedDays} day{p.bookedDays > 1 ? 's' : ''} {p.dailyRate ? `(@ ৳${p.dailyRate.toLocaleString()}/d)` : ''}
                        </div>
                      ) : (
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8', marginTop: '2px' }}>
                          Standard rate
                        </div>
                      )}
                    </td>

                    {/* Due Date & Overdue Flag */}
                    <td style={{ padding: '14px 12px' }}>
                      <div style={{ fontSize: '0.9rem', color: isOverdueFlagged ? '#ef4444' : '#cbd5e1' }}>
                        📅 {new Date(p.dueDate).toLocaleDateString()}
                      </div>
                      {isOverdueFlagged && (
                        <div style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          marginTop: '4px',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          background: '#ef444422',
                          border: '1px solid #ef444444',
                          color: '#ef4444',
                          fontSize: '0.75rem',
                          fontWeight: 700,
                        }}>
                          ⚠️ OVERDUE {overdueDays > 0 ? `(${overdueDays}d late)` : ''}
                        </div>
                      )}
                    </td>

                    {/* Status Badge */}
                    <td style={{ padding: '14px 12px' }}>
                      {p.status === 'paid' && (
                        <span className="badge" style={{ background: '#10b98122', color: '#10b981', border: '1px solid #10b98144' }}>
                          ✅ PAID
                        </span>
                      )}
                      {p.status === 'due' && !isOverdueFlagged && (
                        <span className="badge" style={{ background: '#3b82f622', color: '#3b82f6', border: '1px solid #3b82f644' }}>
                          ⏳ DUE
                        </span>
                      )}
                      {isOverdueFlagged && (
                        <span className="badge" style={{
                          background: '#ef4444',
                          color: '#ffffff',
                          fontWeight: 700,
                          boxShadow: '0 0 10px rgba(239,68,68,0.5)',
                          animation: 'pulse 2s infinite'
                        }}>
                          🚨 OVERDUE
                        </span>
                      )}
                    </td>

                    {/* Payment Info */}
                    <td style={{ padding: '14px 12px', fontSize: '0.82rem', color: '#94a3b8' }}>
                      <div>Method: <strong>{p.paymentMethod || 'Cash'}</strong></div>
                      {p.paidDate && (
                        <div style={{ color: '#10b981' }}>
                          Paid: {new Date(p.paidDate).toLocaleDateString()}
                        </div>
                      )}
                      {p.notes && <div style={{ fontStyle: 'italic', color: '#64748b' }}>"{p.notes}"</div>}
                    </td>

                    {/* Landlord / Admin Actions */}
                    {canManage && (
                      <td style={{ padding: '14px 12px', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          {p.status !== 'paid' && (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleQuickStatusChange(p._id, 'paid')}
                              style={{ background: '#10b981', color: '#fff', fontSize: '0.75rem', padding: '4px 8px' }}
                              title="Mark as Paid"
                            >
                              Mark Paid
                            </button>
                          )}
                          {p.status !== 'overdue' && (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleQuickStatusChange(p._id, 'overdue')}
                              style={{ background: '#ef4444', color: '#fff', fontSize: '0.75rem', padding: '4px 8px' }}
                              title="Flag Overdue"
                            >
                              Flag Overdue
                            </button>
                          )}
                          {p.status !== 'due' && (
                            <button
                              className="btn btn-sm"
                              onClick={() => handleQuickStatusChange(p._id, 'due')}
                              style={{ background: '#3b82f6', color: '#fff', fontSize: '0.75rem', padding: '4px 8px' }}
                              title="Mark as Due"
                            >
                              Mark Due
                            </button>
                          )}
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={() => handleOpenEditModal(p)}
                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                          >
                            ✏️ Edit
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={() => handleDelete(p._id)}
                            style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                          >
                            🗑
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Modal 1: Create / Edit Rent Record ─────────────── */}
      {isModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h3>{editingId ? 'Edit Rent Record' : 'Log New Rent Record'}</h3>
              <button className="close-btn" onClick={() => setIsModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleSavePayment}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <div>
                  <label className="form-label">Tenant Name *</label>
                  <input
                    type="text"
                    className="input"
                    required
                    value={formData.tenantName}
                    onChange={(e) => setFormData({ ...formData, tenantName: e.target.value })}
                    placeholder="e.g. Alice Smith"
                  />
                </div>

                <div>
                  <label className="form-label">Tenant Email *</label>
                  <input
                    type="email"
                    className="input"
                    required
                    value={formData.tenantEmail}
                    onChange={(e) => setFormData({ ...formData, tenantEmail: e.target.value })}
                    placeholder="e.g. alice@example.com"
                  />
                </div>

                <div>
                  <label className="form-label">Property Title *</label>
                  <input
                    type="text"
                    className="input"
                    required
                    value={formData.listingTitle}
                    onChange={(e) => setFormData({ ...formData, listingTitle: e.target.value })}
                    placeholder="e.g. Modern Apartment Apt 3B"
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Month *</label>
                    <input
                      type="month"
                      className="input"
                      required
                      value={formData.month}
                      onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Booked Days (Duration) *</label>
                    <input
                      type="number"
                      className="input"
                      required
                      min="1"
                      value={formData.bookedDays || ''}
                      onChange={(e) => {
                        const days = Number(e.target.value);
                        const rate = Number(formData.dailyRate) || 0;
                        setFormData({
                          ...formData,
                          bookedDays: days,
                          amount: days > 0 && rate > 0 ? days * rate : formData.amount,
                        });
                      }}
                      placeholder="e.g. 5, 12, 30"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Daily Rent Rate (৳/day) *</label>
                    <input
                      type="number"
                      className="input"
                      required
                      min="0"
                      value={formData.dailyRate || ''}
                      onChange={(e) => {
                        const rate = Number(e.target.value);
                        const days = Number(formData.bookedDays) || 0;
                        setFormData({
                          ...formData,
                          dailyRate: rate,
                          amount: days > 0 && rate > 0 ? days * rate : formData.amount,
                        });
                      }}
                      placeholder="e.g. 1000"
                    />
                  </div>

                  <div>
                    <label className="form-label">Total Rent (৳ calculated) *</label>
                    <input
                      type="number"
                      className="input"
                      required
                      min="0"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: Number(e.target.value) })}
                      title="Calculated as Booked Days × Daily Rate"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Due Date *</label>
                    <input
                      type="date"
                      className="input"
                      required
                      value={formData.dueDate}
                      onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="form-label">Payment Status *</label>
                    <select
                      className="input"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    >
                      <option value="due">⏳ Due</option>
                      <option value="paid">✅ Paid</option>
                      <option value="overdue">🚨 Overdue (Flagged)</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="form-label">Payment Method</label>
                    <select
                      className="input"
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      <option value="Cash">Cash</option>
                      <option value="Bank Transfer">Bank Transfer</option>
                      <option value="bKash">bKash / Mobile Wallet</option>
                      <option value="Credit Card">Credit Card</option>
                      <option value="Online">Online Payment</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">Notes</label>
                    <input
                      type="text"
                      className="input"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="e.g. Partial payment / Notes"
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {editingId ? 'Save Changes' : 'Create Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal 2: Bulk Generate Rent Records ─────────────── */}
      {isBulkModalOpen && (
        <div className="modal-backdrop" onClick={() => setIsBulkModalOpen(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>⚡ Bulk Generate Monthly Rent</h3>
              <button className="close-btn" onClick={() => setIsBulkModalOpen(false)}>×</button>
            </div>
            <form onSubmit={handleBulkGenerate}>
              <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <p style={{ fontSize: '0.9rem', color: '#94a3b8' }}>
                  Automatically generate rent records for all active tenants with approved bookings under your account. Rent is calculated precisely based on the number of days booked for the flat rather than the whole month.
                </p>

                <div>
                  <label className="form-label">Select Month *</label>
                  <input
                    type="month"
                    className="input"
                    required
                    value={bulkMonth}
                    onChange={(e) => setBulkMonth(e.target.value)}
                  />
                </div>

                <div>
                  <label className="form-label">Due Date for this Month *</label>
                  <input
                    type="date"
                    className="input"
                    required
                    value={bulkDueDate}
                    onChange={(e) => setBulkDueDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer" style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'flex-end', gap: '0.8rem' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsBulkModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Generate Records
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
