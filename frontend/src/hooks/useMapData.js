import { useState, useEffect } from 'react'
import { backendApi } from '../services/api'

export const useMapData = (bounds) => {
  const [sites, setSites] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!bounds) {
      setSites([])
      setError(null)
      return
    }

    const abortController = new AbortController()
    
    const fetchSites = async () => {
      setLoading(true)
      setError(null)

      try {
        const data = await backendApi.fetchSitesInBounds(bounds, abortController)
        // Ensure data is structured correctly as GeoJSON feature collection
        const features = Array.isArray(data.features) ? data.features : []
        
        // Compute IDs and extract geometry coordinates for quick frontend access
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
        
        setSites(parsedSites.filter(site => site.coordinates))
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to fetch sites:', err)
          setError('Could not load historical sites for this area.')
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSites()

    return () => {
      abortController.abort()
    }
  }, [bounds])

  return { sites, loading, error }
}
