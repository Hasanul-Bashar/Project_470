import { useState } from 'react';
import Modal from '../Modal';
import { flagTenant } from '../../services/trustApi';

export default function FlagTenantModal({
  isOpen = true,
  tenantId,
  tenantName,
  listingId,
  listingTitle,
  onClose,
  onSuccess,
  onFlagged,
}) {
  if (!isOpen) return null;

  const [category, setCategory] = useState('late_payment');
  const [severity, setSeverity] = useState('moderate');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!tenantId) {
      setError('No tenant selected to flag.');
      return;
    }
    if (!description.trim()) {
      setError('Please provide a factual description of the infraction.');
      return;
    }

    try {
      setSubmitting(true);
      setError('');
      await flagTenant({
        tenantId,
        listingId,
        category,
        severity,
        description: description.trim(),
      });
      if (onSuccess) onSuccess();
      if (onFlagged) onFlagged();
      if (onClose) onClose();
    } catch (err) {
      console.error('Flag error:', err);
      setError(err.response?.data?.message || 'Failed to submit infraction flag.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    setError('');
    setDescription('');
    if (onClose) onClose();
  };

  return (
    <Modal title={`🚩 Report Infraction: ${tenantName || 'Tenant'}`} onClose={handleCancel}>
      <div style={{ padding: '1.25rem' }}>
        <p style={{ margin: '0 0 1rem 0', fontSize: '0.85rem', color: '#94a3b8' }}>
          File a verified infraction against <strong>{tenantName || 'selected tenant'}</strong> for property{' '}
          <strong>"{listingTitle || 'Rental Listing'}"</strong>. Infractions directly impact the tenant's Trust Score
          based on severity and time decay.
        </p>

        {error && (
          <div
            style={{
              padding: '0.75rem',
              borderRadius: '8px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid #ef4444',
              color: '#fca5a5',
              fontSize: '0.85rem',
              marginBottom: '1rem',
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Infraction Category:
            </label>
            <select
              className="form-input"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', background: '#0f172a' }}
            >
              <option value="late_payment">Late Rent / Unpaid Utility Bills</option>
              <option value="property_damage">Property Damage or Fixture Abuse</option>
              <option value="lease_violation">Lease Agreement Violation</option>
              <option value="noise_nuisance">Noise or Neighborhood Disturbance</option>
              <option value="unauthorized_sublet">Unauthorized Subletting</option>
              <option value="illegal_activity">Illegal or Dangerous Activity</option>
              <option value="other">Other Tenancy Non-Compliance</option>
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Severity Level:
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
              {[
                { id: 'minor', label: 'Minor (-6)', desc: 'Isolated disturbance' },
                { id: 'moderate', label: 'Moderate (-15)', desc: 'Repeated late rent' },
                { id: 'severe', label: 'Severe (-30)', desc: 'Major damage' },
                { id: 'critical', label: 'Critical (-50)', desc: 'Severe violation / Blacklist' },
              ].map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setSeverity(s.id)}
                  style={{
                    padding: '0.6rem 0.4rem',
                    borderRadius: '8px',
                    border: severity === s.id ? '2px solid var(--purple)' : '1px solid rgba(255, 255, 255, 0.1)',
                    background: severity === s.id ? 'rgba(139, 92, 246, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                    color: '#f8fafc',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    textAlign: 'center',
                  }}
                >
                  <div style={{ fontWeight: 700 }}>{s.label}</div>
                  <div style={{ fontSize: '0.65rem', color: '#94a3b8', marginTop: '0.15rem' }}>{s.desc}</div>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#cbd5e1', marginBottom: '0.35rem' }}>
              Detailed Description & Facts:
            </label>
            <textarea
              rows={4}
              className="form-input"
              placeholder="Describe the incident, dates, damages, or unpaid balances clearly. Be objective and factual..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              style={{ width: '100%', resize: 'vertical' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={handleCancel} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !description.trim()}>
              {submitting ? 'Recording Flag...' : 'Record Infraction Flag 🚩'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
