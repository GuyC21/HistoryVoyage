import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '~/context/AuthContext';
import { useTheme } from '~/hooks/useTheme';
import heroBgDark from '~/assets/hero_bg.png';
import heroBgLight from '~/assets/hero_bg_light.png';
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
  const { isDarkMode } = useTheme();

  const isExplore = location.pathname === '/explore';
  const showHeroBg = !isExplore;
  const heroBg = isDarkMode ? heroBgDark : heroBgLight;

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
      {!isExplore && (
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
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.userIcon}>
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                  <circle cx="12" cy="7" r="4"></circle>
                </svg>
                
                <span className={styles.userName}>{getUserDisplayName()}</span>
                
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
                  <Link 
                    to="/settings" 
                    className={styles.dropdownItem}
                    onClick={() => setDropdownOpen(false)}
                  >
                    ⚙️ Settings
                  </Link>
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
      )}

      {isExplore && user && (
        <div className={styles.floatingUserDropdownWrapper} ref={dropdownRef}>
          <button 
            className={styles.userBadge} 
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
            title={user.email}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.userIcon}>
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
              <circle cx="12" cy="7" r="4"></circle>
            </svg>
            
            <span className={styles.userName}>{getUserDisplayName()}</span>
            
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
              <Link 
                to="/settings" 
                className={styles.dropdownItem}
                onClick={() => setDropdownOpen(false)}
              >
                ⚙️ Settings
              </Link>
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
      )}
      <main className={styles.layoutContent}>
        {showHeroBg && (
          <>
            <img src={heroBg} alt="Ancient ruins background" className={styles.layoutBg} />
            <div className={styles.layoutOverlay}></div>
          </>
        )}
        <div className={styles.pageWrapper}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
