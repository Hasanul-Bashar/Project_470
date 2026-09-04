import { useState, useEffect } from 'react';
import { getNearbyPlaces } from '../services/placesApi';

export default function NeighborhoodInfo({
  coordinates = { lat: 23.777176, lng: 90.399452 },
  propertyTitle = 'Property',
  manualFacilities = [],
}) {
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    fetchPlaces();
  }, [coordinates?.lat, coordinates?.lng]);

  const fetchPlaces = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await getNearbyPlaces(
        coordinates?.lat || 23.777176,
        coordinates?.lng || 90.399452,
        2000
      );
      setPlaces(res.data?.places || []);
    } catch (err) {
      console.error('Error fetching nearby places:', err);
      setError('Could not load neighborhood POI info.');
    } finally {
      setLoading(false);
    }
  };

  // Convert manualFacilities to POI object format
  const formattedManualPlaces = (manualFacilities || []).map((f, index) => ({
    id: `manual-${index}-${f.name}`,
    name: f.name,
    category: f.category || 'Schools',
    type: (f.category || 'school').toLowerCase(),
    rating: '5.0',
    address: 'Landlord Provided Facility',
    distanceKm: f.distance || 'Nearby',
    isManual: true,
  }));

  // Combine manual landlord facilities first, then auto-fetched POIs
  const combinedPlaces = [...formattedManualPlaces, ...places];

  const categories = ['All', 'Schools', 'Hospitals', 'Transport', 'Shopping'];

  const filteredPlaces = activeCategory === 'All'
    ? combinedPlaces
    : combinedPlaces.filter((p) => p.category === activeCategory);

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Schools': return '🏫';
      case 'Hospitals': return '🏥';
      case 'Transport': return '🚆';
      case 'Shopping': return '🛍️';
      default: return '📍';
    }
  };

  return (
    <div
      style={{
        border: '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '14px',
        padding: '1.25rem',
        background: 'rgba(13, 20, 37, 0.85)',
        backdropFilter: 'blur(16px)',
        marginTop: '1rem',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            🏢 Neighborhood & Nearby Facilities
          </h3>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
            Schools, hospitals, transit hubs & shopping nearby {propertyTitle} via Google Places API.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-secondary"
          style={{ padding: '0.3rem 0.7rem', fontSize: '0.78rem' }}
          onClick={fetchPlaces}
        >
          🔄 Refresh POIs
        </button>
      </div>

      {/* Category Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '0.4rem',
          flexWrap: 'wrap',
          marginBottom: '1rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          paddingBottom: '0.75rem',
        }}
      >
        {categories.map((cat) => (
          <button
            key={cat}
            type="button"
            className={`btn ${activeCategory === cat ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', borderRadius: '20px' }}
            onClick={() => setActiveCategory(cat)}
          >
            {getCategoryIcon(cat)} {cat} ({cat === 'All' ? combinedPlaces.length : combinedPlaces.filter((p) => p.category === cat).length})
          </button>
        ))}
      </div>

      {/* Places List Grid */}
      {loading ? (
        <div style={{ padding: '1.5rem 0', textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 0.5rem auto' }}></div>
          <span style={{ fontSize: '0.84rem', color: '#94a3b8' }}>Fetching Google Places neighborhood data...</span>
        </div>
      ) : error ? (
        <div style={{ color: '#f87171', fontSize: '0.85rem', padding: '0.5rem 0' }}>{error}</div>
      ) : filteredPlaces.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '1rem 0', color: '#94a3b8', fontSize: '0.85rem' }}>
          No facilities found in this category nearby.
        </div>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '0.75rem',
            maxHeight: '280px',
            overflowY: 'auto',
            paddingRight: '0.2rem',
          }}
        >
          {filteredPlaces.map((place) => (
            <div
              key={place.id}
              style={{
                padding: '0.85rem 1rem',
                borderRadius: '10px',
                background: place.isManual ? 'rgba(16, 185, 129, 0.06)' : 'rgba(255, 255, 255, 0.03)',
                border: place.isManual ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                gap: '0.75rem',
              }}
            >
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.2rem' }}>
                  <span style={{ fontSize: '1rem' }}>{getCategoryIcon(place.category)}</span>
                  <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 700, color: '#f8fafc' }}>
                    {place.name}
                  </h4>
                  {place.isManual && (
                    <span
                      style={{
                        fontSize: '0.68rem',
                        background: 'rgba(16, 185, 129, 0.2)',
                        color: 'var(--green)',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '8px',
                        fontWeight: 700,
                      }}
                    >
                      Landlord Entry
                    </span>
                  )}
                </div>
                <p style={{ margin: 0, fontSize: '0.78rem', color: '#94a3b8' }}>
                  📍 {place.address}
                </p>
                <span
                  style={{
                    fontSize: '0.72rem',
                    color: '#38bdf8',
                    fontWeight: 600,
                    display: 'inline-block',
                    marginTop: '0.3rem',
                  }}
                >
                  🚀 {typeof place.distanceKm === 'number' ? `${place.distanceKm} km away` : place.distanceKm}
                </span>
              </div>

              {place.rating && (
                <span
                  style={{
                    background: 'rgba(245, 158, 11, 0.15)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    padding: '0.15rem 0.45rem',
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    whiteSpace: 'nowrap',
                  }}
                >
                  ⭐ {place.rating}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
