/**
 * Routing Service
 * Handles interaction with the Open Source Routing Machine (OSRM) API
 * and generates deep links for external navigation applications (Waze, Google Maps, Apple Maps).
 */

/**
 * Fetches a detailed driving route from OSRM, including full polyline geometries and maneuver steps.
 *
 * @param {number} startLat - Latitude of origin
 * @param {number} startLng - Longitude of origin
 * @param {number} destLat - Latitude of destination
 * @param {number} destLng - Longitude of destination
 * @param {AbortSignal|null} [signal=null] - Optional AbortSignal to cancel in-flight HTTP requests
 * @returns {Promise<{
 *   coordinates: Array<[number, number]>,
 *   distance: number,
 *   duration: number,
 *   steps: Array<Object>
 * }>} Detailed route object containing Leaflet [lat, lng] points, distance in meters, duration in seconds, and maneuver steps.
 * @throws {Error} Throws an error if network or routing failure occurs.
 */
export const fetchDetailedRoute = async (startLat, startLng, destLat, destLng, mode = 'driving', signal = null) => {
  try {
    const profile = mode === 'foot' ? 'foot' : mode === 'bike' ? 'bike' : 'driving'
    const url = `https://router.project-osrm.org/route/v1/${profile}/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`

    const response = await fetch(url, { signal })
    if (!response.ok) {
      throw new Error(`OSRM routing service responded with status ${response.status}`)
    }

    const data = await response.json()

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      // OSRM returns GeoJSON coordinates as [lng, lat], map to Leaflet [lat, lng]
      const coordinates = (route.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng])
      const steps = route.legs?.[0]?.steps || []

      return {
        coordinates,
        distance: route.distance,
        duration: route.duration,
        steps
      }
    } else {
      throw new Error(`No route found: ${data.code || 'Unknown error'}`)
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error
    }
    console.error('Failed to fetch detailed route from OSRM:', error)
    throw error
  }
}

/**
 * Generates deep link URLs for external mobile/web navigation applications.
 *
 * @param {number} destLat - Target destination latitude
 * @param {number} destLng - Target destination longitude
 * @param {number} [startLat] - Optional origin latitude
 * @param {number} [startLng] - Optional origin longitude
 * @returns {{
 *   googleMaps: string,
 *   waze: string,
 *   appleMaps: string
 * }} Object containing direct navigation links for Google Maps, Waze, and Apple Maps.
 */
export const getExternalNavLinks = (destLat, destLng, startLat, startLng) => {
  const originParam = (startLat && startLng) ? `&origin=${startLat},${startLng}` : ''
  const appleOriginParam = (startLat && startLng) ? `saddr=${startLat},${startLng}&` : ''

  return {
    googleMaps: `https://www.google.com/maps/dir/?api=1${originParam}&destination=${destLat},${destLng}&travelmode=driving`,
    waze: `https://waze.com/ul?ll=${destLat},${destLng}&navigate=yes`,
    appleMaps: `https://maps.apple.com/?${appleOriginParam}daddr=${destLat},${destLng}&dirflg=d`
  }
}
