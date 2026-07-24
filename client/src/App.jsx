import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Header from './components/Header';
import AdminDashboard from './pages/AdminDashboard';
import ComplaintsPage from './pages/ComplaintsPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <div className="page-wrapper">
          <Header />
          <Routes>
            {/* Default → admin dashboard */}
            <Route path="/" element={<Navigate to="/admin" replace />} />
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/complaints" element={<ComplaintsPage />} />
          </Routes>
        </div>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
