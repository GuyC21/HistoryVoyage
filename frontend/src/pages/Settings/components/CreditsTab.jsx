import React from 'react';
import styles from '../Settings.module.css';

export default function CreditsTab() {
  return (
    <div className={styles.tabContent}>
      <h2 className={styles.tabTitle}>3rd Party Licenses & Credits</h2>
      <p className={styles.tabDescription}>
        HistoryVoyage is made possible by open-source data and software. We gratefully acknowledge the following platforms and libraries.
      </p>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Map Data & Tiles</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Map data is provided by <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>OpenStreetMap</a> contributors under the ODbL license.
          Basemap tiles are provided by <a href="https://carto.com/attributions" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>CARTO</a>.
        </p>
        <div style={{ padding: '10px 14px', background: 'var(--bg-translucent)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
          <em>Note: These are explicitly credited dynamically on the interactive map footer to satisfy their terms.</em>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Historical Summaries & Images</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Site descriptions and translations are dynamically fetched from <a href="https://wikipedia.org/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Wikipedia</a> under the CC BY-SA 4.0 license.
          Cover images are sourced from <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Wikimedia Commons</a>.
        </p>
        <div style={{ padding: '10px 14px', background: 'var(--bg-translucent)', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '0.85rem' }}>
          <em>Note: Due to CC BY-SA requirements, specific article authors and image licenses are credited per-article dynamically inside the site details drawer.</em>
        </div>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Data & APIs</h3>
        <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <li>
            <strong>Open-Meteo:</strong> City search is powered by <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Open-Meteo</a> geocoding. <em>(Also credited in the search bar).</em>
          </li>
          <li>
            <strong>Wikidata:</strong> Entity IDs, sitelinks, and metadata are powered by <a href="https://www.wikidata.org/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Wikidata</a> (CC0 Public Domain).
          </li>
          <li>
            <strong>Photon:</strong> Reverse geocoding for addresses is powered by <a href="https://photon.komoot.io/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>Komoot Photon</a>.
          </li>
          <li>
            <strong>OSRM:</strong> Routing geometry is provided by <a href="https://routing.openstreetmap.de/" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent)' }}>FOSSGIS OSRM</a>.
          </li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Software Libraries</h3>
        <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          This project relies on the following major open-source frameworks (MIT/BSD/LGPL):
        </p>
        <ul style={{ paddingLeft: '20px', fontSize: '0.9rem', color: 'var(--text-muted)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <li>React</li>
          <li>Leaflet & React-Leaflet</li>
          <li>Django & GeoDjango</li>
          <li>PostgreSQL & PostGIS</li>
          <li>Supabase</li>
          <li>Geopy & deep-translator</li>
          <li>Vite PWA & Workbox</li>
        </ul>
      </div>
    </div>
  );
}
