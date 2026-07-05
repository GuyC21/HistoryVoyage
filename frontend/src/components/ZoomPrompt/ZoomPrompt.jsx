import React from 'react'
import styles from './ZoomPrompt.module.css'

/**
 * ZoomPrompt Component
 * Renders a glassmorphic warning overlay when the user's zoom level is below the MIN_ZOOM_GATE.
 * Instructs users to zoom in to load high-density maps of historical sites.
 *
 * @param {Object} props
 * @param {string} [props.title] - Title header on the warning card.
 * @param {string} [props.message] - Instructive message details.
 * @param {string} [props.buttonText] - Text on the call-to-action button.
 * @param {Function} props.onZoomClick - Callback handler triggered when the zoom button is clicked.
 */
export default function ZoomPrompt({
  title = "Explore Historical Regions",
  message = "We have loaded 29,795 sites across Italy, Greece, and Israel. Zoom in to start exploring markers.",
  buttonText = "🔍 Zoom in to Explore",
  onZoomClick
}) {
  return (
    <div className={styles.zoomWarningOverlay}>
      <div className={styles.zoomWarningCard}>
        <h3>{title}</h3>
        <p>{message}</p>
        <button className={styles.zoomBtn} onClick={onZoomClick}>
          {buttonText}
        </button>
      </div>
    </div>
  )
}
