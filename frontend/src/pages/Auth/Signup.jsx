import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '~/context/AuthContext'
import PopupDialog from '~/components/PopupDialog/PopupDialog'
import styles from './Signup.module.css'

// === REDIRECT CONFIGURATION ===
// Change these paths to control where users go after registering successfully.
const REDIRECT_ON_AUTO_CONFIRM = '/dashboard'   // Destination when email confirmation is disabled
const REDIRECT_TO_LOGIN_PAGE = '/login'       // Destination when email confirmation is enabled (after clicking popup button)


/**
 * Registration page component.
 * 
 * Provides a comprehensive form for new users to create an account, including
 * fields for full name, email, password, and password confirmation. Validates
 * password strength and matching before submitting to Supabase. Handles success
 * messaging and post-registration redirection via a PopupDialog.
 * 
 * @returns {JSX.Element} The rendered signup page.
 */
export default function Signup() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [isPopupOpen, setIsPopupOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  
  const { signUp, signOut, session } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!fullName || !email || !password || !confirmPassword) {
      setError('Please fill in all fields.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.')
      return
    }

    if (!/[A-Z]/.test(password)) {
      setError('Password must contain at least one uppercase letter.')
      return
    }

    if (!/[a-z]/.test(password)) {
      setError('Password must contain at least one lowercase letter.')
      return
    }

    if (!/\d/.test(password)) {
      setError('Password must contain at least one number.')
      return
    }

    setSubmitting(true)
    try {
      const data = await signUp(email, password, fullName)
      
      // If a session is returned, the user has been auto-confirmed (email confirmation is off)
      const isAutoConfirmed = data?.session !== null && data?.session !== undefined
      
      if (isAutoConfirmed) {
        navigate(REDIRECT_ON_AUTO_CONFIRM)
      } else {
        setIsPopupOpen(true)
      }
    } catch (err) {
      console.error(err)
      setError(err.message || 'Failed to sign up. Please try again.')
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
          <h2 className={styles.title}>Create Account</h2>
          <p className={styles.subtitle}>Sign up to start saving and sharing sites</p>
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
            <label htmlFor="fullName">Full Name</label>
            <input
              id="fullName"
              type="text"
              placeholder="Name Surname"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

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
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <button type="submit" className={styles.btnSubmit} disabled={submitting}>
            {submitting ? (
              <span className={styles.spinner}></span>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>

        <div className={styles.cardFooter}>
          <p>
            Already have an account? <Link to="/login" className={styles.link}>Log in</Link>
          </p>
          <div className={styles.backHome}>
            <Link to="/" className={styles.linkBack}>
              ← Back to Homepage
            </Link>
          </div>
        </div>
      </div>

      {/* Success Popup Dialog */}
      <PopupDialog
        isOpen={isPopupOpen}
        onClose={() => setIsPopupOpen(false)}
        title="Registration Successful"
      >
        <div className={styles.popupSuccessContent}>
          <div className={styles.successIcon}>
            <svg width="48" height="48" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <p className={styles.popupMessage}>
            Your account has been created successfully!
          </p>
          <p className={styles.emailInstructions}>
            Please check your inbox at <strong>{email}</strong> and click the verification link to activate your account.
          </p>
          
          <div className={styles.popupActions}>
            <button
              onClick={async () => {
                if (session) {
                  try {
                    await signOut()
                  } catch (err) {
                    console.error('Error signing out during redirect:', err)
                  }
                }
                navigate(REDIRECT_TO_LOGIN_PAGE)
              }}
              className={styles.btnPopupPrimary}
            >
              Proceed to Log In
            </button>
            <button
              onClick={() => setIsPopupOpen(false)}
              className={styles.btnPopupSecondary}
            >
              Stay here
            </button>
          </div>
        </div>
      </PopupDialog>
    </div>
  )
}
