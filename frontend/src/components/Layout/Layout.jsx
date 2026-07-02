import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import './Layout.css';

export default function Layout() {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className="app-layout">
      <nav className={`global-navbar ${isHome ? 'navbar-home' : ''}`}>
        <Link to="/" className="nav-brand">
          🗺️ HistoryVoyage
        </Link>
        <div className="nav-actions">
          <Link to="/login" className="btn-nav">Log In</Link>
          <Link to="/signup" className="btn-nav btn-primary">Sign Up</Link>
        </div>
      </nav>
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  );
}
