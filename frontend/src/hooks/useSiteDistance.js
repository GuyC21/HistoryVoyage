import { useState, useEffect, useRef } from 'react'
import { getRoadDistance } from '~/utils/distance'
import { supabase } from '~/services/supabase'

/**
 * Custom hook to handle distance calculations and distance unit preferences for a site.
 * 
 * @param {Object|null} site - Current site object
 * @param {Array|Object|null} userLocation - User's current location [lat, lng]
 * @param {boolean} isOpen - Whether drawer is open
 * @param {Object|null} user - Supabase user object
 * @returns {Object} { distanceData, distanceUnit, handleDistanceUnitChange }
 */
export function useSiteDistance(site, userLocation, isOpen, user) {
  const [distanceUnit, setDistanceUnit] = useState(() => {
    return localStorage.getItem('app-distance-unit') || 'km'
  })

  const [distanceData, setDistanceData] = useState(null)
  const distanceAbortRef = useRef(null)

  // Sync distanceUnit state when user metadata is loaded
  useEffect(() => {
    if (user?.user_metadata?.distance_unit) {
      setDistanceUnit(user.user_metadata.distance_unit)
    }
  }, [user])

  const handleDistanceUnitChange = async (newUnit) => {
    setDistanceUnit(newUnit)
    localStorage.setItem('app-distance-unit', newUnit)
    if (user) {
      try {
        await supabase.auth.updateUser({
          data: {
            distance_unit: newUnit
          }
        })
      } catch (err) {
        console.error('Failed to sync distance unit to Supabase:', err)
      }
    }
  }

  useEffect(() => {
    if (distanceAbortRef.current) {
      distanceAbortRef.current.abort()
    }
    
    if (!isOpen || !site || !site.coordinates || !userLocation) {
      setDistanceData(null)
      return
    }

    const fetchDistance = async () => {
      const controller = new AbortController()
      distanceAbortRef.current = controller

      try {
        const [siteLat, siteLng] = site.coordinates
        const userLat = Array.isArray(userLocation) ? userLocation[0] : userLocation.lat
        const userLng = Array.isArray(userLocation) ? userLocation[1] : userLocation.lng
        
        const data = await getRoadDistance(userLat, userLng, siteLat, siteLng, controller.signal)
        setDistanceData(data)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Distance calculation failed:', err)
          setDistanceData(null)
        }
      }
    }

    fetchDistance()

    return () => {
      if (distanceAbortRef.current) {
        distanceAbortRef.current.abort()
      }
    }
  }, [site, userLocation, isOpen])

  return {
    distanceData,
    distanceUnit,
    handleDistanceUnitChange
  }
}
