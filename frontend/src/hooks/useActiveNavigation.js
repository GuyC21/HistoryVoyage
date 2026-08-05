import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchDetailedRoute } from '~/services/routingService'
import { getAirDistance } from '~/utils/distance'

/**
 * Custom React Hook to manage Waze/Google Maps-style live active navigation.
 * Handles route calculation, continuous position tracking, camera auto-follow,
 * turn-by-turn maneuver progression, and browser Web Speech API voice guidance.
 *
 * @param {Array<number>|null} userLocation - Real-time user GPS coordinates [lat, lng].
 * @param {L.Map|null} mapInstance - Active Leaflet map reference.
 * @param {Function} [onToast] - Optional callback to render status toasts.
 * @returns {Object} Active navigation state and control handlers:
 *   - {boolean} isNavigating - True if live navigation focus mode is active.
 *   - {Object|null} activeDestination - Target site metadata { id, name, lat, lng }.
 *   - {Object|null} routeData - Resolved route details { coordinates, distance, duration, steps }.
 *   - {Object|null} currentStep - Active maneuver step object.
 *   - {boolean} isFollowing - True if camera is locked/panning to user coordinates.
 *   - {boolean} isMuted - True if voice guidance audio is muted.
 *   - {boolean} loading - True if route fetch is in progress.
 *   - {Function} startNavigation - Function to launch navigation for a target site: (site) => void.
 *   - {Function} stopNavigation - Function to exit navigation mode: () => void.
 *   - {Function} toggleFollowMode - Function to toggle camera follow lock: () => void.
 *   - {Function} toggleMute - Function to toggle voice guidance mute: () => void.
 */
export function useActiveNavigation(userLocation, mapInstance, onToast) {
  const [activeDestination, setActiveDestination] = useState(null)
  const [fallbackStartLoc, setFallbackStartLoc] = useState(null)
  const [travelMode, setTravelMode] = useState('driving') // 'driving' or 'foot'
  const [routeData, setRouteData] = useState(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [isFollowing, setIsFollowing] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /** @type {React.MutableRefObject<Array<number>|null>} Caches last routed user position to prevent spamming APIs */
  const lastRoutedLocationRef = useRef(null)

  /** @type {React.MutableRefObject<string|null>} Caches last routed travel mode ('driving' vs 'foot') */
  const lastRoutedModeRef = useRef(null)

  /** @type {React.MutableRefObject<number|null>} Remembers last spoken step index to prevent duplicate audio announcements */
  const lastSpokenStepRef = useRef(null)

  // Toggle travel mode between driving and walking (foot)
  const toggleTravelMode = useCallback(() => {
    setTravelMode((prev) => {
      const nextMode = prev === 'driving' ? 'foot' : 'driving'
      lastRoutedLocationRef.current = null
      lastRoutedModeRef.current = null
      if (onToast) onToast(`Switched to ${nextMode === 'foot' ? 'Walking 🚶' : 'Driving 🚗'} mode`)
      return nextMode
    })
  }, [onToast])

  // Web Speech API Voice Announcement Helper
  const speakInstruction = useCallback((text) => {
    if (isMuted || !('speechSynthesis' in window) || !text) return
    try {
      window.speechSynthesis.cancel() // Stop any previous speech
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.rate = 1.0
      utterance.pitch = 1.0
      utterance.lang = 'en-US'
      window.speechSynthesis.speak(utterance)
    } catch (err) {
      console.warn('Speech synthesis failed:', err)
    }
  }, [isMuted])

  // Start navigation for a selected site
  const startNavigation = useCallback((site, overrideStartPos = null) => {
    if (!site) return

    let lat = null
    let lng = null

    if (site.coordinates) {
      lat = site.coordinates[0]
      lng = site.coordinates[1]
    } else if (site.geometry?.coordinates) {
      lng = site.geometry.coordinates[0]
      lat = site.geometry.coordinates[1]
    }

    if (lat === null || lng === null) {
      if (onToast) onToast('Cannot navigate: site coordinates are unavailable.')
      return
    }

    if (overrideStartPos) {
      setFallbackStartLoc(overrideStartPos)
    }

    const name = site.englishName || site.name || 'Historical Site'
    setActiveDestination({ id: site.id, name, lat, lng })
    setIsFollowing(true)
    setCurrentStepIndex(0)
    lastRoutedLocationRef.current = null
    lastRoutedModeRef.current = null
    lastSpokenStepRef.current = null

    if (onToast) onToast(`Starting live navigation to ${name}`)
  }, [onToast])

  // Exit navigation mode
  const stopNavigation = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel()
    }
    setActiveDestination(null)
    setFallbackStartLoc(null)
    setRouteData(null)
    setCurrentStepIndex(0)
    lastRoutedLocationRef.current = null
    lastRoutedModeRef.current = null
    lastSpokenStepRef.current = null
    if (onToast) onToast('Navigation ended.')
  }, [onToast])

  // Toggle camera lock follow mode
  const toggleFollowMode = useCallback(() => {
    setIsFollowing((prev) => {
      const nextState = !prev
      const currentLoc = userLocation || fallbackStartLoc
      if (nextState && currentLoc && mapInstance) {
        mapInstance.flyTo(currentLoc, 16, { animate: true })
      }
      return nextState
    })
  }, [userLocation, fallbackStartLoc, mapInstance])

  // Toggle audio mute
  const toggleMute = useCallback(() => {
    setIsMuted((prev) => {
      const nextState = !prev
      if (nextState && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel()
      } else if (!nextState && routeData?.steps?.[currentStepIndex]) {
        // Speak active instruction when unmuting
        const step = routeData.steps[currentStepIndex]
        const stepText = step.maneuver?.instruction || step.name || 'Continue on route'
        speakInstruction(stepText)
      }
      return nextState
    })
  }, [currentStepIndex, routeData, speakInstruction])

  // Route calculation and live position updates
  useEffect(() => {
    const currentLoc = userLocation || fallbackStartLoc
    if (!activeDestination || !currentLoc) return

    const [userLat, userLng] = currentLoc

    // Check if we already routed from very close to this position (<25 meters) AND same mode
    if (lastRoutedLocationRef.current && lastRoutedModeRef.current === travelMode) {
      const [lastLat, lastLng] = lastRoutedLocationRef.current
      const movedDist = getAirDistance(userLat, userLng, lastLat, lastLng)
      if (movedDist < 25) {
        // User hasn't moved enough to justify re-fetching route; just smooth pan if follow mode is active
        if (isFollowing && mapInstance) {
          mapInstance.panTo(currentLoc, { animate: true })
        }
        return
      }
    }

    const controller = new AbortController()
    setLoading(true)
    setError(null)

    fetchDetailedRoute(userLat, userLng, activeDestination.lat, activeDestination.lng, travelMode, controller.signal)
      .then((data) => {
        setRouteData(data)
        lastRoutedLocationRef.current = currentLoc
        lastRoutedModeRef.current = travelMode

        // Auto-pan camera if follow mode is enabled
        if (isFollowing && mapInstance) {
          mapInstance.flyTo(currentLoc, 16, { animate: true })
        }

        // Announce initial or updated route direction
        if (data.steps && data.steps.length > 0) {
          const firstStep = data.steps[0]
          const instruction = firstStep.maneuver?.instruction || `Head towards ${activeDestination.name}`
          if (lastSpokenStepRef.current !== 0) {
            lastSpokenStepRef.current = 0
            speakInstruction(instruction)
          }
        }
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Active navigation error:', err)
          setError(err.message || 'Routing failed')
          if (onToast) onToast('Unable to update route. Retrying...')
        }
      })
      .finally(() => {
        setLoading(false)
      })

    return () => controller.abort()
  }, [userLocation, fallbackStartLoc, activeDestination, travelMode, isFollowing, mapInstance, speakInstruction, onToast])

  // Track progress through steps as user moves
  useEffect(() => {
    if (!userLocation || !routeData || !routeData.steps || routeData.steps.length === 0) return

    const [userLat, userLng] = userLocation
    const currentStep = routeData.steps[currentStepIndex]

    if (!currentStep) return

    // Check distance to the end of current step location
    if (currentStep.maneuver?.location) {
      const [stepLng, stepLat] = currentStep.maneuver.location
      const distToStepEnd = getAirDistance(userLat, userLng, stepLat, stepLng)

      // If user is within 30 meters of step junction, advance to next maneuver
      if (distToStepEnd < 30 && currentStepIndex < routeData.steps.length - 1) {
        const nextIdx = currentStepIndex + 1
        setCurrentStepIndex(nextIdx)

        const nextStep = routeData.steps[nextIdx]
        const instruction = nextStep.maneuver?.instruction || nextStep.name || 'Continue'

        if (lastSpokenStepRef.current !== nextIdx) {
          lastSpokenStepRef.current = nextIdx
          speakInstruction(instruction)
        }
      }
    }
  }, [userLocation, routeData, currentStepIndex, speakInstruction])

  return {
    isNavigating: !!activeDestination,
    activeDestination,
    routeData,
    currentStep: routeData?.steps?.[currentStepIndex] || null,
    isFollowing,
    isMuted,
    travelMode,
    loading,
    error,
    startNavigation,
    stopNavigation,
    toggleFollowMode,
    toggleMute,
    toggleTravelMode
  }
}
