import React, { useState, useEffect } from 'react';
import styles from '../Settings.module.css';

export default function PreferencesTab() {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    // Read current theme from localStorage if available
    const savedTheme = localStorage.getItem('app-theme') || 'dark';
    setTheme(savedTheme);
  }, []);

  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  return (
    <div>
      <h2 className={styles.tabTitle}>Preferences</h2>
      <p className={styles.tabDescription}>Customize how HistoryVoyage looks and behaves.</p>

      <div className={styles.formGroup}>
        <label htmlFor="themeSelect">Appearance</label>
        <select 
          id="themeSelect"
          className={styles.formInput}
          value={theme}
          onChange={handleThemeChange}
        >
          <option value="dark">Dark Mode</option>
          <option value="light">Light Mode</option>
        </select>
        <p style={{ fontSize: '13px', color: 'var(--text)', margin: '8px 0 0 0' }}>
          Select the color theme for the application.
        </p>
      </div>
    </div>
  );
}
