import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className={styles.appLayout}>
      <nav className={`${styles.globalNavbar} ${isHome ? styles.navbarHome : ''}`}>
        <Link to="/" className={styles.navBrand}>
          🗺️ HistoryVoyage
        </Link>
        <div className={styles.navActions}>
          <Link to="/login" className={styles.btnNav}>Log In</Link>
          <Link to="/signup" className={`${styles.btnNav} ${styles.btnPrimary}`}>Sign Up</Link>
        </div>
      </nav>
      <main className={styles.layoutContent}>
        <Outlet />
      </main>
    </div>
  );
}
