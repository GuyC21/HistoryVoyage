/**
 * Maps country name identifiers to their corresponding local Wikipedia sub-domain codes.
 * 
 * Supports Greece ('el'), Italy ('it'), and Israel ('he'), falling back to English ('en').
 * 
 * @param {string} country - The country name string.
 * @returns {string} The Wikipedia language subdomain code.
 */
export const getWikiLangCode = (country) => {
  if (!country) return 'en'
  const c = country.toLowerCase()
  if (c.includes('greece') || c.includes('gr')) return 'el'
  if (c.includes('italy') || c.includes('it')) return 'it'
  if (c.includes('israel') || c.includes('il')) return 'he'
  return 'en'
}

/**
 * Calculates the distance in kilometers between two points using the Haversine formula.
 * 
 * @param {number} lat1 - Latitude of first point.
 * @param {number} lon1 - Longitude of first point.
 * @param {number} lat2 - Latitude of second point.
 * @param {number} lon2 - Longitude of second point.
 * @returns {number} Distance in kilometers.
 */
export const getHaversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371 // Radius of the Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}

/**
 * Validates whether a search result is likely matching the queried historical site name.
 * 
 * Employs a word-intersection and geographic proximity heuristic:
 * 1. Strips parentheses (e.g., "(island)") from the article title.
 * 2. Normalizes characters (lowercases, strips accents using NFD decomposition).
 * 3. Rejects matches if the Wikipedia article coordinates are too far from the database location.
 * 4. Rejects matches if the Wikipedia title introduces extra specific keywords not in the site name.
 * 
 * @param {string} siteName - Target historical site name.
 * @param {string} articleTitle - Wikipedia article title returned by search.
 * @param {string} country - Physical country name to filter as a stop word.
 * @param {Array|Object|null} siteCoordinates - The database coordinates of the site: [lat, lon] or {lat, lng}.
 * @param {Object|null} pageCoordinates - The coordinates returned from Wikipedia: {lat, lon}.
 * @param {string} siteType - Category of the site (e.g. 'castle', 'relation').
 * @returns {boolean} True if semantic and geographic matching constraints are met.
 */
export const isValidSearchResult = (siteName, articleTitle, country, siteCoordinates = null, pageCoordinates = null, siteType = 'other') => {
  if (!siteName || !articleTitle) return false
  
  // Normalize by making lowercase, removing accents and non-alphanumeric characters
  const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}\s]/gu, "")
  
  // Strip parenthetical qualifiers (e.g., "Paxos (island)" -> "Paxos")
  const cleanTitle = articleTitle.replace(/\s*\(.*?\)\s*/g, '')

  const name1 = normalize(siteName)
  const name2 = normalize(cleanTitle)
  const countryName = country ? normalize(country) : ''

  // 1. Direct exact match is a perfect signal
  if (name1 === name2) return true

  // 2. Geographic Proximity Check (Dynamic Threshold)
  if (siteCoordinates && pageCoordinates) {
    try {
      const lat1 = Array.isArray(siteCoordinates) ? siteCoordinates[0] : (siteCoordinates.lat || siteCoordinates.latitude)
      const lon1 = Array.isArray(siteCoordinates) ? siteCoordinates[1] : (siteCoordinates.lng || siteCoordinates.longitude)
      const lat2 = pageCoordinates.lat
      const lon2 = pageCoordinates.lon

      if (lat1 !== undefined && lon1 !== undefined && lat2 !== undefined && lon2 !== undefined) {
        const distance = getHaversineDistance(lat1, lon1, lat2, lon2)
        const pointTypes = ['castle', 'ruins', 'monument', 'holy_site', 'archaeological']
        const threshold = pointTypes.includes(siteType) ? 2 : 10 // 2km for points, 10km for cities/islands
        
        if (distance > threshold) {
          console.warn(`Wikipedia candidate "${articleTitle}" rejected due to distance: ${distance.toFixed(2)} km > ${threshold} km`)
          return false
        }
      }
    } catch (err) {
      console.error('Error calculating distance check:', err)
    }
  }

  // 3. String Word Overlap & Specificity Check
  const stopWords = new Set(['the', 'of', 'in', 'and', 'at', 'on', 'for', 'a', 'an', 'fort', 'castle', 'temple', 'ruins', 'ancient', 'site', 'church', 'monastery', 'national', 'park', countryName])
  
  const words1 = name1.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
  const words2 = name2.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))

  // If the article title contains specific words not in our database site name, reject the match
  if (words2.length > 0) {
    const hasExtraSpecificWords = words2.some(w => !words1.includes(w))
    if (hasExtraSpecificWords) {
      return false
    }
  }

  // If there are meaningful words, check if there's any intersection
  if (words1.length > 0) {
    return words1.some(w => words2.includes(w))
  }
  
  return false
}
