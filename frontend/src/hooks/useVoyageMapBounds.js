import { useEffect, useRef } from 'react'
import L from 'leaflet'

/**
 * Custom hook to automatically adjust Leaflet map bounds to encompass all stops in an active voyage.
 * 
 * @param {L.Map|null} mapInstance - Leaflet map reference
 * @param {Object|null} activeVoyage - Currently active voyage object
 */
export function useVoyageMapBounds(mapInstance, activeVoyage) {
  const isFirstVoyageLoad = useRef(true)

  useEffect(() => {
    isFirstVoyageLoad.current = true
  }, [activeVoyage?.id])

  useEffect(() => {
    if (!mapInstance || !activeVoyage) return

    const coords = []
    const stops = activeVoyage.stops || []

    stops.forEach(stop => {
      const details = stop.siteDetails
      if (details?.coordinates) {
        coords.push(details.coordinates) // [lat, lng]
      }
    })

    if (coords.length > 0) {
      try {
        const bounds = L.latLngBounds(coords)
        mapInstance.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 })
      } catch (err) {
        console.warn('Failed to fit map bounds for voyage:', err)
      }
    }
  }, [mapInstance, activeVoyage])
}
