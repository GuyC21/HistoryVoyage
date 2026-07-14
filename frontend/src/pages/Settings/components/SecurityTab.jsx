import React, { useState } from 'react';
import { supabase } from '~/services/supabase';
import { useAuth } from '~/context/AuthContext';
import styles from '../Settings.module.css';

export default function SecurityTab() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
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
    
    if (password.length < 8) {
      setStatus({ type: 'error', message: 'Password must be at least 8 characters long.' });
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setStatus({ type: 'error', message: 'Password must contain at least one uppercase letter.' });
      return;
    }

    if (!/[a-z]/.test(password)) {
      setStatus({ type: 'error', message: 'Password must contain at least one lowercase letter.' });
      return;
    }

    if (!/\d/.test(password)) {
      setStatus({ type: 'error', message: 'Password must contain at least one number.' });
      return;
    }
    
    setLoading(true);
    setStatus(null);
    
    try {
      // 1. Verify current password by programmatically signing in
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
      });
      
      if (authError) {
        throw new Error('Current password is incorrect.');
      }

      // 2. Proceed with updating password
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      
      setStatus({ type: 'success', message: 'Password updated successfully.' });
      setCurrentPassword('');
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
          <label htmlFor="currentPassword">Current Password</label>
          <input
            id="currentPassword"
            type="password"
            className={styles.formInput}
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            required
          />
        </div>

        <div className={styles.formGroup}>
          <label htmlFor="newPassword">New Password</label>
          <input
            id="newPassword"
            type="password"
            className={styles.formInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            required
            minLength={8}
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
            disabled={loading}
            required
            minLength={8}
          />
        </div>

        <div className={styles.buttonRow}>
          <button type="submit" className={styles.btnSave} disabled={loading || !currentPassword || !password || !confirmPassword}>
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
