import React, { useState, useEffect, useRef } from 'react';
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

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
          <div className={styles.navUserDropdown} ref={dropdownRef}>
            <button 
              className={styles.userBadge} 
              onClick={() => setDropdownOpen(!dropdownOpen)}
              aria-expanded={dropdownOpen}
              title={user.email}
            >
              {/* 
                User icon sourced from Feather Icons (https://feathericons.com/)
                Copyright (c) 2013-2017 Cole Bemis
                Licensed under the MIT License: https://opensource.org/licenses/MIT
              */}
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.userIcon}>
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
              
              <span className={styles.userName}>{getUserDisplayName()}</span>
              
              {/* 
                Chevron icon sourced from Feather Icons (https://feathericons.com/)
                Copyright (c) 2013-2017 Cole Bemis
                Licensed under the MIT License: https://opensource.org/licenses/MIT
              */}
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`${styles.chevronIcon} ${dropdownOpen ? styles.open : ''}`}>
                <path d="m6 9 6 6 6-6"/>
              </svg>
            </button>
            
            {dropdownOpen && (
              <div className={styles.dropdownMenu}>
                <Link 
                  to="/dashboard" 
                  className={styles.dropdownItem}
                  onClick={() => setDropdownOpen(false)}
                >
                  🗺️ Voyages
                </Link>
                <button 
                  className={`${styles.dropdownItem} ${styles.disabled}`}
                  disabled
                  title="Settings coming soon"
                >
                  ⚙️ Settings (Coming Soon)
                </button>
                <div className={styles.dropdownDivider}></div>
                <button 
                  onClick={() => {
                    setDropdownOpen(false);
                    handleSignOut();
                  }} 
                  className={`${styles.dropdownItem} ${styles.btnDropdownSignout}`}
                >
                  🚪 Log Out
                </button>
              </div>
            )}
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
