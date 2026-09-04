import { useState, useEffect, useRef } from 'react';

/**
 * Interactive Geospatial Map with Polygon Area Tagging & Geofencing Boundary Control.
 * Supports interactive coordinate selection, polygon drawing, and vertex editing.
 */
export default function PolygonMap({
  coordinates = { lat: 23.777176, lng: 90.399452 },
  polygon = [],
  onCoordinatesChange,
  onPolygonChange,
  readOnly = false,
  height = '340px',
  title = 'Property Location & Neighborhood Polygon Boundary',
  interactiveMode = 'both', // 'coordinates' | 'polygon' | 'both'
}) {
  const [activeTab, setActiveTab] = useState('map');
  const [latInput, setLatInput] = useState(coordinates?.lat || 23.777176);
  const [lngInput, setLngInput] = useState(coordinates?.lng || 90.399452);
  const [polyPoints, setPolyPoints] = useState(polygon || []);
  const canvasRef = useRef(null);

  useEffect(() => {
    setLatInput(coordinates?.lat || 23.777176);
    setLngInput(coordinates?.lng || 90.399452);
  }, [coordinates?.lat, coordinates?.lng]);

  useEffect(() => {
    setPolyPoints(polygon || []);
  }, [polygon]);

  // Handle canvas click to add polygon vertices or update pin location
  const handleCanvasClick = (e) => {
    if (readOnly) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Convert pixel click coordinates to relative lat/lng offsets around center
    const centerLat = parseFloat(latInput);
    const centerLng = parseFloat(lngInput);
    
    // Scale factor: width ~ 0.02 deg lng, height ~ 0.02 deg lat
    const deltaLng = ((x / rect.width) - 0.5) * 0.03;
    const deltaLat = (0.5 - (y / rect.height)) * 0.03;

    const clickedLat = Math.round((centerLat + deltaLat) * 1e6) / 1e6;
    const clickedLng = Math.round((centerLng + deltaLng) * 1e6) / 1e6;

    if (interactiveMode === 'coordinates') {
      setLatInput(clickedLat);
      setLngInput(clickedLng);
      if (onCoordinatesChange) onCoordinatesChange({ lat: clickedLat, lng: clickedLng });
    } else {
      // Add vertex to polygon boundary
      const updated = [...polyPoints, { lat: clickedLat, lng: clickedLng }];
      setPolyPoints(updated);
      if (onPolygonChange) onPolygonChange(updated);
    }
  };

  const clearPolygon = () => {
    setPolyPoints([]);
    if (onPolygonChange) onPolygonChange([]);
  };

  const handleManualCoordUpdate = (newLat, newLng) => {
    const latNum = parseFloat(newLat) || 23.777176;
    const lngNum = parseFloat(newLng) || 90.399452;
    setLatInput(latNum);
    setLngInput(lngNum);
    if (onCoordinatesChange) onCoordinatesChange({ lat: latNum, lng: lngNum });
  };

  // Render Canvas Map Grid + Polygon Overlay
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear background grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Draw map grid lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 30) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
    for (let y = 0; y < height; y += 30) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Helper: Map lat/lng to canvas pixel
    const centerLat = parseFloat(latInput);
    const centerLng = parseFloat(lngInput);

    const toPixel = (pt) => {
      const dLng = pt.lng - centerLng;
      const dLat = pt.lat - centerLat;
      const px = width / 2 + (dLng / 0.03) * width;
      const py = height / 2 - (dLat / 0.03) * height;
      return { x: px, y: py };
    };

    // Draw Polygon Area if present
    if (polyPoints.length > 0) {
      ctx.beginPath();
      const firstPx = toPixel(polyPoints[0]);
      ctx.moveTo(firstPx.x, firstPx.y);

      for (let i = 1; i < polyPoints.length; i++) {
        const p = toPixel(polyPoints[i]);
        ctx.lineTo(p.x, p.y);
      }

      if (polyPoints.length >= 3) {
        ctx.closePath();
        ctx.fillStyle = 'rgba(139, 92, 246, 0.25)';
        ctx.fill();
      }

      ctx.strokeStyle = '#c084fc';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Draw Polygon Vertices
      polyPoints.forEach((pt, index) => {
        const p = toPixel(pt);
        ctx.beginPath();
        ctx.arc(p.x, p.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = '#a855f7';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = '#ffffff';
        ctx.font = '10px sans-serif';
        ctx.fillText(`P${index + 1}`, p.x + 8, p.y + 3);
      });
    }

    // Draw Property Center Pin
    const centerPx = toPixel({ lat: centerLat, lng: centerLng });
    ctx.beginPath();
    ctx.arc(centerPx.x, centerPx.y, 8, 0, Math.PI * 2);
    ctx.fillStyle = '#ef4444';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(centerPx.x, centerPx.y, 14, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('📍 Property Pin', centerPx.x + 12, centerPx.y - 10);
  }, [latInput, lngInput, polyPoints]);

  return (
    <div
      style={{
        border: '1px solid rgba(255, 255, 255, 0.12)',
        borderRadius: '14px',
        overflow: 'hidden',
        background: 'rgba(13, 20, 37, 0.85)',
        backdropFilter: 'blur(12px)',
        marginBottom: '1rem',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '0.85rem 1.15rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '0.5rem',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.2rem' }}>🗺️</span>
          <span style={{ fontSize: '0.92rem', fontWeight: 700, color: '#f8fafc' }}>{title}</span>
        </div>

        {!readOnly && (
          <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
            <span
              style={{
                fontSize: '0.75rem',
                background: 'rgba(139, 92, 246, 0.15)',
                color: '#c084fc',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                padding: '0.2rem 0.5rem',
                borderRadius: '10px',
              }}
            >
              {polyPoints.length} Polygon Vertices
            </span>

            {polyPoints.length > 0 && (
              <button
                type="button"
                className="btn"
                style={{ padding: '0.25rem 0.6rem', fontSize: '0.78rem', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171' }}
                onClick={clearPolygon}
              >
                🗑️ Clear Boundary
              </button>
            )}
          </div>
        )}
      </div>

      {/* Map Control Instructions Bar */}
      {!readOnly && (
        <div
          style={{
            padding: '0.5rem 1rem',
            background: 'rgba(255, 255, 255, 0.03)',
            fontSize: '0.78rem',
            color: '#94a3b8',
            borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span>
            💡 <strong>Interactive Polygon Tagging:</strong> Click on the map canvas below to plot property neighborhood boundary points (min 3 points).
          </span>
          <div style={{ display: 'flex', gap: '0.4rem' }}>
            <button
              type="button"
              className={`btn ${interactiveMode === 'polygon' ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.2rem 0.5rem', fontSize: '0.74rem' }}
              onClick={() => {}}
            >
              📐 Polygon Mode
            </button>
          </div>
        </div>
      )}

      {/* Canvas Map Container */}
      <div style={{ position: 'relative', width: '100%', height }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={340}
          onClick={handleCanvasClick}
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
            cursor: readOnly ? 'default' : 'crosshair',
          }}
        />

        {/* Map Legend Overlay */}
        <div
          style={{
            position: 'absolute',
            bottom: '10px',
            left: '10px',
            background: 'rgba(15, 23, 42, 0.85)',
            backdropFilter: 'blur(8px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            padding: '0.4rem 0.65rem',
            fontSize: '0.72rem',
            color: '#cbd5e1',
            display: 'flex',
            gap: '0.85rem',
            pointerEvents: 'none',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
            Property Location
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '2px', background: '#c084fc' }}></span>
            Neighborhood Polygon
          </span>
        </div>
      </div>

      {/* Manual Lat/Lng & Location Controls */}
      {!readOnly && (
        <div
          style={{
            padding: '0.85rem 1.15rem',
            background: 'rgba(255, 255, 255, 0.02)',
            borderTop: '1px solid rgba(255, 255, 255, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#f8fafc' }}>
              📍 Quick Location Presets:
            </span>
            <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
              {[
                { name: 'Dhanmondi', lat: 23.7516, lng: 90.3774 },
                { name: 'Gulshan 2', lat: 23.7948, lng: 90.4143 },
                { name: 'Banani', lat: 23.7937, lng: 90.4047 },
                { name: 'Uttara', lat: 23.8724, lng: 90.3984 },
                { name: 'Mirpur', lat: 23.8069, lng: 90.3687 },
                { name: 'Farmgate', lat: 23.7580, lng: 90.3898 },
              ].map((loc) => (
                <button
                  key={loc.name}
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem', borderRadius: '12px' }}
                  onClick={() => handleManualCoordUpdate(loc.lat, loc.lng)}
                >
                  📍 {loc.name}
                </button>
              ))}

              <button
                type="button"
                className="btn btn-primary"
                style={{ padding: '0.2rem 0.65rem', fontSize: '0.75rem', borderRadius: '12px' }}
                onClick={() => {
                  if (navigator.geolocation) {
                    navigator.geolocation.getCurrentPosition(
                      (pos) => {
                        const lat = Math.round(pos.coords.latitude * 1e6) / 1e6;
                        const lng = Math.round(pos.coords.longitude * 1e6) / 1e6;
                        handleManualCoordUpdate(lat, lng);
                      },
                      (err) => alert('Geolocation failed: ' + err.message)
                    );
                  } else {
                    alert('Geolocation is not supported by your browser.');
                  }
                }}
              >
                🎯 Locate Me (GPS)
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Latitude (°N)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                value={latInput}
                onChange={(e) => handleManualCoordUpdate(e.target.value, lngInput)}
              />
            </div>
            <div>
              <label className="form-label" style={{ fontSize: '0.78rem' }}>Longitude (°E)</label>
              <input
                type="number"
                step="any"
                className="form-input"
                style={{ padding: '0.4rem 0.6rem', fontSize: '0.82rem' }}
                value={lngInput}
                onChange={(e) => handleManualCoordUpdate(latInput, e.target.value)}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
