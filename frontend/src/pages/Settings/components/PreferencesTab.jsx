import React, { useState, useEffect } from 'react';
import { useAuth } from '~/context/AuthContext';
import { supabase } from '~/services/supabase';
import styles from '../Settings.module.css';

export default function PreferencesTab() {
  const { user } = useAuth();
  const [theme, setTheme] = useState('light');
  const [distanceUnit, setDistanceUnit] = useState('km');

  useEffect(() => {
    // Read current theme from localStorage if available
    const savedTheme = localStorage.getItem('app-theme') || 'light';
    setTheme(savedTheme);

    // Read distance unit from user metadata or localStorage
    const savedUnit = user?.user_metadata?.distance_unit || localStorage.getItem('app-distance-unit') || 'km';
    setDistanceUnit(savedUnit);
  }, [user]);

  const handleThemeChange = (e) => {
    const newTheme = e.target.value;
    setTheme(newTheme);
    localStorage.setItem('app-theme', newTheme);
    document.documentElement.setAttribute('data-theme', newTheme);
  };

  const handleDistanceUnitChange = async (e) => {
    const newUnit = e.target.value;
    setDistanceUnit(newUnit);
    localStorage.setItem('app-distance-unit', newUnit);
    if (user) {
      try {
        const { error } = await supabase.auth.updateUser({
          data: {
            distance_unit: newUnit
          }
        });
        if (error) throw error;
      } catch (err) {
        console.error('Failed to sync distance unit to Supabase:', err);
      }
    }
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

      <div className={styles.formGroup}>
        <label htmlFor="distanceUnitSelect">Distance Unit</label>
        <select 
          id="distanceUnitSelect"
          className={styles.formInput}
          value={distanceUnit}
          onChange={handleDistanceUnitChange}
        >
          <option value="km">Kilometers (km)</option>
          <option value="mi">Miles (mi)</option>
        </select>
        <p style={{ fontSize: '13px', color: 'var(--text)', margin: '8px 0 0 0' }}>
          Choose the unit used to measure distances on the map and drawer.
        </p>
      </div>
    </div>
  );
}
