import { useState, useEffect, useRef, useCallback } from 'react'
import { fetchDetailedRoute, formatManeuverInstruction, transliterateHebrewToLatin } from '~/services/routingService'
import { getAirDistance } from '~/utils/distance'

/**
 * Custom React Hook to manage Waze/Google Maps-style live active navigation.
 * Handles route calculation, continuous position tracking, camera auto-follow,
 * turn-by-turn maneuver progression, and multi-stage Waze-like voice guidance.
 *
 * @param {Array<number>|null} userLocation - Real-time user GPS coordinates [lat, lng].
 * @param {L.Map|null} mapInstance - Active Leaflet map reference.
 * @param {Function} [onToast] - Optional callback to render status toasts.
 * @returns {Object} Active navigation state and control handlers:
 *   - {boolean} isNavigating - True if live navigation focus mode is active.
 *   - {Object|null} activeDestination - Target site metadata { id, name, lat, lng }.
 *   - {Object|null} routeData - Resolved route details { coordinates, distance, duration, steps }.
 *   - {Object|null} currentStep - Active maneuver step object.
 *   - {Object|null} upcomingStep - Target next maneuver step object.
 *   - {number|null} distToNextTurn - Real-time distance in meters to upcoming turn.
 *   - {boolean} isFollowing - True if camera is locked/panning to user coordinates.
 *   - {boolean} isMuted - True if voice guidance audio is muted.
 *   - {boolean} loading - True if route fetch is in progress.
 *   - {Function} startNavigation - Function to launch navigation for a target site: (site) => void.
 *   - {Function} stopNavigation - Function to exit navigation mode: () => void.
 *   - {Function} toggleFollowMode - Function to toggle camera follow lock: () => void.
 *   - {Function} toggleMute - Function to toggle voice guidance mute: () => void.
 *   - {Function} toggleTravelMode - Function to toggle between driving and walking: () => void.
 */
export function useActiveNavigation(userLocation, mapInstance, onToast) {
  const [activeDestination, setActiveDestination] = useState(null)
  const [fallbackStartLoc, setFallbackStartLoc] = useState(null)
  const [travelMode, setTravelMode] = useState('driving') // 'driving' or 'foot'
  const [routeData, setRouteData] = useState(null)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [distToNextTurn, setDistToNextTurn] = useState(null)
  const [isFollowing, setIsFollowing] = useState(true)
  const [isMuted, setIsMuted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  /** @type {React.MutableRefObject<Array<number>|null>} Caches last routed user position to prevent spamming APIs */
  const lastRoutedLocationRef = useRef(null)

  /** @type {React.MutableRefObject<string|null>} Caches last routed travel mode ('driving' vs 'foot') */
  const lastRoutedModeRef = useRef(null)

  /** 
   * @type {React.MutableRefObject<{ stepIndex: number, advanceSpoken: boolean, headsUpSpoken: boolean }>} 
   * Tracks spoken voice announcements per step to prevent duplicate calls.
   */
  const spokenStateRef = useRef({ stepIndex: -1, advanceSpoken: false, headsUpSpoken: false })

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

      // Transliterate Hebrew characters into phonetic English so en-US TTS reads Hebrew street names naturally
      const spokenText = transliterateHebrewToLatin(text)

      const utterance = new SpeechSynthesisUtterance(spokenText)
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
    setDistToNextTurn(null)
    setRouteData(null)
    lastRoutedLocationRef.current = null
    lastRoutedModeRef.current = null

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
    setDistToNextTurn(null)
    lastRoutedLocationRef.current = null
    lastRoutedModeRef.current = null
    spokenStateRef.current = { routeStartedSpoken: false, stepIndex: -1, advanceSpoken: false, headsUpSpoken: false }
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
        const stepText = formatManeuverInstruction(step) || 'Continue on route'
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
        setCurrentStepIndex(0)
        spokenStateRef.current = { routeStartedSpoken: false, stepIndex: -1, advanceSpoken: false, headsUpSpoken: false }
        lastRoutedLocationRef.current = currentLoc
        lastRoutedModeRef.current = travelMode

        // Auto-pan camera if follow mode is enabled
        if (isFollowing && mapInstance) {
          mapInstance.flyTo(currentLoc, 16, { animate: true })
        }
        
        // Note: Initial voice announcement has been moved to the tracking effect below
        // to guarantee synchronization with the UI step state.
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

  // Track progress through steps and trigger Waze-style progressive voice guidance
  useEffect(() => {
    if (!userLocation || !routeData || !routeData.steps || routeData.steps.length === 0) return

    const [userLat, userLng] = userLocation
    const totalSteps = routeData.steps.length
    const currentStep = routeData.steps[currentStepIndex]

    if (!currentStep) return

    // 1. Resolve target coordinates of the upcoming maneuver / turn
    let targetLat = null
    let targetLng = null
    let upcomingInstruction = ''

    if (currentStepIndex < totalSteps - 1) {
      const nextStep = routeData.steps[currentStepIndex + 1]
      const nextManeuverLoc = nextStep?.maneuver?.location
      if (nextManeuverLoc) {
        targetLng = nextManeuverLoc[0]
        targetLat = nextManeuverLoc[1]
      }
      upcomingInstruction = formatManeuverInstruction(nextStep)
    } else if (activeDestination) {
      targetLat = activeDestination.lat
      targetLng = activeDestination.lng
      upcomingInstruction = `arrive at ${activeDestination.name}`
    }

    if (targetLat === null || targetLng === null) return

    // 2. Calculate real-time distance from user to the upcoming turn
    const distToTurn = getAirDistance(userLat, userLng, targetLat, targetLng)
    setDistToNextTurn(distToTurn)

    // Reset spoken flags if we advanced to a new step
    if (spokenStateRef.current.stepIndex !== currentStepIndex) {
      // Keep routeStartedSpoken intact so we don't say "Starting route" again
      spokenStateRef.current = {
        ...spokenStateRef.current,
        stepIndex: currentStepIndex,
        advanceSpoken: false,
        headsUpSpoken: false
      }
    }

    // 3. Step Advancement Threshold: within 25m of maneuver junction
    if (distToTurn < 25 && currentStepIndex < totalSteps - 1) {
      setCurrentStepIndex((prev) => prev + 1)
      return
    }

    // 4. Voice Announcement Thresholds:
    // Driving: 1000m (Advance), 100m (Heads Up)
    // Walking (foot): 500m (Advance), 100m (Heads Up)
    const advanceThreshold = travelMode === 'driving' ? 1000 : 500
    const headsUpThreshold = 100

    const state = spokenStateRef.current

    const formatSpeechDistance = (meters) => {
      if (meters >= 1000) {
        const km = (meters / 1000).toFixed(1).replace('.0', '')
        return `${km} kilometer${km === '1' ? '' : 's'}`
      }
      const roundedMeters = Math.round(meters / 50) * 50 || 50
      return `${roundedMeters} meters`
    }

    // A. Initial Route Start Announcement
    // Guarantees we announce the exact same maneuver the UI has settled on.
    if (!state.routeStartedSpoken) {
      state.routeStartedSpoken = true
      if (distToTurn <= advanceThreshold) state.advanceSpoken = true
      if (distToTurn <= headsUpThreshold) state.headsUpSpoken = true
      
      const speechText = `Starting route. In ${formatSpeechDistance(distToTurn)}, ${upcomingInstruction}`
      speakInstruction(speechText)
      return
    }

    // B. Advance / Early Warning: Triggered when distance <= advanceThreshold and > 100m
    if (distToTurn <= advanceThreshold && distToTurn > headsUpThreshold) {
      if (!state.advanceSpoken) {
        state.advanceSpoken = true
        const speechText = `In ${formatSpeechDistance(distToTurn)}, ${upcomingInstruction}`
        speakInstruction(speechText)
      }
    } 
    // B. Heads-Up Warning: Triggered when distance <= 100m and > 25m
    else if (distToTurn <= headsUpThreshold && distToTurn > 25) {
      if (!state.headsUpSpoken) {
        state.advanceSpoken = true // Prevent advance warning if step starts inside heads-up zone
        state.headsUpSpoken = true
        const speechText = `In 100 meters, ${upcomingInstruction}`
        speakInstruction(speechText)
      }
    }
  }, [userLocation, routeData, currentStepIndex, travelMode, activeDestination, speakInstruction])

  return {
    isNavigating: !!activeDestination,
    activeDestination,
    routeData,
    currentStep: routeData?.steps?.[currentStepIndex] || null,
    upcomingStep: routeData?.steps?.[currentStepIndex + 1] || null,
    distToNextTurn,
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
