import { useState, useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

/**
 * Custom Red Map Pin Icon using Leaflet DivIcon
 */
const createPinIcon = () =>
  L.divIcon({
    className: 'custom-map-pin',
    html: `<div style="
      background: #ef4444;
      width: 26px;
      height: 26px;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      border: 2px solid #ffffff;
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
    "><div style="width: 8px; height: 8px; background: white; border-radius: 50%;"></div></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 26],
  });

/**
 * Real Geospatial Interactive Map using OpenStreetMap tiles & Leaflet.
 * Displays interactive maps, property pins, and neighborhood polygon boundaries.
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
  const [latInput, setLatInput] = useState(coordinates?.lat || 23.777176);
  const [lngInput, setLngInput] = useState(coordinates?.lng || 90.399452);
  const [polyPoints, setPolyPoints] = useState(polygon || []);

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const layerGroupRef = useRef(null);

  useEffect(() => {
    const lat = coordinates?.lat || 23.777176;
    const lng = coordinates?.lng || 90.399452;
    setLatInput(lat);
    setLngInput(lng);
  }, [coordinates?.lat, coordinates?.lng]);

  useEffect(() => {
    setPolyPoints(polygon || []);
  }, [polygon]);

  // Initialize Leaflet Map Instance
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [latInput, lngInput],
        zoom: 14,
        zoomControl: true,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      const layerGroup = L.layerGroup().addTo(map);
      layerGroupRef.current = layerGroup;
      mapInstanceRef.current = map;

      // Handle map click events
      map.on('click', (e) => {
        if (readOnly) return;
        const clickedLat = Math.round(e.latlng.lat * 1e6) / 1e6;
        const clickedLng = Math.round(e.latlng.lng * 1e6) / 1e6;

        if (interactiveMode === 'coordinates') {
          setLatInput(clickedLat);
          setLngInput(clickedLng);
          if (onCoordinatesChange) onCoordinatesChange({ lat: clickedLat, lng: clickedLng });
        } else {
          setPolyPoints((prev) => {
            const updated = [...prev, { lat: clickedLat, lng: clickedLng }];
            if (onPolygonChange) onPolygonChange(updated);
            return updated;
          });
        }
      });
    }

    const timer = setTimeout(() => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Update map view & layers on state changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    const layerGroup = layerGroupRef.current;
    if (!map || !layerGroup) return;

    map.setView([latInput, lngInput]);
    layerGroup.clearLayers();

    // 1. Property Pin Marker
    const pinMarker = L.marker([latInput, lngInput], { icon: createPinIcon() });
    pinMarker.bindTooltip('📍 Property Location', { permanent: false, direction: 'top' });
    layerGroup.addLayer(pinMarker);

    // 2. Neighborhood Polygon Boundary
    if (polyPoints.length > 0) {
      const polygonCoords = polyPoints.map((pt) => [pt.lat, pt.lng]);
      if (polyPoints.length >= 3) {
        const polyLayer = L.polygon(polygonCoords, {
          color: '#c084fc',
          weight: 3,
          fillColor: '#8b5cf6',
          fillOpacity: 0.35,
        });
        layerGroup.addLayer(polyLayer);
      } else if (polyPoints.length === 2) {
        const polylineLayer = L.polyline(polygonCoords, { color: '#c084fc', weight: 3 });
        layerGroup.addLayer(polylineLayer);
      }

      polyPoints.forEach((pt, index) => {
        const circle = L.circleMarker([pt.lat, pt.lng], {
          radius: 6,
          color: '#ffffff',
          weight: 2,
          fillColor: '#a855f7',
          fillOpacity: 1,
        });
        circle.bindTooltip(`Vertex P${index + 1}`);
        layerGroup.addLayer(circle);
      });
    }
  }, [latInput, lngInput, polyPoints]);

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
            💡 <strong>Interactive Map:</strong> Click anywhere on the map to plot property polygon points or update location.
          </span>
        </div>
      )}

      {/* Leaflet Map Container */}
      <div style={{ position: 'relative', width: '100%', height }}>
        <div
          ref={mapContainerRef}
          style={{
            width: '100%',
            height: '100%',
            zIndex: 1,
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
            zIndex: 1000,
            pointerEvents: 'none',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></span>
            Property Location Pin
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
