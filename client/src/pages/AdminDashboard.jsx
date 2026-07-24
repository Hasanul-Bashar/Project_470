import { useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import StatCards from '../components/admin/StatCards';
import LandlordTable from '../components/admin/LandlordTable';
import ListingQueue from '../components/admin/ListingQueue';

/**
 * AdminDashboard — assembles the three admin management sections:
 *   1. StatCards      — live KPI overview
 *   2. LandlordTable  — landlord verification queue
 *   3. ListingQueue   — listing approval queue
 *
 * Shown only when role === 'admin'. Non-admins see a friendly lock screen
 * with instructions to use the role switcher.
 */
export default function AdminDashboard() {
  const { user } = useAuth();

  // statsKey: changing it remounts StatCards, triggering a fresh fetch
  const [statsKey, setStatsKey] = useState(0);
  const refreshStats = useCallback(() => setStatsKey((k) => k + 1), []);

  // ── Role gate ─────────────────────────────────────────────────
  if (user?.role !== 'admin') {
    return (
      <div className="container">
        <div className="empty-state" style={{ marginTop: '5rem' }}>
          <div className="empty-state-icon">🔒</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: '.5rem' }}>
            Admin Access Required
          </h2>
          <div className="empty-state-text">
            Use the <strong style={{ color: 'var(--purple)' }}>🛡 Admin</strong> toggle
            in the top-right header to switch roles and view the dashboard.
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 className="page-title">Admin Dashboard</h1>
      <p className="page-subtitle">
        Platform overview — manage landlord verification, listing approvals, and dispute stats
      </p>

      {/* ── 1. KPI Stat Cards ─────────────────────────────────── */}
      <StatCards key={statsKey} />

      {/* ── 2. Landlord Verification ──────────────────────────── */}
      <h2 className="section-title">Landlord Verification</h2>
      <LandlordTable onAction={refreshStats} />

      {/* ── 3. Listing Approval Queue ─────────────────────────── */}
      <h2 className="section-title">Listing Approval Queue</h2>
      <ListingQueue onAction={refreshStats} />
    </div>
  );
}
