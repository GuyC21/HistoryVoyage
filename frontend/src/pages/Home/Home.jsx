import React from 'react';
import { Link } from 'react-router-dom';
import heroBg from '~/assets/hero_bg.png';
import './Home.css';

export default function Home() {
  return (
    <div className="home-container">
      <img src={heroBg} alt="Ancient ruins under starry night" className="hero-bg" />
      <div className="hero-overlay"></div>
      
      <div className="home-scroll-body">
        <div className="hero-content">
          <h1 className="hero-title">Unearth the Past</h1>
          <p className="hero-subtitle">
            Explore over 29,000 historical and archaeological sites across the Mediterranean. Discover castles, ruins, and monuments with rich Wikipedia and Wikidata integrations.
          </p>
          
          <div className="stats-grid">
            <div className="stat-card">
              <span className="stat-value">29k+</span>
              <span className="stat-label">Sites</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">Israel, Greece, Italy</span>
              <span className="stat-label">Countries</span>
            </div>
            <div className="stat-card">
              <span className="stat-value">6+</span>
              <span className="stat-label">Categories</span>
            </div>
          </div>
          
          <Link to="/explore" className="btn-start">
            Start Your Voyage
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19M19 12L12 5M19 12L12 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </Link>
        </div>
      </div>
    </div>
  );
}
