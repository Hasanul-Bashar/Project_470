import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Header — fixed top bar with:
 *   - RentEase brand logo
 *   - Navigation links (Admin Dashboard, Complaints)
 *   - Role Switcher pill to toggle between User ↔ Admin for the live demo
 */
export default function Header() {
  const { user, toggleRole } = useAuth();
  const isLandlord = user?.role === 'landlord';
  const isAdmin = user?.role === 'admin';

  return (
    <header className="header">
      <div className="header-inner">
        {/* Brand */}
        <a href="/admin" className="logo">🏠 RentEase</a>

        {/* Nav */}
        <nav className="nav">
          {isAdmin && (
            <NavLink
              to="/admin"
              id="nav-admin"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Admin Dashboard
            </NavLink>
          )}
          {isLandlord && (
            <NavLink
              to="/listings"
              id="nav-listings"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              My Listings
            </NavLink>
          )}
          <NavLink
            to="/complaints"
            id="nav-complaints"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Complaints
          </NavLink>
        </nav>

        {/* Role Switcher */}
        <div className="role-switcher">
          <span className="role-label">Viewing as:</span>
          <button
            id="role-toggle-btn"
            className="role-toggle"
            onClick={toggleRole}
            title={`Currently ${user?.role}. Click to switch.`}
          >
            <span className={`role-option${user?.role === 'user' ? ' active-user' : ''}`}>
              👤 User
            </span>
            <span className={`role-option${user?.role === 'landlord' ? ' active-landlord' : ''}`}>
              🏠 Landlord
            </span>
            <span className={`role-option${user?.role === 'admin' ? ' active-admin' : ''}`}>
              🛡 Admin
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}

