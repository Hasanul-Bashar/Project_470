import RentTracker from '../components/rent/RentTracker';
import { useAuth } from '../context/AuthContext';

export default function RentTrackingPage() {
  const { user } = useAuth();

  return (
    <div className="container" style={{ paddingBottom: '4rem' }}>
      <div className="page-header" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Rent Payment Tracking</h1>
        <p className="page-subtitle">
          Manual tracking of paid, due, and overdue status per tenant per month with automatic overdue flagging.
        </p>
      </div>

      <RentTracker />
    </div>
  );
}
