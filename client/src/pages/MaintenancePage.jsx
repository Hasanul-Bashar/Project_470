import Header from '../components/Header';
import MaintenanceTracker from '../components/maintenance/MaintenanceTracker';

export default function MaintenancePage() {
  return (
    <div className="page-wrapper" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      <main className="container" style={{ flex: 1, padding: '2rem 1rem' }}>
        <div className="dashboard-header" style={{ marginBottom: '1rem' }}>
          <h1 className="page-title">🛠️ Maintenance Request Submission & Tracking</h1>
          <p className="page-subtitle">
            Tenants report maintenance issues with photos & categories. Landlords manage repair stages from submission to resolution.
          </p>
        </div>

        <MaintenanceTracker />
      </main>
    </div>
  );
}
