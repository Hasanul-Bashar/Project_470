import { useState } from 'react';
import Modal from '../Modal';
import { updateComplaintStatus } from '../../services/complaintsApi';

const STATUS_OPTIONS = ['Pending', 'In Review', 'Resolved'];

/** Coloured pill badge for complaint status */
function StatusBadge({ status }) {
  const classMap = {
    'Pending':   'badge-pending',
    'In Review': 'badge-review',
    'Resolved':  'badge-resolved',
  };
  return <span className={`badge ${classMap[status] ?? ''}`}>{status}</span>;
}

/**
 * DisputeDetailModal
 * ──────────────────
 * Shows full complaint details with:
 *   - Submitter info
 *   - Related listing info (if any)
 *   - Existing resolution note (if any)
 *   - Admin Action Box to update status + append a resolution note
 *
 * Props:
 *   complaint  — full complaint object (populated from DisputeTable)
 *   onClose    — close handler
 *   onUpdated  — callback(updatedComplaint) to update the parent table row
 */
export default function DisputeDetailModal({ complaint, onClose, onUpdated }) {
  const [status, setStatus] = useState(complaint.status);
  const [note,   setNote]   = useState(complaint.resolutionNote || '');
  const [saving, setSaving] = useState(false);

  const submitter = complaint.submittedBy;
  const listing   = complaint.relatedListingId;

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await updateComplaintStatus(complaint._id, {
        status,
        resolutionNote: note,
      });
      onUpdated(res.data.complaint); // update row in DisputeTable
      onClose();
    } catch (err) {
      alert(`Update failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal title="📣 Complaint Detail" onClose={onClose} wide>
      <div className="modal-body">

        {/* ── Complaint Info ─────────────────────────────────── */}
        <div className="detail-grid">
          <div className="detail-item">
            <label>Title</label>
            <p>{complaint.title}</p>
          </div>
          <div className="detail-item">
            <label>Current Status</label>
            <p><StatusBadge status={complaint.status} /></p>
          </div>
          <div className="detail-item">
            <label>Submitted By</label>
            <p>
              {submitter?.firstName} {submitter?.lastName}
              <span className="td-sub">{submitter?.email}</span>
            </p>
          </div>
          <div className="detail-item">
            <label>Date Filed</label>
            <p>
              {new Date(complaint.createdAt).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* ── Description ───────────────────────────────────── */}
        <div className="detail-description">
          <strong>Description</strong>
          {complaint.description}
        </div>

        {/* ── Related Listing (if any) ───────────────────────── */}
        {listing && (
          <div className="listing-preview-section">
            <div className="listing-preview-title">🏠 Related Listing</div>
            <div className="detail-grid" style={{ marginBottom: 0 }}>
              <div className="detail-item">
                <label>Title</label>
                <p>{listing.title}</p>
              </div>
              <div className="detail-item">
                <label>Location</label>
                <p>📍 {listing.location}</p>
              </div>
            </div>
          </div>
        )}

        {/* ── Existing Resolution Note ───────────────────────── */}
        {complaint.resolutionNote && (
          <div className="detail-description" style={{ borderColor: 'rgba(59,130,246,.2)' }}>
            <strong style={{ color: 'var(--blue)' }}>Previous Resolution Note</strong>
            {complaint.resolutionNote}
          </div>
        )}

        {/* ── Admin Action Box ───────────────────────────────── */}
        <div className="admin-action-box">
          <div className="admin-action-title">⚙️ Admin Actions</div>

          <div className="form-group">
            <label className="form-label" htmlFor="dispute-status-select">
              Update Status
            </label>
            <select
              id="dispute-status-select"
              className="form-select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label" htmlFor="dispute-resolution-note">
              Resolution Note
            </label>
            <textarea
              id="dispute-resolution-note"
              className="form-textarea"
              placeholder="Describe the action taken, next steps, or final resolution…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              style={{ minHeight: '80px' }}
            />
          </div>
        </div>
      </div>

      <div className="modal-footer">
        <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
        <button
          id="save-complaint-btn"
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? '⏳ Saving…' : '💾 Save Changes'}
        </button>
      </div>
    </Modal>
  );
}
