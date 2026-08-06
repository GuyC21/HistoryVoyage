import React from 'react'
import { formatDistance } from '~/utils/distance'
import { getExternalNavLinks, getManeuverIcon, formatManeuverInstruction } from '~/services/routingService'
import styles from './NavigationOverlay.module.css'

/**
 * Formats duration in seconds to human-readable format (e.g., "14 min" or "1 hr 12 min").
 *
 * @param {number} seconds - Total duration in seconds
 * @returns {string} Formatted duration string
 */
const formatDuration = (seconds) => {
  if (!seconds || seconds <= 0) return '1 min'
  const totalMins = Math.round(seconds / 60)
  if (totalMins < 60) {
    return `${totalMins} min`
  }
  const hours = Math.floor(totalMins / 60)
  const mins = totalMins % 60
  return `${hours} hr ${mins > 0 ? `${mins} min` : ''}`
}

/**
 * Calculates estimated arrival clock time (ETA).
 *
 * @param {number} durationSeconds - Duration in seconds from current time
 * @returns {string} Formatted time string (e.g. "16:45")
 */
const calculateEtaClock = (durationSeconds) => {
  if (!durationSeconds) return ''
  const etaDate = new Date(Date.now() + durationSeconds * 1000)
  return etaDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * NavigationOverlay Component
 * Renders the Waze/Google Maps-style distraction-free Focus Mode interface:
 * - Top Turn Banner: Visual maneuver direction icon, real-time step distance, and instruction text.
 * - Bottom Navigation Card: Total remaining distance, ETA clock, external app links (Waze / Google Maps),
 *   audio mute toggle, camera follow toggle, and exit navigation button.
 *
 * @param {Object} props
 * @param {Object} props.activeDestination - Target site metadata { name, lat, lng }
 * @param {Object|null} props.routeData - Resolved route details { distance, duration, steps }
 * @param {Object|null} props.currentStep - Active maneuver step object
 * @param {Object|null} props.upcomingStep - Upcoming maneuver step object
 * @param {number|null} props.distToNextTurn - Real-time distance in meters to upcoming turn
 * @param {boolean} props.isFollowing - True if map camera is locked to user
 * @param {boolean} props.isMuted - True if voice guidance is muted
 * @param {Array<number>|null} props.userLocation - Current user coordinates [lat, lng]
 * @param {Function} props.onStopNavigation - Callback to end navigation mode
 * @param {Function} props.onToggleFollow - Callback to toggle camera lock
 * @param {Function} props.onToggleMute - Callback to toggle audio guidance
 */
export default function NavigationOverlay({
  activeDestination,
  routeData,
  currentStep,
  upcomingStep,
  distToNextTurn,
  isFollowing,
  isMuted,
  travelMode = 'driving',
  userLocation,
  onStopNavigation,
  onToggleFollow,
  onToggleMute,
  onToggleTravelMode
}) {
  if (!activeDestination) return null

  // Target step to render on banner is the UPCOMING maneuver (or current step if final arrival)
  const targetStep = upcomingStep || currentStep
  const maneuver = targetStep?.maneuver
  const maneuverIcon = getManeuverIcon(maneuver)

  const rawInstruction = targetStep ? formatManeuverInstruction(targetStep) : `Proceed to ${activeDestination.name}`
  // Capitalize first letter cleanly for banner display
  const instructionText = rawInstruction.charAt(0).toUpperCase() + rawInstruction.slice(1)

  // Real-time decreasing distance to upcoming turn
  const stepDistance = (distToNextTurn !== null && distToNextTurn !== undefined)
    ? formatDistance(distToNextTurn, 'km')
    : (currentStep?.distance ? formatDistance(currentStep.distance, 'km') : '')

  const userLat = userLocation?.[0]
  const userLng = userLocation?.[1]
  const externalLinks = getExternalNavLinks(activeDestination.lat, activeDestination.lng, userLat, userLng)

  const etaClock = calculateEtaClock(routeData?.duration)
  const durationText = formatDuration(routeData?.duration)
  const remainingDistance = routeData?.distance ? formatDistance(routeData.distance, 'km') : ''

  return (
    <div className={styles.navigationContainer}>
      {/* Top Banner: Turn-by-turn guidance */}
      <div className={styles.topBanner}>
        <div className={styles.maneuverIconWrapper}>
          <span className={styles.maneuverIcon}>{maneuverIcon}</span>
        </div>
        <div className={styles.instructionDetails}>
          {stepDistance && <div className={styles.stepDistance}>{stepDistance}</div>}
          <div className={styles.instructionText} dir="auto"><bdi>{instructionText}</bdi></div>
        </div>
      </div>

      {/* Floating Camera Follow Lock Button (if user manually panned map) */}
      {!isFollowing && (
        <button
          className={styles.recenterBtn}
          onClick={onToggleFollow}
          title="Recenter camera on location"
        >
          🎯 Recenter
        </button>
      )}

      {/* Bottom Navigation Card */}
      <div className={styles.bottomCard}>
        <div className={styles.statsRow}>
          <div className={styles.primaryEta}>
            <span className={styles.durationVal}>{durationText}</span>
            {etaClock && <span className={styles.etaClockVal}>• {etaClock} ETA</span>}
          </div>
          <div className={styles.distanceRemainingVal}>{remainingDistance}</div>
        </div>

        <div className={styles.destinationName} title={activeDestination.name}>
          Navigating to {activeDestination.name}
        </div>

        <div className={styles.controlsRow}>
          {/* Mode Switcher: Driving vs Walking */}
          {onToggleTravelMode && (
            <button
              className={`${styles.controlBtn} ${styles.modeBtn}`}
              onClick={onToggleTravelMode}
              title={`Switch to ${travelMode === 'driving' ? 'Walking (Footpaths)' : 'Driving (Roads)'} mode`}
            >
              {travelMode === 'driving' ? '🚗 Drive' : '🚶 Walk'}
            </button>
          )}

          <button
            className={`${styles.controlBtn} ${isMuted ? styles.muted : ''}`}
            onClick={onToggleMute}
            title={isMuted ? 'Unmute voice guidance' : 'Mute voice guidance'}
          >
            {isMuted ? '🔇 Muted' : '🔊 Voice'}
          </button>

          <a
            href={externalLinks.waze}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.controlBtn} ${styles.externalNavBtn}`}
            title="Open in Waze App"
          >
            🚙 Waze
          </a>

          <a
            href={externalLinks.googleMaps}
            target="_blank"
            rel="noopener noreferrer"
            className={`${styles.controlBtn} ${styles.externalNavBtn}`}
            title="Open in Google Maps App"
          >
            🗺️ Google
          </a>

          <button
            className={`${styles.controlBtn} ${styles.exitBtn}`}
            onClick={onStopNavigation}
          >
            ❌ Exit
          </button>
        </div>
      </div>
    </div>
  )
}
