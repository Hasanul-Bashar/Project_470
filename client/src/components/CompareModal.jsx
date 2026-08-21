import { useState, useCallback } from 'react';

/**
 * View (V) — CompareModal
 * Side-by-side property comparison with:
 *  - Min-max normalization across the selected set for each dimension
 *  - Live weight sliders (Price importance, Size, Amenities, Location)
 *  - Weighted composite score bar updated on every slider drag
 *  - Rank badges (🥇 🥈 🥉)
 *
 * Props:
 *   listings — array of 2–3 listing objects to compare
 *   onClose  — fn() close handler
 */

const MEDALS = ['🥇', '🥈', '🥉'];

/** Min-max normalize an array of numbers. Returns score in [0, 1]. */
function minMaxNorm(values) {
  const mn = Math.min(...values);
  const mx = Math.max(...values);
  if (mx === mn) return values.map(() => 0.5); // all equal → tie
  return values.map((v) => (v - mn) / (mx - mn));
}

/**
 * For price: LOWER is BETTER → invert after normalizing.
 * For size, amenities, location-proxy: higher is better.
 */
function buildScores(listings, weights) {
  const prices     = listings.map((l) => l.price || 0);
  const sizes      = listings.map((l) => l.size || 0);
  const amenities  = listings.map((l) => (l.amenities || []).length);
  // Location proxy: use string length as a stable stand-in when no coords
  // (longer descriptive location → more detail → treated as better in this demo)
  const locScores  = listings.map((l) => (l.location || '').length);

  const normPrice    = minMaxNorm(prices).map((v) => 1 - v); // invert: cheaper = better
  const normSize     = minMaxNorm(sizes);
  const normAmenity  = minMaxNorm(amenities);
  const normLoc      = minMaxNorm(locScores);

  // Normalise weights to sum to 1
  const total = weights.price + weights.size + weights.amenities + weights.location;
  const w = total === 0
    ? { price: 0.25, size: 0.25, amenities: 0.25, location: 0.25 }
    : {
        price:     weights.price     / total,
        size:      weights.size      / total,
        amenities: weights.amenities / total,
        location:  weights.location  / total,
      };

  return listings.map((_, i) =>
    normPrice[i]   * w.price +
    normSize[i]    * w.size +
    normAmenity[i] * w.amenities +
    normLoc[i]     * w.location
  );
}

/** Render star rating display */
function Stars({ count }) {
  return (
    <span className="star-row">
      {[1,2,3,4,5].map((n) => (
        <span key={n} className={n <= count ? 'star filled' : 'star empty'}>★</span>
      ))}
    </span>
  );
}

export default function CompareModal({ listings, onClose }) {
  const [weights, setWeights] = useState({
    price:     70,
    size:      50,
    amenities: 60,
    location:  40,
  });

  const scores = buildScores(listings, weights);

  // Rank: highest score → rank 0 (🥇)
  const ranked = [...scores.map((s, i) => ({ i, s }))]
    .sort((a, b) => b.s - a.s)
    .map((r, rank) => ({ ...r, rank }));
  const rankOf = (i) => ranked.find((r) => r.i === i)?.rank ?? 0;

  const handleWeight = useCallback((key, val) => {
    setWeights((prev) => ({ ...prev, [key]: Number(val) }));
  }, []);

  const SliderRow = ({ label, wKey }) => (
    <div className="compare-slider-row">
      <label className="compare-slider-label">
        <span>{label}</span>
        <span className="compare-slider-pct">{weights[wKey]}%</span>
      </label>
      <input
        type="range" min={0} max={100} step={5}
        value={weights[wKey]}
        onChange={(e) => handleWeight(wKey, e.target.value)}
        className="compare-slider"
        aria-label={`${label} weight`}
      />
    </div>
  );

  return (
    <div className="compare-overlay" role="dialog" aria-modal="true" aria-label="Property Comparison">
      <div className="compare-modal">
        {/* Header */}
        <div className="compare-modal-header">
          <h2 className="compare-modal-title">⚖️ Property Comparison</h2>
          <button className="compare-modal-close" onClick={onClose} aria-label="Close comparison">✕</button>
        </div>

        <div className="compare-modal-body">
          {/* Left: weight controls */}
          <div className="compare-controls">
            <h3 className="compare-controls-title">Priority Weights</h3>
            <p className="compare-controls-sub">Drag to adjust what matters most</p>
            <SliderRow label="💰 Price (lower = better)" wKey="price" />
            <SliderRow label="📐 Size (sqft)"             wKey="size" />
            <SliderRow label="🛎 Amenities"               wKey="amenities" />
            <SliderRow label="📍 Location detail"         wKey="location" />

            <div className="compare-legend">
              <div className="compare-legend-item"><span className="badge-gold">🥇</span> Best match</div>
              <div className="compare-legend-item"><span className="badge-silver">🥈</span> Runner-up</div>
              {listings.length === 3 && (
                <div className="compare-legend-item"><span className="badge-bronze">🥉</span> Third</div>
              )}
            </div>
          </div>

          {/* Right: comparison table */}
          <div className="compare-table-wrap">
            {/* Column headers */}
            <div className="compare-col-headers" style={{ gridTemplateColumns: `140px repeat(${listings.length}, 1fr)` }}>
              <div />
              {listings.map((l, i) => {
                const rank = rankOf(i);
                return (
                  <div key={l._id} className={`compare-col-header rank-${rank}`}>
                    <span className="compare-medal">{MEDALS[rank]}</span>
                    <span className="compare-col-title">{l.title}</span>
                    <span className="compare-col-loc">📍 {l.location}</span>
                  </div>
                );
              })}
            </div>

            {/* Data rows */}
            {[
              {
                label: '💰 Rent / month',
                render: (l) => `৳${(l.price || 0).toLocaleString()}`,
                highlight: (vals) => {
                  const mn = Math.min(...vals.map((v) => v.raw));
                  return (l, raw) => raw === mn ? 'cell-best' : '';
                },
                raw: (l) => l.price || 0,
              },
              {
                label: '📐 Size',
                render: (l) => l.size ? `${l.size.toLocaleString()} sqft` : '—',
                raw: (l) => l.size || 0,
                highlight: (vals) => {
                  const mx = Math.max(...vals.map((v) => v.raw));
                  return (l, raw) => (mx > 0 && raw === mx) ? 'cell-best' : '';
                },
              },
              {
                label: '🛎 Amenities',
                render: (l) => {
                  const items = l.amenities || [];
                  return items.length > 0
                    ? (<><strong>{items.length}</strong> — {items.slice(0, 3).join(', ')}{items.length > 3 ? '…' : ''}</>)
                    : '—';
                },
                raw: (l) => (l.amenities || []).length,
                highlight: (vals) => {
                  const mx = Math.max(...vals.map((v) => v.raw));
                  return (l, raw) => (mx > 0 && raw === mx) ? 'cell-best' : '';
                },
              },
              {
                label: '📍 Location',
                render: (l) => l.location || '—',
                raw: (l) => (l.location || '').length,
                highlight: () => () => '',
              },
            ].map((row) => {
              const raws = listings.map((l) => ({ l, raw: row.raw(l) }));
              const hFn = row.highlight(raws);
              return (
                <div
                  key={row.label}
                  className="compare-row"
                  style={{ gridTemplateColumns: `140px repeat(${listings.length}, 1fr)` }}
                >
                  <div className="compare-row-label">{row.label}</div>
                  {listings.map((l, i) => (
                    <div key={l._id} className={`compare-cell ${hFn(l, raws[i].raw)}`}>
                      {row.render(l)}
                    </div>
                  ))}
                </div>
              );
            })}

            {/* Score row */}
            <div
              className="compare-row compare-score-row"
              style={{ gridTemplateColumns: `140px repeat(${listings.length}, 1fr)` }}
            >
              <div className="compare-row-label">🏆 Score</div>
              {listings.map((l, i) => {
                const rank  = rankOf(i);
                const score = scores[i];
                return (
                  <div key={l._id} className={`compare-cell compare-score-cell rank-${rank}`}>
                    <div className="score-value">{(score * 100).toFixed(0)}</div>
                    <div className="score-bar-track">
                      <div
                        className={`score-bar-fill rank-${rank}`}
                        style={{ width: `${score * 100}%` }}
                      />
                    </div>
                    <div className="score-medal">{MEDALS[rank]}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
