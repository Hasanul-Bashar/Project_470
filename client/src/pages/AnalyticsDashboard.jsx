import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getMyAnalytics } from '../services/analyticsApi';

/**
 * View (V) — AnalyticsDashboard  (route: /landlord-analytics)
 * Displays:
 *   - Top KPI cards: total views, total requests, acceptance rate, total revenue
 *   - Per-listing breakdown table
 *   - Monthly revenue bar chart (pure HTML5 Canvas — no external lib)
 */

/* ── Canvas Bar Chart ─────────────────────────────────────────── */
function RevenueChart({ monthlyRevenue }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !monthlyRevenue?.length) return;

    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const dpr    = window.devicePixelRatio || 1;

    // Set logical vs physical size
    const W = canvas.offsetWidth;
    const H = canvas.offsetHeight;
    canvas.width  = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    // Colours (matching the existing dark-navy theme)
    const BG_CARD   = 'rgba(255,255,255,0.03)';
    const PURPLE    = '#8b5cf6';
    const PURPLE_L  = '#a78bfa';
    const TEAL      = '#22d3ee';
    const T2        = '#94a3b8';
    const T3        = '#64748b';
    const GRID      = 'rgba(255,255,255,0.05)';

    ctx.clearRect(0, 0, W, H);

    const PAD_L = 72, PAD_R = 24, PAD_T = 24, PAD_B = 48;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;

    const maxRev = Math.max(...monthlyRevenue.map((m) => m.revenue), 1);

    // Grid lines (5 horizontal)
    const gridCount = 5;
    ctx.font        = '11px Inter, system-ui, sans-serif';
    ctx.fillStyle   = T3;
    ctx.textAlign   = 'right';
    for (let gi = 0; gi <= gridCount; gi++) {
      const yVal = (maxRev / gridCount) * gi;
      const y    = PAD_T + chartH - (yVal / maxRev) * chartH;
      ctx.strokeStyle = GRID;
      ctx.lineWidth   = 1;
      ctx.beginPath();
      ctx.moveTo(PAD_L, y);
      ctx.lineTo(PAD_L + chartW, y);
      ctx.stroke();
      ctx.fillText(
        yVal >= 1000 ? `৳${(yVal / 1000).toFixed(0)}k` : `৳${Math.round(yVal)}`,
        PAD_L - 6, y + 4
      );
    }

    // Bars
    const barCount = monthlyRevenue.length;
    const totalBarW = chartW / barCount;
    const barW      = Math.min(totalBarW * 0.55, 36);

    monthlyRevenue.forEach((m, i) => {
      const barH  = (m.revenue / maxRev) * chartH;
      const x     = PAD_L + i * totalBarW + (totalBarW - barW) / 2;
      const y     = PAD_T + chartH - barH;

      // Gradient fill
      const grad = ctx.createLinearGradient(0, y, 0, y + barH);
      grad.addColorStop(0, PURPLE_L);
      grad.addColorStop(1, PURPLE);
      ctx.fillStyle = grad;

      // Rounded-top bar
      const r = Math.min(4, barW / 2, barH);
      if (barH > 0) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + barW - r, y);
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + r);
        ctx.lineTo(x + barW, y + barH);
        ctx.lineTo(x, y + barH);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
        ctx.fill();
      }

      // X-axis labels
      ctx.fillStyle   = T2;
      ctx.textAlign   = 'center';
      ctx.font        = '10px Inter, system-ui, sans-serif';
      ctx.fillText(m.label, x + barW / 2, PAD_T + chartH + 16);

      // Value label on top of bar (only if bar tall enough)
      if (barH > 22 && m.revenue > 0) {
        ctx.fillStyle = '#fff';
        ctx.font      = '10px Inter, system-ui, sans-serif';
        ctx.fillText(
          m.revenue >= 1000 ? `${(m.revenue / 1000).toFixed(0)}k` : String(Math.round(m.revenue)),
          x + barW / 2, y - 4
        );
      }
    });

    // Axis lines
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth   = 1;
    ctx.beginPath();
    ctx.moveTo(PAD_L, PAD_T);
    ctx.lineTo(PAD_L, PAD_T + chartH);
    ctx.lineTo(PAD_L + chartW, PAD_T + chartH);
    ctx.stroke();

  }, [monthlyRevenue]);

  return (
    <canvas
      ref={canvasRef}
      id="revenue-bar-chart"
      className="revenue-canvas"
      aria-label="Monthly revenue bar chart"
    />
  );
}

/* ── KPI Card ─────────────────────────────────────────────────── */
function KpiCard({ icon, label, value, sub, colorClass }) {
  return (
    <div className={`analytics-kpi-card ${colorClass || ''}`}>
      <div className="analytics-kpi-icon">{icon}</div>
      <div className="analytics-kpi-body">
        <div className="analytics-kpi-value">{value}</div>
        <div className="analytics-kpi-label">{label}</div>
        {sub && <div className="analytics-kpi-sub">{sub}</div>}
      </div>
    </div>
  );
}

/* ── Main Page ────────────────────────────────────────────────── */
export default function AnalyticsDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (user?.role !== 'landlord') {
      navigate('/landlord-dashboard');
      return;
    }
    (async () => {
      try {
        setLoading(true);
        const res = await getMyAnalytics();
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load analytics.');
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-loading">
          <div className="spinner" />
          <p>Loading your analytics…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-error">
          <p>❌ {error}</p>
          <button className="btn-primary" onClick={() => navigate('/landlord-dashboard')}>
            ← Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { kpis, perListing, monthlyRevenue } = data || {};

  return (
    <div className="analytics-page">
      <div className="analytics-inner">
        {/* Page header */}
        <div className="analytics-page-header">
          <div>
            <h1 className="analytics-page-title">📊 Landlord Analytics</h1>
            <p className="analytics-page-sub">Performance overview for all your properties</p>
          </div>
          <button
            className="btn-back-analytics"
            onClick={() => navigate('/landlord-dashboard')}
          >
            ← Dashboard
          </button>
        </div>

        {/* KPI Cards */}
        <div className="analytics-kpi-grid">
          <KpiCard
            icon="👁"
            label="Total Views"
            value={(kpis?.totalViews || 0).toLocaleString()}
            sub="across all listings"
            colorClass="kpi-purple"
          />
          <KpiCard
            icon="📋"
            label="Booking Requests"
            value={(kpis?.totalRequests || 0).toLocaleString()}
            sub="total received"
            colorClass="kpi-teal"
          />
          <KpiCard
            icon="✅"
            label="Acceptance Rate"
            value={`${kpis?.acceptanceRate ?? 0}%`}
            sub="of all requests"
            colorClass="kpi-green"
          />
          <KpiCard
            icon="💰"
            label="Total Revenue"
            value={`৳${(kpis?.totalRevenue || 0).toLocaleString()}`}
            sub="from approved bookings"
            colorClass="kpi-amber"
          />
        </div>

        {/* Monthly Revenue Chart */}
        <div className="analytics-chart-card">
          <h2 className="analytics-section-title">📈 Monthly Revenue (Last 12 Months)</h2>
          <div className="analytics-chart-wrap">
            {monthlyRevenue && monthlyRevenue.some((m) => m.revenue > 0) ? (
              <RevenueChart monthlyRevenue={monthlyRevenue} />
            ) : (
              <div className="analytics-chart-empty">
                <p>No revenue data yet. Revenue appears once bookings are approved.</p>
              </div>
            )}
          </div>
        </div>

        {/* Per-listing table */}
        <div className="analytics-table-card">
          <h2 className="analytics-section-title">🏠 Per-Listing Breakdown</h2>
          {!perListing || perListing.length === 0 ? (
            <p className="analytics-empty">No listings found.</p>
          ) : (
            <div className="analytics-table-wrap">
              <table className="analytics-table" id="per-listing-analytics-table">
                <thead>
                  <tr>
                    <th>Listing</th>
                    <th>Status</th>
                    <th>👁 Views</th>
                    <th>📋 Requests</th>
                    <th>✅ Accepted</th>
                    <th>❌ Rejected</th>
                    <th>📊 Accept Rate</th>
                    <th>💰 Revenue (BDT)</th>
                  </tr>
                </thead>
                <tbody>
                  {perListing.map((row) => (
                    <tr key={row.listingId}>
                      <td>
                        <div className="analytics-listing-title">{row.title}</div>
                        <div className="analytics-listing-loc">📍 {row.location}</div>
                      </td>
                      <td>
                        <span className={`status-badge status-${row.status}`}>
                          {row.status}
                        </span>
                      </td>
                      <td className="analytics-num">{row.views.toLocaleString()}</td>
                      <td className="analytics-num">{row.requests}</td>
                      <td className="analytics-num green">{row.accepted}</td>
                      <td className="analytics-num red">{row.rejected}</td>
                      <td>
                        <div className="analytics-rate-wrap">
                          <div className="analytics-rate-bar-track">
                            <div
                              className="analytics-rate-bar-fill"
                              style={{ width: `${row.acceptRate}%` }}
                            />
                          </div>
                          <span className="analytics-rate-pct">{row.acceptRate}%</span>
                        </div>
                      </td>
                      <td className="analytics-num amber">
                        ৳{row.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
