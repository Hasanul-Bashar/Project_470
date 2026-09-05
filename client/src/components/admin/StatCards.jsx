import { useEffect, useState } from 'react';
import { getStats } from '../../services/adminApi';

/** Animated count-up that runs once when target is set */
function CountUp({ target, duration = 1100 }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const numericTarget = Number.isFinite(Number(target)) ? Number(target) : 0;
    if (numericTarget === 0) { setCount(0); return; }
    const start = performance.now();
    const tick  = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out: fast start, slow finish
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * numericTarget));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration]);

  return <>{count}</>;
}

/** Card definitions — key must match the API response field */
const CARDS = [
  { key: 'totalUsers',         label: 'Total Users',          icon: '👥', color: 'blue'   },
  { key: 'pendingLandlords',   label: 'Unverified Landlords', icon: '🏢', color: 'amber'  },
  { key: 'pendingListings',    label: 'Pending Listings',     icon: '📋', color: 'orange' },
  { key: 'openComplaints',     label: 'Active Complaints',    icon: '⚠️', color: 'red'    },
];

/**
 * StatCards — four KPI cards at the top of the Admin Dashboard.
 * Fetches data from GET /api/admin/stats and animates the count-up.
 * Re-mounting this component (via a key prop) triggers a fresh fetch.
 */
export default function StatCards() {
  const [stats, setStats] = useState({
    totalUsers: 0, unverifiedLandlords: 0, pendingListings: 0, activeComplaints: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then((res) => setStats(res.data))
      .catch((err) => console.error('Failed to load stats:', err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="stat-grid">
      {CARDS.map(({ key, label, icon, color }) => (
        <div key={key} className={`stat-card ${color}`}>
          <span className="stat-card-icon">{icon}</span>
          <div className="stat-card-value" id={`stat-${key}`}>
            {loading ? '—' : <CountUp target={stats[key]} />}
          </div>
          <div className="stat-card-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
