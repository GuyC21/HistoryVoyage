import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '~/context/AuthContext';
import heroBg from '~/assets/hero_bg.png';
import styles from './Home.module.css';

export default function Home() {
  const { user } = useAuth();
  const targetPath = user ? '/dashboard' : '/login';
  return (
    <div className={styles.homeContainer}>
      <img src={heroBg} alt="Ancient ruins under starry night" className={styles.heroBg} />
      <div className={styles.heroOverlay}></div>
      
      <div className={styles.homeScrollBody}>
        <div className={styles.heroContent}>
          <h1 className={styles.heroTitle}>Unearth the Past</h1>
          <p className={styles.heroSubtitle}>
            Explore over 29,000 historical and archaeological sites across the Mediterranean. Discover castles, ruins, and monuments with rich Wikipedia and Wikidata integrations.
          </p>
          
          <div className={styles.statsGrid}>
            <div className={styles.statCard}>
              <span className={styles.statValue}>29k+</span>
              <span className={styles.statLabel}>Sites</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>Israel, Greece, Italy</span>
              <span className={styles.statLabel}>Countries</span>
            </div>
            <div className={styles.statCard}>
              <span className={styles.statValue}>6+</span>
              <span className={styles.statLabel}>Categories</span>
            </div>
          </div>
          
          <Link to={targetPath} className={styles.btnStart}>
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
