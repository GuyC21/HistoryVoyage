import React, { useEffect } from 'react'
import styles from './PopupDialog.module.css'

/**
 * Reusable dialog popup modal overlay.
 * 
 * Provides a highly polished glassmorphism dialog overlay that can be
 * populated with arbitrary children content. Handles background scroll lock,
 * overlay clicking, and Escape key listeners.
 * 
 * @param {Object} props - React props.
 * @param {boolean} props.isOpen - Controls the visibility of the popup.
 * @param {Function} props.onClose - Callback triggered to request closing the dialog.
 * @param {string} [props.title] - Optional heading title for the dialog header.
 * @param {boolean} [props.showCloseButton=true] - Toggles the rendering of the close button.
 * @param {React.ReactNode} props.children - Inner content rendered in the dialog body.
 * @returns {JSX.Element|null} The rendered component or null if closed.
 */
export default function PopupDialog({
  isOpen,
  onClose,
  title,
  showCloseButton = true,
  children
}) {
  // Listen for the escape key to close the modal
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    // Prevent background scrolling while modal is open
    document.body.style.overflow = 'hidden'

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const handleOverlayClick = (e) => {
    // Only close if user clicked directly on the overlay backdrop, not on the popup card
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className={styles.overlay} onClick={handleOverlayClick} role="dialog" aria-modal="true">
      <div className={styles.dialogCard}>
        <div className={styles.header}>
          {title && <h3 className={styles.title}>{title}</h3>}
          {showCloseButton && (
            <button className={styles.btnClose} onClick={onClose} aria-label="Close dialog">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
        <div className={styles.body}>
          {children}
        </div>
      </div>
    </div>
  )
}
