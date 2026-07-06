import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '~/context/AuthContext'
import styles from './Login.module.css'

/**
 * Login page component.
 * 
 * Provides a form for existing users to authenticate using their email
 * and password via Supabase. Handles form state, loading state, and
 * error display during the authentication process.
 * 
 * @returns {JSX.Element} The rendered login page.
 */
export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const { signIn } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }

    setSubmitting(true)
    try {
      await signIn(email, password)
      navigate('/explore')
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to log in. Please check your credentials.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.authContainer}>
      <div className={styles.ambientLight1}></div>
      <div className={styles.ambientLight2}></div>
      
      <div className={styles.authCard}>
        <div className={styles.cardHeader}>
          <Link to="/" className={styles.logo}>🗺️ HistoryVoyage</Link>
          <h2 className={styles.title}>Welcome Back</h2>
          <p className={styles.subtitle}>Log in to continue your historical voyage</p>
        </div>

        {error && (
          <div className={styles.errorAlert}>
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.authForm}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={submitting}>
            {submitting ? (
              <span className={styles.spinner}></span>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className={styles.cardFooter}>
          <p>
            Don't have an account? <Link to="/signup" className={styles.link}>Sign up</Link>
          </p>
          <div className={styles.backHome}>
            <Link to="/" className={styles.linkBack}>
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
