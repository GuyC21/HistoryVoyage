import React, { useEffect, useImperativeHandle, forwardRef, useCallback } from 'react'

/**
 * GeolocationHandler Component
 * A logic-only React component that manages HTML5 Geolocation API requests.
 * Automatically attempts to detect device coordinates on mount, checks if they are within
 * database boundary coverage, and exposes imperative locate triggers to parent views via forwardRef.
 *
 * @param {Object} props
 * @param {Object} props.mapInstance - Active Leaflet map instance.
 * @param {Function} props.onToast - Callback to trigger/clear floating status toasts.
 * @param {Function} props.onLocationFound - Callback triggered with resolved coordinates: ([lat, lng]) => void.
 * @param {React.Ref} ref - Exposes trigger methods `locate` and `locateOnMount` to the parent.
 */
const GeolocationHandler = forwardRef(({ mapInstance, onToast, onLocationFound }, ref) => {
  
  // Bounding Box checks for Israel, Greece, Italy
  const isSupported = (latitude, longitude) => {
    return (
      (latitude >= 29.0 && latitude <= 33.5 && longitude >= 34.0 && longitude <= 36.5) ||
      (latitude >= 34.0 && latitude <= 42.0 && longitude >= 19.0 && longitude <= 28.5) ||
      (latitude >= 35.5 && latitude <= 47.5 && longitude >= 6.5 && longitude <= 18.5)
    )
  }

  const locateUser = useCallback((showToast = true, flyTo = true) => {
    if (navigator.geolocation) {
      if (showToast) onToast("Locating you...")
      
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          const supported = isSupported(latitude, longitude)
          
          if (supported) {
            onLocationFound([latitude, longitude])
            if (flyTo && mapInstance) {
              mapInstance.flyTo([latitude, longitude], 13)
            }
            if (showToast) onToast(null) // Clear loading toast
          } else {
            onToast("Your location is outside supported regions (Israel, Greece, Italy). Centering on Mediterranean.")
            if (flyTo && mapInstance) {
              mapInstance.flyTo([38.5, 20.0], 7)
            }
          }
        },
        (err) => {
          console.warn('Geolocation error:', err)
          onToast("Location access denied or unavailable. Please check browser permissions.")
        }
      )
    } else {
      onToast("Geolocation is not supported by this browser.")
    }
  }, [mapInstance, onToast, onLocationFound])

  // Expose location triggers to parent refs
  useImperativeHandle(ref, () => ({
    locate: () => locateUser(true, true),
    locateOnMount: () => locateUser(false, true)
  }))

  // Trigger automatically on mount once mapInstance is active
  useEffect(() => {
    if (mapInstance) {
      locateUser(false, true)
    }
  }, [mapInstance, locateUser])

  return null
})

GeolocationHandler.displayName = 'GeolocationHandler'
export default GeolocationHandler
