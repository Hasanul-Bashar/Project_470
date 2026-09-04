import { useState } from 'react';

export default function SpatialSearchFilter({ onFilterChange, onReset }) {
  const [query, setQuery] = useState('');
  const [minPrice, setMinPrice] = useState('');
  const [maxPrice, setMaxPrice] = useState('');
  const [minArea, setMinArea] = useState('');
  const [maxArea, setMaxArea] = useState('');
  const [propertyType, setPropertyType] = useState('All');
  const [furnishedStatus, setFurnishedStatus] = useState('All');
  const [radiusKm, setRadiusKm] = useState(15);
  const [useGeospatial, setUseGeospatial] = useState(true);
  const [userLat, setUserLat] = useState(23.777176);
  const [userLng, setUserLng] = useState(90.399452);
  const [polygonOnly, setPolygonOnly] = useState(false);
  const [sortBy, setSortBy] = useState('weighted');

  const applyFilters = () => {
    onFilterChange({
      query,
      minPrice,
      maxPrice,
      minArea,
      maxArea,
      propertyType,
      furnishedStatus,
      radiusKm: useGeospatial ? radiusKm : null,
      userLat: useGeospatial ? userLat : null,
      userLng: useGeospatial ? userLng : null,
      pointLat: polygonOnly ? userLat : null,
      pointLng: polygonOnly ? userLng : null,
      sortBy,
    });
  };

  const resetFilters = () => {
    setQuery('');
    setMinPrice('');
    setMaxPrice('');
    setMinArea('');
    setMaxArea('');
    setPropertyType('All');
    setFurnishedStatus('All');
    setRadiusKm(15);
    setUseGeospatial(true);
    setPolygonOnly(false);
    setSortBy('weighted');
    if (onReset) onReset();
  };

  return (
    <div
      style={{
        background: 'rgba(13, 20, 37, 0.85)',
        backdropFilter: 'blur(16px)',
        border: '1px solid rgba(139, 92, 246, 0.3)',
        borderRadius: '16px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 12px 32px rgba(0, 0, 0, 0.4)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            ⚡ Advanced Search & Geospatial Radius Engine
          </h3>
          <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.82rem', color: '#94a3b8' }}>
            Structured filtering with Haversine spatial radius search, polygon containment, and weighted score ranking.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            type="button"
            className="btn btn-secondary"
            style={{ padding: '0.4rem 0.85rem', fontSize: '0.8rem' }}
            onClick={resetFilters}
          >
            🔄 Reset
          </button>
          <button
            type="button"
            className="btn btn-primary"
            style={{ padding: '0.4rem 1.1rem', fontSize: '0.8rem' }}
            onClick={applyFilters}
          >
            🔍 Search Properties
          </button>
        </div>
      </div>

      {/* Grid Filter Inputs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}
      >
        {/* Search Keyword */}
        <div>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>Keyword / Location</label>
          <input
            type="text"
            className="form-input"
            placeholder="e.g. Dhanmondi, Studio, AC..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>

        {/* Price Range */}
        <div>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>Monthly Rent Range (BDT)</label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="number"
              className="form-input"
              placeholder="Min BDT"
              value={minPrice}
              onChange={(e) => setMinPrice(e.target.value)}
            />
            <input
              type="number"
              className="form-input"
              placeholder="Max BDT"
              value={maxPrice}
              onChange={(e) => setMaxPrice(e.target.value)}
            />
          </div>
        </div>

        {/* Area Range (sqft) */}
        <div>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>Area Size Range (sqft)</label>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <input
              type="number"
              className="form-input"
              placeholder="Min sqft"
              value={minArea}
              onChange={(e) => setMinArea(e.target.value)}
            />
            <input
              type="number"
              className="form-input"
              placeholder="Max sqft"
              value={maxArea}
              onChange={(e) => setMaxArea(e.target.value)}
            />
          </div>
        </div>

        {/* Property Type */}
        <div>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>Property Type</label>
          <select
            className="form-input"
            value={propertyType}
            onChange={(e) => setPropertyType(e.target.value)}
          >
            <option value="All">All Types</option>
            <option value="Apartment">Apartment</option>
            <option value="House">House</option>
            <option value="Sublet">Sublet</option>
            <option value="Studio">Studio</option>
            <option value="Villa">Villa</option>
            <option value="Commercial">Commercial</option>
          </select>
        </div>

        {/* Furnished Status */}
        <div>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>Furnished Status</label>
          <select
            className="form-input"
            value={furnishedStatus}
            onChange={(e) => setFurnishedStatus(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Furnished">Furnished</option>
            <option value="Unfurnished">Unfurnished</option>
            <option value="Semi-Furnished">Semi-Furnished</option>
          </select>
        </div>

        {/* Sorting Engine */}
        <div>
          <label className="form-label" style={{ fontSize: '0.78rem' }}>Ranking & Sorting</label>
          <select
            className="form-input"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="weighted">⭐ Best Match (Weighted Score)</option>
            <option value="distance">🚀 Distance (Closest First)</option>
            <option value="price_asc">💰 Price (Low to High)</option>
            <option value="price_desc">💎 Price (High to Low)</option>
          </select>
        </div>
      </div>

      {/* Geospatial Haversine & Polygon Controls */}
      <div
        style={{
          marginTop: '1rem',
          paddingTop: '0.85rem',
          borderTop: '1px dashed rgba(255, 255, 255, 0.1)',
          display: 'flex',
          flexWrap: 'wrap',
          gap: '1.25rem',
          alignItems: 'center',
        }}
      >
        {/* Toggle Spatial Radius */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.84rem', color: '#f8fafc' }}>
          <input
            type="checkbox"
            checked={useGeospatial}
            onChange={(e) => setUseGeospatial(e.target.checked)}
          />
          🌐 Geospatial Radius Search (Haversine)
        </label>

        {useGeospatial && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexGrow: 1, maxWidth: '350px' }}>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8', minWidth: '85px' }}>
              Radius: <strong style={{ color: '#38bdf8' }}>{radiusKm} km</strong>
            </span>
            <input
              type="range"
              min="1"
              max="25"
              value={radiusKm}
              onChange={(e) => setRadiusKm(Number(e.target.value))}
              style={{ flexGrow: 1, accentColor: 'var(--purple)' }}
            />
          </div>
        )}

        {/* Toggle Polygon Containment */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.84rem', color: '#f8fafc' }}>
          <input
            type="checkbox"
            checked={polygonOnly}
            onChange={(e) => setPolygonOnly(e.target.checked)}
          />
          📐 Point-in-Polygon Boundary Match Only
        </label>

        {/* GPS Locate Me Button */}
        <button
          type="button"
          className="btn btn-secondary"
          style={{ fontSize: '0.78rem', padding: '0.3rem 0.7rem' }}
          onClick={() => {
            if (navigator.geolocation) {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  setUserLat(Math.round(pos.coords.latitude * 1e6) / 1e6);
                  setUserLng(Math.round(pos.coords.longitude * 1e6) / 1e6);
                  setUseGeospatial(true);
                  applyFilters();
                },
                (err) => alert('GPS Error: ' + err.message)
              );
            }
          }}
        >
          🎯 Use My GPS Location ({userLat.toFixed(3)}, {userLng.toFixed(3)})
        </button>
      </div>
    </div>
  );
}
