import { useAuth } from '../context/AuthContext';
import ComplaintForm from '../components/complaints/ComplaintForm';
import DisputeTable from '../components/complaints/DisputeTable';

/**
 * ComplaintsPage — role-aware single page:
 *   role === 'user'  → ComplaintForm  (submit a complaint)
 *   role === 'admin' → DisputeTable   (manage all complaints)
 *
 * No separate routes needed — the role switcher in the header toggles the view.
 */
export default function ComplaintsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  return (
    <div className="container">
      <h1 className="page-title">
        {isAdmin ? 'Complaints & Dispute Management' : 'Lodge a Complaint'}
      </h1>
      <p className="page-subtitle">
        {isAdmin
          ? 'Review, investigate, and resolve complaints submitted by platform users'
          : 'Submit your issue and our admin team will review it within 48 hours'}
      </p>

      {isAdmin ? <DisputeTable /> : <ComplaintForm />}
    </div>
  );
}
