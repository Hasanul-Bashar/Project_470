import { useState, useRef, useEffect } from 'react';

/**
 * VirtualTourViewer Component
 * Handles:
 * 1. YouTube video tours (extracts ID and embeds cleanly)
 * 2. 360° Panorama Images (interactive click-drag panning, zoom, auto-rotation)
 * 3. 3D Tour / iFrame embeds (Matterport, Kuula, Google Street View)
 */
export default function VirtualTourViewer({ isOpen, onClose, tourUrl, tourType = 'youtube', title = 'Property Virtual Tour' }) {
  if (!isOpen || !tourUrl) return null;

  // 360 Image interactive panorama state
  const [posX, setPosX] = useState(50); // percentage 0-100
  const [posY, setPosY] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  // Auto-rotate 360 image slowly when enabled and not dragging
  useEffect(() => {
    if (tourType !== 'image360' || !autoRotate || isDragging) return;
    const interval = setInterval(() => {
      setPosX((prev) => (prev + 0.15) % 100);
    }, 50);
    return () => clearInterval(interval);
  }, [tourType, autoRotate, isDragging]);

  // Drag listeners for 360° image
  const handleMouseDown = (e) => {
    if (tourType !== 'image360') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging || tourType !== 'image360') return;
    const deltaX = (e.clientX - dragStart.x) * 0.1;
    const deltaY = (e.clientY - dragStart.y) * 0.1;

    setPosX((prev) => {
      let next = prev - deltaX;
      if (next < 0) next += 100;
      if (next > 100) next -= 100;
      return next;
    });

    setPosY((prev) => Math.max(10, Math.min(90, prev - deltaY)));
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Helper to get sanitized embed URL for YouTube
  const getYouTubeEmbedUrl = (url) => {
    if (!url) return '';
    try {
      if (url.includes('embed/')) {
        return url;
      }
      let videoId = '';
      if (url.includes('youtu.be/')) {
        videoId = url.split('youtu.be/')[1]?.split('?')[0];
      } else if (url.includes('watch?v=')) {
        videoId = url.split('watch?v=')[1]?.split('&')[0];
      } else if (url.includes('shorts/')) {
        videoId = url.split('shorts/')[1]?.split('?')[0];
      }
      return videoId ? `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0` : url;
    } catch {
      return url;
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen?.().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      className="modal-backdrop virtual-tour-backdrop"
      onClick={onClose}
      style={{
        zIndex: 9999,
        background: 'rgba(5, 7, 15, 0.88)',
        backdropFilter: 'blur(8px)',
      }}
    >
      <div
        ref={containerRef}
        className="virtual-tour-modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '94%',
          maxWidth: '1020px',
          background: '#0d1117',
          borderRadius: '16px',
          border: '1px solid #30363d',
          boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.7)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Modal Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '1rem 1.4rem',
            background: '#161b22',
            borderBottom: '1px solid #21262d',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.4rem' }}>🎬</span>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: '#f0f6fc', fontWeight: 600 }}>
                {title}
              </h3>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '2px', alignItems: 'center' }}>
                <span
                  style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    padding: '2px 8px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    background:
                      tourType === 'image360'
                        ? '#3b82f622'
                        : tourType === 'youtube'
                        ? '#ef444422'
                        : '#10b98122',
                    color:
                      tourType === 'image360'
                        ? '#60a5fa'
                        : tourType === 'youtube'
                        ? '#f87171'
                        : '#34d399',
                    border: `1px solid ${
                      tourType === 'image360'
                        ? '#3b82f644'
                        : tourType === 'youtube'
                        ? '#ef444444'
                        : '#10b98144'
                    }`,
                  }}
                >
                  {tourType === 'image360'
                    ? '360° Panorama'
                    : tourType === 'youtube'
                    ? 'YouTube Video Tour'
                    : 'Interactive 3D Tour'}
                </span>
                {tourType === 'image360' && (
                  <span style={{ fontSize: '0.75rem', color: '#8b949e' }}>
                    🖱️ Click & Drag to look around
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {tourType === 'image360' && (
              <>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setAutoRotate(!autoRotate)}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  title="Toggle Auto-Rotation"
                >
                  {autoRotate ? '⏸ Pause Spin' : '▶ Auto Spin'}
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setZoom((z) => Math.min(2, z + 0.2))}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  title="Zoom In"
                >
                  🔍 +
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => setZoom((z) => Math.max(0.8, z - 0.2))}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  title="Zoom Out"
                >
                  🔍 -
                </button>
                <button
                  className="btn btn-sm btn-outline"
                  onClick={() => {
                    setZoom(1);
                    setPosX(50);
                    setPosY(50);
                  }}
                  style={{ fontSize: '0.75rem', padding: '4px 8px' }}
                  title="Reset View"
                >
                  ↺ Reset
                </button>
              </>
            )}

            <button
              className="btn btn-sm btn-outline"
              onClick={toggleFullscreen}
              style={{ fontSize: '0.75rem', padding: '4px 8px' }}
              title="Toggle Fullscreen"
            >
              ⛶ Fullscreen
            </button>

            <button
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#8b949e',
                fontSize: '1.6rem',
                cursor: 'pointer',
                lineHeight: 1,
                padding: '0 6px',
              }}
              title="Close Viewer"
            >
              ×
            </button>
          </div>
        </div>

        {/* Media Viewport Area */}
        <div
          style={{
            position: 'relative',
            width: '100%',
            height: isFullscreen ? 'calc(100vh - 65px)' : '580px',
            background: '#010409',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            userSelect: 'none',
            overflow: 'hidden',
          }}
        >
          {/* 1. YouTube Tour */}
          {tourType === 'youtube' && (
            <iframe
              src={getYouTubeEmbedUrl(tourUrl)}
              title={title}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          )}

          {/* 2. 360° Panorama Image */}
          {tourType === 'image360' && (
            <div
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
              style={{
                width: '100%',
                height: '100%',
                cursor: isDragging ? 'grabbing' : 'grab',
                backgroundImage: `url(${tourUrl})`,
                backgroundPosition: `${posX}% ${posY}%`,
                backgroundSize: `${zoom * 220}% auto`,
                backgroundRepeat: 'repeat-x',
                transition: isDragging ? 'none' : 'background-position 0.1s linear',
              }}
            >
              {/* Overlay Guidance */}
              <div
                style={{
                  position: 'absolute',
                  bottom: '16px',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  background: 'rgba(13, 17, 23, 0.75)',
                  backdropFilter: 'blur(6px)',
                  padding: '6px 14px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  color: '#e6edf3',
                  pointerEvents: 'none',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                🔄 360° Interactive Panorama &nbsp;|&nbsp; Click & drag horizontally to rotate
              </div>
            </div>
          )}

          {/* 3. 3D Tour / Generic iFrame Embed (Matterport, Kuula, etc.) */}
          {tourType === 'iframe' && (
            <iframe
              src={tourUrl}
              title={title}
              style={{
                width: '100%',
                height: '100%',
                border: 'none',
              }}
              allow="accelerometer; gyroscope; vr; fullscreen"
              allowFullScreen
            />
          )}
        </div>
      </div>
    </div>
  );
}
