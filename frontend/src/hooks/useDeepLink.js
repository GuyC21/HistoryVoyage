import { useEffect, useRef } from 'react'
import { backendApi } from '../services/api'

export const useDeepLink = (mapInstance, handleSiteClick) => {
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
