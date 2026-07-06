import React from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '~/context/AuthContext';
import styles from './Layout.module.css';

/**
 * Global layout wrapper for main application pages.
 * 
 * Renders the top navigation bar, handles user display and sign-out actions,
 * and provides an Outlet for nested route components. Adapts styling based
 * on whether the current route is the homepage.
 * 
 * @returns {JSX.Element} The layout component with a navigation bar and main content area.
 */
export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  const isDashboard = location.pathname === '/dashboard';
  const isDarkNavbar = isHome || isDashboard;
  const { user, djangoUser, signOut } = useAuth();

  const handleSignOut = async () => {
    try {
      await signOut();
      navigate('/');
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  // Get user display name (prefer first name from Django profile, fallback to email)
  const getUserDisplayName = () => {
    if (djangoUser && djangoUser.first_name) {
      return djangoUser.first_name;
    }
    return user?.email?.split('@')[0] || 'User';
  };

  return (
    <div className={styles.appLayout}>
      <nav className={`${styles.globalNavbar} ${isDarkNavbar ? styles.navbarHome : ''}`}>
        <Link to="/" className={styles.navBrand}>
          🗺️ HistoryVoyage
        </Link>
        
        {user ? (
          <div className={styles.navUser}>
            <span className={styles.userBadge} title={user.email}>
              👤 {getUserDisplayName()}
            </span>
            <button onClick={handleSignOut} className={styles.btnSignout}>
              Log Out
            </button>
          </div>
        ) : (
          <div className={styles.navActions}>
            <Link to="/login" className={styles.btnNav}>Log In</Link>
            <Link to="/signup" className={`${styles.btnNav} ${styles.btnPrimary}`}>Sign Up</Link>
          </div>
        )}
      </nav>
      <main className={styles.layoutContent}>
        <Outlet />
      </main>
    </div>
  );
}
