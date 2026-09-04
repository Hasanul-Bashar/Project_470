import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Header from './components/Header';
import RoleGatewayModal from './components/auth/RoleGatewayModal';
import UserDashboard from './pages/UserDashboard';
import LandlordListings from './pages/LandlordListings';
import AdminDashboard from './pages/AdminDashboard';
import ComplaintsPage from './pages/ComplaintsPage';
import AnalyticsDashboard from './pages/AnalyticsDashboard';
import RentTrackingPage from './pages/RentTrackingPage';
import MaintenancePage from './pages/MaintenancePage';
import AgreementsPage from './pages/AgreementsPage';

function RootRedirect() {
  const { user } = useAuth();
  if (user?.role === 'landlord') return <Navigate to="/landlord-dashboard" replace />;
  if (user?.role === 'admin') return <Navigate to="/admin" replace />;
  return <Navigate to="/user-dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="page-wrapper">
          <Header />
          <RoleGatewayModal />
          <Routes>
            {/* Dynamic Root Redirection based on active user role */}
            <Route path="/" element={<RootRedirect />} />
            
            {/* Specific Role Dashboards */}
            <Route path="/user-dashboard" element={<UserDashboard />} />
            <Route path="/landlord-dashboard" element={<LandlordListings />} />
            <Route path="/listings" element={<LandlordListings />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/complaints" element={<ComplaintsPage />} />
            <Route path="/landlord-analytics" element={<AnalyticsDashboard />} />
            <Route path="/rent-tracking" element={<RentTrackingPage />} />
            <Route path="/maintenance" element={<MaintenancePage />} />
            <Route path="/agreements" element={<AgreementsPage />} />

            {/* Fallback route */}
            <Route path="*" element={<RootRedirect />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
