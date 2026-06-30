import React, { useEffect, useImperativeHandle, forwardRef, useRef } from 'react'

/**
 * GeolocationHandler Component
 * A logic-only React component that manages HTML5 Geolocation API requests.
 * Uses watchPosition to continuously track the user's device and updates the map marker dynamically.
 * Exposes imperative locate triggers to parent views via forwardRef to fly back to the user.
 *
 * @param {Object} props
 * @param {Object} props.mapInstance - Active Leaflet map instance.
 * @param {Function} props.onToast - Callback to trigger/clear floating status toasts.
 * @param {Function} props.onLocationFound - Callback triggered with resolved coordinates: ([lat, lng]) => void.
 * @param {React.Ref} ref - Exposes trigger methods `locate` and `locateOnMount` to the parent.
 */
const GeolocationHandler = forwardRef(({ mapInstance, onToast, onLocationFound }, ref) => {
  /** @type {React.MutableRefObject<Array<number>|null>} Caches the most recent coordinate resolution. */
  const lastLocationRef = useRef(null)

  /** @type {React.MutableRefObject<boolean>} Tracks if viewport has flown to user coordinates on load. */
  const initialFlyDone = useRef(false)

  /** @type {React.MutableRefObject<number|null>} Tracks the watchPosition process reference ID. */
  const watchIdRef = useRef(null)
  
  /**
   * Bounding Box checks for Israel, Greece, Italy.
   * Restricts user geolocation triggers to active dataset boundaries.
   * 
   * @param {number} latitude - Target latitude to inspect.
   * @param {number} longitude - Target longitude to inspect.
   * @returns {boolean} True if coordinates fall within supported bounding boxes.
   */
  const isSupported = (latitude, longitude) => {
    return (
      (latitude >= 29.0 && latitude <= 33.5 && longitude >= 34.0 && longitude <= 36.5) || // Israel BBox
      (latitude >= 34.0 && latitude <= 42.0 && longitude >= 19.0 && longitude <= 28.5) || // Greece BBox
      (latitude >= 35.5 && latitude <= 47.5 && longitude >= 6.5 && longitude <= 18.5)     // Italy BBox
    )
  }

  useEffect(() => {
    if (!navigator.geolocation) {
      onToast("Geolocation is not supported by this browser.")
      return
    }

    // Set up continuous watchPosition tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const supported = isSupported(latitude, longitude)
        
        if (supported) {
          const loc = [latitude, longitude]
          lastLocationRef.current = loc
          onLocationFound(loc)
          
          // Fly to the user only on their very first location resolution
          if (!initialFlyDone.current && mapInstance) {
            initialFlyDone.current = true
            mapInstance.flyTo(loc, 13)
          }
        } else {
          // If outside bounds on initial load
          if (!initialFlyDone.current) {
            initialFlyDone.current = true
            onToast("Your location is outside supported regions (Israel, Greece, Italy). Centering on Mediterranean.")
            if (mapInstance) {
              mapInstance.flyTo([38.5, 20.0], 7)
            }
          }
        }
      },
      (err) => {
        console.warn('Geolocation error:', err)
        if (!initialFlyDone.current) {
          initialFlyDone.current = true
          onToast("Location access denied or unavailable. Please check browser permissions.")
        }
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000,
        timeout: 5000
      }
    )

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
      }
    }
  }, [mapInstance, onToast, onLocationFound])

  // Expose location triggers to parent refs
  useImperativeHandle(ref, () => ({
    locate: () => {
      if (lastLocationRef.current && mapInstance) {
        mapInstance.flyTo(lastLocationRef.current, 15) // Zoom in closely when explicitly clicking locate
        onToast("Locating you...")
        setTimeout(() => onToast(null), 1500)
      } else {
        onToast("Searching for GPS signal...")
      }
    },
    // locateOnMount kept for API compatibility if parent calls it
    locateOnMount: () => {}
  }))

  return null
})

GeolocationHandler.displayName = 'GeolocationHandler'
export default GeolocationHandler
