import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NotificationBell from './notifications/NotificationBell';

export default function Header() {
  const { user, openRoleModal, logout } = useAuth();

  const isLandlord = user?.role === 'landlord';
  const isAdmin = user?.role === 'admin';

  // Greeting Logic based on user & initial signup vs returning login
  const displayName = user?.firstName || user?.name || 'User';
  const greeting = user?.isFirstLogin ? `Hi, ${displayName}!` : `Welcome back, ${displayName}!`;

  return (
    <header className="header">
      <div className="header-inner">
        {/* Brand Logo */}
        <a href={isAdmin ? '/admin' : isLandlord ? '/landlord-dashboard' : '/user-dashboard'} className="logo">
          🏠 RentEase
        </a>

        {/* Navigation Links */}
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
              to="/landlord-dashboard"
              id="nav-listings"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Landlord Dashboard
            </NavLink>
          )}
          {user?.role === 'user' && (
            <NavLink
              to="/user-dashboard"
              id="nav-user-dashboard"
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
            >
              Rental Dashboard
            </NavLink>
          )}
          <NavLink
            to="/rent-tracking"
            id="nav-rent-tracking"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            💳 Rent Tracking
          </NavLink>
          <NavLink
            to="/maintenance"
            id="nav-maintenance"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            🛠 Maintenance
          </NavLink>
          <NavLink
            to="/agreements"
            id="nav-agreements"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            📄 Agreements
          </NavLink>
          <NavLink
            to="/complaints"
            id="nav-complaints"
            className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
          >
            Complaints
          </NavLink>
        </nav>

        {/* Header Right Bar: User Greeting, Role Badge & Gateway Trigger */}
        <div className="header-user-bar">
          {user ? (
            <>
              {/* Greeting Tag */}
              <div className="user-greeting-badge" title={greeting}>
                <span className="greeting-text">{greeting}</span>
              </div>

              {/* Role Pill */}
              <div className="current-role-badge">
                {user.role === 'user' && <span className="role-pill user-pill">👤 User</span>}
                {user.role === 'landlord' && <span className="role-pill landlord-pill">🏠 Landlord</span>}
                {user.role === 'admin' && <span className="role-pill admin-pill">🛡 Admin</span>}
              </div>

              {/* 🔔 Notification Bell */}
              <NotificationBell />

              {/* Switch Role Button */}
              <button
                id="role-switch-btn"
                className="role-switch-trigger-btn"
                onClick={() => openRoleModal()}
                title="Switch Role or Change Account"
              >
                🔄 Switch Role
              </button>

              {/* Logout Button */}
              <button
                className="logout-btn"
                onClick={logout}
                title="Log Out"
              >
                Logout
              </button>
            </>
          ) : (
            <button
              className="login-trigger-btn"
              onClick={() => openRoleModal()}
            >
              Log In / Select Role
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
