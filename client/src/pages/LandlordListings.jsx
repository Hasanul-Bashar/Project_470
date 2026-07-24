import { useState, useEffect } from 'react';
import { getListings, createListing, updateListingAvailability } from '../services/listingsApi';
import Modal from '../components/Modal';
import AvailabilityCalendar from '../components/admin/AvailabilityCalendar';

export default function LandlordListings() {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeCalendarListing, setActiveCalendarListing] = useState(null);

  // Add listing form state
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [amenities, setAmenities] = useState('');
  
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      const res = await getListings();
      setListings(res.data);
    } catch (err) {
      setError('Failed to load listings.');
      showToast('Error loading properties', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleAddListing = async (e) => {
    e.preventDefault();
    if (!title || !location || !description || !price) {
      showToast('Please fill out all required fields', 'error');
      return;
    }

    try {
      const amenitiesArray = amenities
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a !== '');

      await createListing({
        title,
        location,
        description,
        price: Number(price),
        amenities: amenitiesArray,
      });

      showToast('Property listing submitted for admin review!');
      setIsAddModalOpen(false);
      // Reset form
      setTitle('');
      setLocation('');
      setDescription('');
      setPrice('');
      setAmenities('');
      fetchListings();
    } catch (err) {
      showToast('Failed to create listing', 'error');
    }
  };

  const handleSaveAvailability = async (bookedDates) => {
    if (!activeCalendarListing) return;
    try {
      await updateListingAvailability(activeCalendarListing._id, bookedDates);
      showToast('Availability calendar updated successfully!');
      setActiveCalendarListing(null);
      fetchListings();
    } catch (err) {
      showToast('Failed to update availability', 'error');
    }
  };

  return (
    <div className="container">
      <div className="dashboard-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h1 className="page-title">My Properties</h1>
          <p className="page-subtitle">Manage your rental listings and block/unblock dates on the visual calendar.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
          ➕ Add Property
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p className="empty-state-text">Loading properties...</p>
        </div>
      ) : error ? (
        <div className="empty-state">
          <div className="empty-state-text">{error}</div>
        </div>
      ) : listings.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-icon">🏠</div>
          <p className="empty-state-text">No properties found. Click "Add Property" to submit your first listing!</p>
        </div>
      ) : (
        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem', marginTop: '1rem' }}>
          {listings.map((listing) => (
            <div key={listing._id} className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
              <div className="card-header" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem' }}>
                <h3 className="card-title" style={{ fontSize: '1.15rem', fontWeight: '700', marginBottom: '0.25rem' }}>
                  {listing.title}
                </h3>
                <p style={{ fontSize: '0.8rem', color: 'var(--t3)' }}>📍 {listing.location}</p>
              </div>
              <div className="card-body" style={{ flexGrow: 1, padding: '1rem 0' }}>
                <p style={{ fontSize: '0.875rem', color: 'var(--t2)', marginBottom: '1rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {listing.description}
                </p>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '800', color: 'var(--purple)' }}>
                    BDT {listing.price.toLocaleString()}/mo
                  </span>
                  <span className={`badge badge-${listing.status === 'approved' ? 'success' : listing.status === 'pending' ? 'warning' : 'danger'}`}>
                    {listing.status.toUpperCase()}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--t3)', borderTop: '1px dashed var(--border)', paddingTop: '0.75rem' }}>
                  📅 {listing.bookedDates ? listing.bookedDates.length : 0} Booked/Blocked dates
                </div>
              </div>
              <div className="card-footer" style={{ marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button
                  className="btn btn-secondary w-full"
                  onClick={() => setActiveCalendarListing(listing)}
                  style={{ width: '100%' }}
                >
                  🗓 Manage Availability
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Listing Modal */}
      {isAddModalOpen && (
        <Modal title="Add New Property Listing" onClose={() => setIsAddModalOpen(false)}>
          <form onSubmit={handleAddListing} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', padding: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Property Title *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Modern Studio in Dhanmondi"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Location / Address *</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Dhanmondi, Dhaka"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Monthly Rent (BDT) *</label>
              <input
                type="number"
                className="form-input"
                placeholder="e.g. 25000"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Amenities (Comma separated)</label>
              <input
                type="text"
                className="form-input"
                placeholder="WiFi, Generator, AC, Security"
                value={amenities}
                onChange={(e) => setAmenities(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Description *</label>
              <textarea
                className="form-textarea"
                placeholder="Describe your property in detail..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                required
              />
            </div>
            <div className="form-actions" style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Submit Listing
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Calendar Availability Modal */}
      {activeCalendarListing && (
        <Modal
          title={`Availability: ${activeCalendarListing.title}`}
          onClose={() => setActiveCalendarListing(null)}
        >
          <div style={{ padding: '1rem' }}>
            <AvailabilityCalendar
              initialBookedDates={activeCalendarListing.bookedDates}
              onSave={handleSaveAvailability}
              onCancel={() => setActiveCalendarListing(null)}
            />
          </div>
        </Modal>
      )}

      {/* Toasts */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}
    </div>
  );
}
