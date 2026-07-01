import { useEffect, useRef } from 'react'
import { backendApi } from '~/services/api'

/**
 * useDeepLink Custom Hook
 * 
 * Inspects URL search parameters on page mount. If a `?site=<id>` parameter
 * exists, it queries the backend API for coordinates and triggers map centering
 * and detail drawer display automatically.
 * 
 * @param {L.Map|null} mapInstance - Active Leaflet map instance viewport.
 * @param {Function} handleSiteClick - Selection callback to load site metadata in drawer.
 */
export const useDeepLink = (mapInstance, handleSiteClick) => {
  /** @type {React.MutableRefObject<boolean>} Caches whether deep link lookup was already executed. */
  const deepLinkTriggered = useRef(false)

  useEffect(() => {
    if (mapInstance && !deepLinkTriggered.current) {
      const siteId = new URLSearchParams(window.location.search).get('site')
      if (siteId) {
        deepLinkTriggered.current = true
        
        backendApi.fetchSiteDetails(siteId)
          .then(data => {
            if (data.geometry && data.geometry.coordinates) {
              const [lng, lat] = data.geometry.coordinates
              mapInstance.setView([lat, lng], 18)
              handleSiteClick({
                id: data.id,
                ...data.properties,
                coordinates: [lat, lng]
              })
            }
          })
          .catch(err => {
            console.error('Deep link failed:', err)
            const url = new URL(window.location)
            url.searchParams.delete('site')
            window.history.replaceState({}, '', url)
          })
      }
    }
  }, [mapInstance, handleSiteClick])
}
