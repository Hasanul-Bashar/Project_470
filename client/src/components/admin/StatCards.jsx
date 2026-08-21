import { useState, useEffect } from 'react';
import { getStats } from '../../services/adminApi';

/** Animated count-up that runs once when target is set */
function CountUp({ target = 0, duration = 1100 }) {
  const numericTarget = Number(target) || 0;
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (numericTarget === 0) {
      setCount(0);
      return;
    }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      // Ease-out: fast start, slow finish
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.floor(eased * numericTarget));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [numericTarget, duration]);

  return <>{count}</>;
}

/** Card definitions — matching backend response keys */
const CARDS = [
  { key: 'totalUsers', label: 'Total Users', icon: '👥', color: 'blue' },
  { key: 'unverifiedLandlords', label: 'Unverified Landlords', icon: '🏢', color: 'amber' },
  { key: 'pendingListings', label: 'Pending Listings', icon: '📋', color: 'orange' },
  { key: 'activeComplaints', label: 'Active Complaints', icon: '⚠️', color: 'red' },
];

/**
 * StatCards — four KPI cards at the top of the Admin Dashboard.
 * Fetches data from GET /api/admin/stats and animates the count-up.
 */
export default function StatCards() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    unverifiedLandlords: 0,
    pendingLandlords: 0,
    pendingListings: 0,
    activeComplaints: 0,
    openComplaints: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getStats()
      .then((res) => {
        if (res.data) {
          setStats({
            totalUsers: res.data.totalUsers ?? 0,
            unverifiedLandlords: res.data.unverifiedLandlords ?? res.data.pendingLandlords ?? 0,
            pendingListings: res.data.pendingListings ?? 0,
            activeComplaints: res.data.activeComplaints ?? res.data.openComplaints ?? 0,
          });
        }
      })
      .catch((err) => console.error('Failed to load stats:', err.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="stat-grid">
      {CARDS.map(({ key, label, icon, color }) => (
        <div key={key} className={`stat-card ${color}`}>
          <span className="stat-card-icon">{icon}</span>
          <div className="stat-card-value" id={`stat-${key}`}>
            {loading ? '—' : <CountUp target={stats[key] ?? 0} />}
          </div>
          <div className="stat-card-label">{label}</div>
        </div>
      ))}
    </div>
  );
}
