import React, { useState, useEffect } from 'react';
import { useAuth } from '~/context/AuthContext';
import { backendApi } from '~/services/api';
import { supabase } from '~/services/supabase';
import styles from '../Settings.module.css';

export default function ProfileTab() {
  const { user, djangoUser, refreshProfile } = useAuth();
  
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null); // { type: 'success' | 'error', message: string }

  useEffect(() => {
    if (djangoUser) {
      setFirstName(djangoUser.first_name || '');
      setLastName(djangoUser.last_name || '');
    }
    if (user) {
      setEmail(user.email || '');
    }
  }, [djangoUser, user]);

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus(null);
    
    try {
      // 1. Update Name in Django
      await backendApi.updateCurrentUser(firstName, lastName);
      
      // 2. Update Email in Supabase if changed
      if (user.email !== email) {
        const { error } = await supabase.auth.updateUser({ email });
        if (error) throw error;
        
        setStatus({ type: 'success', message: 'Profile updated. Please check your new email to verify the change.' });
      } else {
        setStatus({ type: 'success', message: 'Profile updated successfully.' });
      }
      
      // Refresh context
      await refreshProfile();
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to update profile.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className={styles.tabTitle}>Profile</h2>
      <p className={styles.tabDescription}>Update your personal information and email address.</p>

      {status && (
        <div className={`${styles.statusMessage} ${styles[status.type]}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleSaveProfile}>
        <div className={styles.formGroup}>
          <label htmlFor="firstName">First Name</label>
          <input
            id="firstName"
            type="text"
            className={styles.formInput}
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            placeholder="Jane"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="lastName">Last Name</label>
          <input
            id="lastName"
            type="text"
            className={styles.formInput}
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            placeholder="Doe"
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="email">Email Address</label>
          <input
            id="email"
            type="email"
            className={styles.formInput}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jane@example.com"
          />
        </div>

        <div className={styles.buttonRow}>
          <button type="submit" className={styles.btnSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
