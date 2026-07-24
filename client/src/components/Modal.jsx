import { useEffect } from 'react';

/**
 * Modal — reusable overlay component used by:
 *   - Listing preview in ListingQueue
 *   - Dispute detail in DisputeTable
 *
 * Props:
 *   title    — string shown in the modal header
 *   onClose  — function called when user clicks backdrop or ✕ button or presses Escape
 *   wide     — boolean, applies .modal-wide class for wider content (default: false)
 *   children — modal body content
 */
export default function Modal({ title, onClose, children, wide = false }) {
  // Close on Escape key; lock body scroll while open
  useEffect(() => {
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className={`modal-box${wide ? ' modal-wide' : ''}`}
        onClick={(e) => e.stopPropagation()} // prevent click-through to overlay
      >
        <div className="modal-header">
          <h2 className="modal-title">{title}</h2>
          <button
            className="modal-close"
            onClick={onClose}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
