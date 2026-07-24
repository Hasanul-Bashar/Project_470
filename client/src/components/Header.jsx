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
  const isAdmin = user?.role === 'admin';

  return (
    <header className="header">
      <div className="header-inner">
        {/* Brand */}
        <a href="/admin" className="logo">🏠 RentEase</a>

        {/* Nav */}
        <nav className="nav">
          <NavLink
            to="/admin"
            id="nav-admin"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Admin Dashboard
          </NavLink>
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
            <span className={`role-option${!isAdmin ? ' active-user' : ''}`}>
              👤 User
            </span>
            <span className={`role-option${isAdmin ? ' active-admin' : ''}`}>
              🛡 Admin
            </span>
          </button>
        </div>
      </div>
    </header>
  );
}
