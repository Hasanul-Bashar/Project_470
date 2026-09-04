import { useState } from 'react';
import { uploadPhotos } from '../services/listingsApi';
import { getImageUrl, PLACEHOLDER_IMAGE } from '../utils/imageUtils';

export default function ImageUpload({ photos = [], onChange }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    setUploading(true);
    setError('');

    try {
      // First try backend upload endpoint
      const formData = new FormData();
      files.forEach((file) => formData.append('photos', file));

      const res = await uploadPhotos(formData);
      if (res.data?.photos && res.data.photos.length > 0) {
        onChange([...photos, ...res.data.photos]);
      }
    } catch (err) {
      console.warn('⚠️ Server upload endpoint fallback to Base64 data URLs:', err.message);
      // Fallback: Read files as Base64 data URLs
      const base64Promises = files.map((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target.result);
          reader.onerror = (error) => reject(error);
          reader.readAsDataURL(file);
        });
      });

      try {
        const base64Images = await Promise.all(base64Promises);
        onChange([...photos, ...base64Images]);
      } catch (readErr) {
        setError('Failed to process image files.');
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = (index) => {
    const updated = photos.filter((_, i) => i !== index);
    onChange(updated);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>📸 Property Images & Photos (Max 5)</span>
        <span style={{ fontSize: '0.78rem', color: '#94a3b8' }}>{photos.length} uploaded</span>
      </label>

      {/* Upload Box */}
      <div
        style={{
          border: '2px dashed rgba(139, 92, 246, 0.4)',
          borderRadius: '12px',
          padding: '1.25rem',
          textAlign: 'center',
          background: 'rgba(139, 92, 246, 0.04)',
          cursor: 'pointer',
          position: 'relative',
          transition: 'all 0.2s',
        }}
      >
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileSelect}
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0,
            cursor: 'pointer',
            width: '100%',
            height: '100%',
          }}
          disabled={uploading}
        />

        {uploading ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', color: 'var(--purple)' }}>
            <div className="spinner" style={{ width: '18px', height: '18px' }}></div>
            <span style={{ fontSize: '0.88rem', fontWeight: 600 }}>Uploading property photos...</span>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.25rem' }}>🖼️</div>
            <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#f8fafc' }}>
              Click or Drag & Drop images to upload
            </div>
            <div style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: '0.2rem' }}>
              Supports JPG, PNG, WEBP (Max 10MB per image)
            </div>
          </div>
        )}
      </div>

      {error && <div style={{ color: '#f87171', fontSize: '0.8rem' }}>{error}</div>}

      {/* Image Thumbnails Grid */}
      {photos.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))',
            gap: '0.65rem',
            marginTop: '0.5rem',
          }}
        >
          {photos.map((url, idx) => (
            <div
              key={idx}
              style={{
                position: 'relative',
                borderRadius: '8px',
                overflow: 'hidden',
                height: '80px',
                border: '1px solid rgba(255, 255, 255, 0.15)',
              }}
            >
              <img
                src={getImageUrl(url)}
                alt={`Property photo ${idx + 1}`}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = PLACEHOLDER_IMAGE;
                }}
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(idx)}
                style={{
                  position: 'absolute',
                  top: '4px',
                  right: '4px',
                  background: 'rgba(239, 68, 68, 0.85)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '50%',
                  width: '20px',
                  height: '20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                }}
                title="Remove image"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
