/**
 * View (V) — CompareBar
 * Sticky floating bar at the bottom of the UserDashboard showing
 * which properties are queued for comparison (1–3).
 * Props:
 *   selected   — array of listing objects (max 3)
 *   onRemove   — fn(listingId) removes a listing from selection
 *   onCompare  — fn() opens the CompareModal
 *   onClear    — fn() clears all selections
 */
export default function CompareBar({ selected, onRemove, onCompare, onClear }) {
  if (!selected || selected.length === 0) return null;

  return (
    <div className="compare-bar" role="region" aria-label="Property comparison bar">
      <div className="compare-bar-inner">
        <div className="compare-bar-slots">
          {[0, 1, 2].map((i) => {
            const item = selected[i];
            return (
              <div key={i} className={`compare-slot ${item ? 'filled' : 'empty'}`}>
                {item ? (
                  <>
                    <span className="compare-slot-title">{item.title}</span>
                    <span className="compare-slot-price">৳{item.price?.toLocaleString()}/mo</span>
                    <button
                      className="compare-slot-remove"
                      onClick={() => onRemove(item._id)}
                      aria-label={`Remove ${item.title} from comparison`}
                    >
                      ✕
                    </button>
                  </>
                ) : (
                  <span className="compare-slot-empty-label">+ Add property</span>
                )}
              </div>
            );
          })}
        </div>

        <div className="compare-bar-actions">
          {selected.length >= 2 && (
            <button
              id="btn-open-compare-modal"
              className="btn-compare-now"
              onClick={onCompare}
            >
              ⚖️ Compare {selected.length}
            </button>
          )}
          <button className="btn-compare-clear" onClick={onClear} aria-label="Clear comparison">
            Clear
          </button>
        </div>
      </div>
    </div>
  );
}
