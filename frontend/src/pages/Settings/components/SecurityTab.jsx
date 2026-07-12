import React, { useState } from 'react';
import { supabase } from '~/services/supabase';
import styles from '../Settings.module.css';

export default function SecurityTab() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      setStatus({ type: 'error', message: 'Passwords do not match.' });
      return;
    }
    
    setLoading(true);
    setStatus(null);
    
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setStatus({ type: 'success', message: 'Password updated successfully.' });
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      setStatus({ type: 'error', message: err.message || 'Failed to update password.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className={styles.tabTitle}>Security</h2>
      <p className={styles.tabDescription}>Ensure your account is using a long, random password to stay secure.</p>

      {status && (
        <div className={`${styles.statusMessage} ${styles[status.type]}`}>
          {status.message}
        </div>
      )}

      <form onSubmit={handleUpdatePassword}>
        <div className={styles.formGroup}>
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            className={styles.formInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="confirmPassword">Confirm New Password</label>
          <input
            id="confirmPassword"
            type="password"
            className={styles.formInput}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            required
            minLength={6}
          />
        </div>

        <div className={styles.buttonRow}>
          <button type="submit" className={styles.btnSave} disabled={loading || !password || !confirmPassword}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
