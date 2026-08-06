import { useState, useEffect } from 'react'

/**
 * Custom hook to filter historical sites by category or active voyage view.
 * 
 * @param {Array} sites - All fetched sites
 * @param {string} activeFilter - Selected category filter ('all', 'relation', 'castle', etc.)
 * @param {boolean} isVoyageOnlyView - Whether active view is limited to voyage stops
 * @param {Object|null} activeVoyage - Active voyage object
 * @returns {Array} Filtered list of historical site GeoJSON features
 */
export function useFilteredSites(sites, activeFilter, isVoyageOnlyView, activeVoyage) {
  const [filteredSites, setFilteredSites] = useState(sites)

  useEffect(() => {
    let filtered = sites

    // 1. Filter by category
    if (activeFilter === 'relation') {
      filtered = filtered.filter((site) => site.properties?.osmType === 'relation')
    } else if (activeFilter !== 'all') {
      filtered = filtered.filter((site) => site.properties?.site_type === activeFilter)
    }

    // 2. Filter by Voyage if active
    if (isVoyageOnlyView && activeVoyage) {
      filtered = (activeVoyage.stops || []).map(stop => {
        const details = stop.siteDetails
        if (!details || !details.coordinates) return null
        return {
          id: details.id,
          geometry: {
            type: 'Point',
            coordinates: [details.coordinates[1], details.coordinates[0]] // [lng, lat]
          },
          properties: {
            name: details.name,
            englishName: details.englishName,
            site_type: details.siteType,
            wikidata: details.wikidata,
            country: details.country,
            osmType: 'node'
          }
        }
      }).filter(Boolean)
    }

    setFilteredSites(filtered)
  }, [sites, activeFilter, isVoyageOnlyView, activeVoyage])

  return filteredSites
}
