import { useState, useEffect } from 'react'
import { backendApi } from '../services/api'

/**
 * useMapData Custom Hook
 * 
 * Manages fetching lists of historical sites based on changing viewport coordinates (bounds)
 * or circular coordinates limits (nearbyCenter/nearbyRadius). Coordinates fetches using
 * standard AJAX cancel tokens (AbortController) to handle rapid map panning.
 * 
 * @param {string|null} bounds - Bounding box coordinates string ('west,south,east,north').
 * @param {Object|null} nearbyCenter - Circular center coordinates object: { lat, lng }.
 * @param {number} nearbyRadius - Search radius limit in meters.
 * @param {string} activeFilter - Active category key filter (e.g. 'castle', 'all').
 * @returns {{ sites: Array<Object>, loading: boolean, error: string|null }} Fetch states.
 */
export const useMapData = (bounds, nearbyCenter, nearbyRadius, activeFilter) => {
  /** @type {Array<Object>} Features list mapped and filtered from backend geo-JSON. */
  const [sites, setSites] = useState([])

  /** @type {boolean} Hook loading status. */
  const [loading, setLoading] = useState(false)

  /** @type {string|null} Status warning details on fetch errors. */
  const [error, setError] = useState(null)

  useEffect(() => {
    const abortController = new AbortController()

    const parseFeatures = (data) => {
      const features = Array.isArray(data.features) ? data.features : []
      const parsedSites = features.map((feature) => {
        let coordinates = null
        if (feature.geometry && feature.geometry.coordinates) {
          coordinates = feature.geometry.type === 'Point' 
            ? [feature.geometry.coordinates[1], feature.geometry.coordinates[0]]
            : null
        }
        return {
          id: feature.id || feature.properties?.id,
          properties: feature.properties || {},
          coordinates,
          geometry: feature.geometry
        }
      })
      return parsedSites.filter(site => site.coordinates)
    }

    const fetchData = async () => {
      setLoading(true)
      setError(null)

      try {
        let data
        if (nearbyCenter) {
          data = await backendApi.fetchNearbySites(nearbyCenter.lat, nearbyCenter.lng, nearbyRadius, abortController)
        } else {
          if (!bounds) {
            setSites([])
            setLoading(false)
            return
          }
          data = await backendApi.fetchSitesInBounds(bounds, activeFilter, abortController)
        }
        
        setSites(parseFeatures(data))
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch sites:', err)
          setError('Could not load historical sites.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()

    return () => {
      abortController.abort()
    }
  }, [bounds, nearbyCenter, nearbyRadius, activeFilter])

  return { sites, loading, error }
}
