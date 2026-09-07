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
          <li>React IdleTimer</li>
        </ul>

        <h4 style={{ marginTop: '24px', fontSize: '1rem', color: 'var(--text-primary)' }}>react-idle-timer (MIT License)</h4>
        <div style={{ 
          marginTop: '8px', 
          padding: '12px', 
          background: 'var(--bg-translucent)', 
          borderRadius: '8px', 
          border: '1px solid var(--border)', 
          fontSize: '0.75rem', 
          color: 'var(--text-muted)',
          whiteSpace: 'pre-wrap',
          maxHeight: '150px',
          overflowY: 'auto'
        }}>
          Copyright (c) 2022 Randy Lebeau{'\n\n'}
          Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:{'\n\n'}
          The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.{'\n\n'}
          THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
        </div>
      </div>
    </div>
  );
}
