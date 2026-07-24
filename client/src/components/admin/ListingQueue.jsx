import { useState, useEffect } from 'react';
import { getPendingListings, updateListingStatus } from '../../services/adminApi';
import Modal from '../Modal';

/* ──────────────────────────────────────────────────────────────
   ListingPreviewModal
   Opens inside the reusable Modal — no navigation to /listings/:id
   ────────────────────────────────────────────────────────────── */
function ListingPreviewModal({ listing, onClose }) {
  return (
    <Modal title="📋 Listing Preview" onClose={onClose} wide>
      <div className="modal-body">
        {/* Key details grid */}
        <div className="detail-grid">
          <div className="detail-item">
            <label>Title</label>
            <p>{listing.title}</p>
          </div>
          <div className="detail-item">
            <label>Location</label>
            <p>📍 {listing.location}</p>
          </div>
          <div className="detail-item">
            <label>Monthly Rent</label>
            <p style={{ color: 'var(--green)', fontWeight: 700 }}>
              BDT {listing.price?.toLocaleString()}
            </p>
          </div>
          <div className="detail-item">
            <label>Landlord</label>
            <p>
              {listing.landlordId?.firstName} {listing.landlordId?.lastName}
              <span className="td-sub">{listing.landlordId?.email}</span>
            </p>
          </div>
        </div>

        {/* Description */}
        <div className="detail-description">
          <strong>Description</strong>
          {listing.description}
        </div>

        {/* Amenities */}
        {listing.amenities?.length > 0 && (
          <div>
            <div style={{
              fontSize: '.68rem', fontWeight: 600, textTransform: 'uppercase',
              letterSpacing: '.5px', color: 'var(--t3)', marginBottom: '.45rem',
            }}>
              Amenities
            </div>
            <div className="amenity-chips">
              {listing.amenities.map((a, i) => (
                <span key={i} className="amenity-chip">✓ {a}</span>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ──────────────────────────────────────────────────────────────
   ListingQueue
   Pending listings table with Preview modal + Approve / Reject
   ────────────────────────────────────────────────────────────── */
export default function ListingQueue({ onAction }) {
  const [listings,       setListings]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [actionId,       setActionId]       = useState(null);
  const [exitIds,        setExitIds]        = useState(new Set());
  const [previewListing, setPreviewListing] = useState(null);

  useEffect(() => {
    getPendingListings()
      .then((res) => setListings(res.data))
      .catch((err) => console.error('Failed to load listings:', err.message))
      .finally(() => setLoading(false));
  }, []);

  const handleAction = async (id, status) => {
    setActionId(id);
    try {
      await updateListingStatus(id, status);
      setExitIds((prev) => new Set([...prev, id]));
      setTimeout(() => {
        setListings((prev) => prev.filter((l) => l._id !== id));
        setExitIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
        if (onAction) onAction();
      }, 380);
    } catch (err) {
      alert(`Action failed: ${err.response?.data?.message || err.message}`);
    } finally {
      setActionId(null);
    }
  };

  return (
    <>
      <div className="panel">
        <div className="panel-header">
          <span className="panel-title">📋 Listing Approval Queue</span>
          <span className="panel-badge" id="listing-count">{listings.length} pending</span>
        </div>

        <div className="table-wrap">
          {loading ? (
            <div className="loading-state"><div className="spinner" /></div>
          ) : listings.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">✅</div>
              <div className="empty-state-text">No pending listings to review</div>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Title</th>
                  <th>Location</th>
                  <th>Price / mo</th>
                  <th>Landlord</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => (
                  <tr
                    key={listing._id}
                    className={exitIds.has(listing._id) ? 'table-row-exit' : ''}
                  >
                    <td><strong>{listing.title}</strong></td>
                    <td>
                      <span style={{ color: 'var(--t2)', fontSize: '.875rem' }}>
                        📍 {listing.location}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: 'var(--green)', fontWeight: 600 }}>
                        BDT {listing.price?.toLocaleString()}
                      </span>
                    </td>
                    <td>
                      <span>{listing.landlordId?.firstName} {listing.landlordId?.lastName}</span>
                      <span className="td-sub">{listing.landlordId?.email}</span>
                    </td>
                    <td>
                      <div className="btn-actions">
                        <button
                          id={`preview-listing-${listing._id}`}
                          className="btn btn-preview"
                          onClick={() => setPreviewListing(listing)}
                        >
                          👁 Preview
                        </button>
                        <button
                          id={`approve-listing-${listing._id}`}
                          className="btn btn-approve"
                          onClick={() => handleAction(listing._id, 'approved')}
                          disabled={actionId === listing._id}
                        >
                          ✓ Approve
                        </button>
                        <button
                          id={`reject-listing-${listing._id}`}
                          className="btn btn-reject"
                          onClick={() => handleAction(listing._id, 'rejected')}
                          disabled={actionId === listing._id}
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

      {/* Listing preview modal — no /listings/:id navigation */}
      {previewListing && (
        <ListingPreviewModal
          listing={previewListing}
          onClose={() => setPreviewListing(null)}
        />
      )}
    </>
  );
}
