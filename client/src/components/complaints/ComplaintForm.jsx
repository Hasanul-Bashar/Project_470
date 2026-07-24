import { useState } from 'react';
import { submitComplaint } from '../../services/complaintsApi';

/** Temporary toast notification */
function Toast({ message, type }) {
  return (
    <div className={`toast toast-${type}`}>
      <span style={{ flexShrink: 0 }}>{type === 'success' ? '✅' : '❌'}</span>
      {message}
    </div>
  );
}

/**
 * ComplaintForm — available to users (role: 'user').
 * Fields: title (required), relatedListingId (optional), description (required).
 * On success: shows a toast and resets the form.
 */
export default function ComplaintForm() {
  const [form, setForm]     = useState({ title: '', relatedListingId: '', description: '' });
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null); // { message, type }

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const handleChange = (e) =>
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!form.title.trim() || !form.description.trim()) {
      showToast('Please fill in the required fields (Title & Description).', 'error');
      return;
    }

    setLoading(true);
    try {
      await submitComplaint({
        title:            form.title.trim(),
        relatedListingId: form.relatedListingId.trim() || undefined,
        description:      form.description.trim(),
      });
      showToast('Your complaint has been submitted! An admin will review it within 48 hours.', 'success');
      setForm({ title: '', relatedListingId: '', description: '' });
    } catch (err) {
      const msg = err.response?.data?.message || 'Submission failed. Is the server running?';
      showToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} />}

      <div className="form-card">
        <h2 className="form-title">Lodge a Complaint</h2>
        <p className="form-subtitle">
          Describe your issue clearly. Our team aims to respond within 48 hours.
        </p>

        <form id="complaint-form" onSubmit={handleSubmit} noValidate>
          {/* Title */}
          <div className="form-group">
            <label className="form-label" htmlFor="complaint-title">
              Complaint Title <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <input
              id="complaint-title"
              name="title"
              type="text"
              className="form-input"
              placeholder="e.g. Landlord refusing to return security deposit"
              value={form.title}
              onChange={handleChange}
              maxLength={120}
              autoComplete="off"
            />
          </div>

          {/* Related Listing ID — optional */}
          <div className="form-group">
            <label className="form-label" htmlFor="complaint-listing-id">
              Related Listing ID <span className="optional">(optional)</span>
            </label>
            <input
              id="complaint-listing-id"
              name="relatedListingId"
              type="text"
              className="form-input"
              placeholder="Paste a listing ObjectId if the complaint involves a specific property"
              value={form.relatedListingId}
              onChange={handleChange}
              autoComplete="off"
            />
          </div>

          {/* Description */}
          <div className="form-group">
            <label className="form-label" htmlFor="complaint-description">
              Description <span style={{ color: 'var(--red)' }}>*</span>
            </label>
            <textarea
              id="complaint-description"
              name="description"
              className="form-textarea"
              placeholder="Provide as much detail as possible — dates, communication history, evidence available, etc."
              value={form.description}
              onChange={handleChange}
              rows={5}
            />
          </div>

          <button
            id="complaint-submit-btn"
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', marginTop: '.25rem' }}
          >
            {loading ? '⏳ Submitting…' : '🚀 Submit Complaint'}
          </button>
        </form>
      </div>
    </>
  );
}
