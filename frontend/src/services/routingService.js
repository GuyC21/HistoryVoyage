import { getAirDistance } from '~/utils/distance'

/**
 * Routing Service
 * Handles interaction with the Open Source Routing Machine (OSRM) API
 * and generates deep links for external navigation applications (Waze, Google Maps, Apple Maps).
 */

/**
 * Fetches a detailed driving or walking route from OSRM, including full polyline geometries and maneuver steps.
 *
 * @param {number} startLat - Latitude of origin
 * @param {number} startLng - Longitude of origin
 * @param {number} destLat - Latitude of destination
 * @param {number} destLng - Longitude of destination
 * @param {string} [mode='driving'] - Travel mode profile ('driving', 'foot', or 'bike')
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
    let url = ''
    if (mode === 'foot') {
      // FOSSGIS OSRM foot server indexes informal trails, dirt paths, and parks far better than the demo server
      url = `https://routing.openstreetmap.de/routed-foot/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`
    } else if (mode === 'bike') {
      url = `https://routing.openstreetmap.de/routed-bike/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`
    } else {
      url = `https://router.project-osrm.org/route/v1/driving/${startLng},${startLat};${destLng},${destLat}?overview=full&geometries=geojson&steps=true`
    }

    const response = await fetch(url, { signal })
    if (!response.ok) {
      throw new Error(`OSRM routing service responded with status ${response.status}`)
    }

    const data = await response.json()

    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      const route = data.routes[0]
      // OSRM returns GeoJSON coordinates as [lng, lat], map to Leaflet [lat, lng]
      const coordinates = (route.geometry?.coordinates || []).map(([lng, lat]) => [lat, lng])
      let steps = route.legs?.[0]?.steps || []

      // Seamlessly connect the final route point directly to the destination site pin
      // if OSRM snapped to a park entrance or nearby road edge.
      if (coordinates.length > 0) {
        const lastPoint = coordinates[coordinates.length - 1]
        const remainingDist = getAirDistance(lastPoint[0], lastPoint[1], destLat, destLng)

        // If the site pin is between 5 meters and 300 meters from the last road point, append the site pin.
        // We cap this at 300m to prevent drawing massive "fake" straight lines across large unroutable areas.
        if (remainingDist > 5 && remainingDist < 300) {
          coordinates.push([destLat, destLng])

          // Append final step maneuver instruction for trail/pedestrian access
          steps = [
            ...steps,
            {
              distance: remainingDist,
              duration: remainingDist / 1.3, // ~1.3 m/s walking speed
              name: 'Park Trail Access',
              maneuver: {
                type: 'arrive',
                instruction: `Walk ${Math.round(remainingDist)}m to site destination`,
                location: [destLng, destLat]
              }
            }
          ]
        }
      }

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

/**
 * Transliterates Hebrew text to Latin/Phonetic English so that English Web Speech API engines
 * can pronounce Hebrew street names naturally without skipping words or stuttering.
 *
 * @param {string} text - Input text containing Hebrew characters
 * @returns {string} Phonetically readable English text
 */
export function transliterateHebrewToLatin(text) {
  if (!text || !/[\u0590-\u05FF]/.test(text)) return text

  const map = {
    'א': 'a', 'ב': 'v', 'ג': 'g', 'ד': 'd', 'ה': 'h', 'ו': 'o', 'ז': 'z',
    'ח': 'ch', 'ט': 't', 'י': 'i', 'כ': 'k', 'ך': 'k', 'ל': 'l', 'מ': 'm',
    'ם': 'm', 'נ': 'n', 'ן': 'n', 'ס': 's', 'ע': 'a', 'פ': 'p', 'ף': 'f',
    'צ': 'ts', 'ץ': 'ts', 'ק': 'k', 'ר': 'r', 'ש': 'sh', 'ת': 't'
  }

  let result = text
    .replace(/רחוב\s+/g, 'Rechov ')
    .replace(/רח'\s+/g, 'Rechov ')
    .replace(/שדרות\s+/g, 'Sderot ')
    .replace(/שד'\s+/g, 'Sderot ')
    .replace(/דרך\s+/g, 'Derech ')
    .replace(/כיכר\s+/g, 'Kikar ')
    .replace(/סמטת\s+/g, 'Simtat ')

  result = result.replace(/[\u0590-\u05FF]/g, (ch) => map[ch] || '')

  return result
    .replace(/\b([a-z])/g, (c) => c.toUpperCase())
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\b[Oo]nto$/, '')
    .trim()
}

/**
 * Helper to construct a human-readable maneuver instruction from an OSRM step.
 * Resolves OSRM maneuver type, modifier, and road name into natural phrasing.
 * Example: "turn left onto Herzl St", "continue straight", "arrive at destination".
 *
 * @param {Object} step - OSRM route step object
 * @returns {string} Natural language instruction phrase
 */
export function formatManeuverInstruction(step) {
  if (!step) return 'continue on route'
  if (step.maneuver?.instruction) return step.maneuver.instruction

  const type = step.maneuver?.type
  const modifier = step.maneuver?.modifier

  const cleanName = (step.name && typeof step.name === 'string') ? step.name.trim() : ''
  const hasValidName = cleanName.length > 0 && !/^unnamed/i.test(cleanName)
  const roadName = hasValidName ? `onto ${cleanName}` : ''

  if (type === 'arrive') {
    return 'arrive at your destination'
  }
  if (type === 'depart') {
    return `head ${modifier || ''} ${roadName}`.trim()
  }

  const actionMap = {
    'turn': 'turn',
    'new name': 'continue',
    'continue': 'continue',
    'end of road': 'turn',
    'fork': 'take the fork',
    'merge': 'merge',
    'on ramp': 'take the ramp',
    'off ramp': 'take the exit',
    'roundabout': 'enter the roundabout',
    'rotary': 'enter the roundabout'
  }

  const action = actionMap[type] || 'turn'
  const dir = modifier ? modifier.replace('slight ', 'slight ').replace('sharp ', 'sharp ') : ''

  if (action === 'continue' && !dir) {
    return `continue ${roadName}`.trim()
  }

  return `${action} ${dir} ${roadName}`.replace(/\s+/g, ' ').trim()
}

/**
 * Maps OSRM maneuver types/modifiers to visual direction icons/emojis.
 *
 * @param {Object|null} maneuver - OSRM maneuver object
 * @returns {string} Emoji representation of maneuver direction
 */
export const getManeuverIcon = (maneuver) => {
  if (!maneuver) return '⬆️'
  const type = maneuver.type || ''
  const modifier = maneuver.modifier || ''

  if (type === 'arrive') return '🏁'
  if (type === 'roundabout' || type === 'rotary') return '🔄'

  if (modifier === 'slight right') return '↗️'
  if (modifier === 'sharp right') return '↗️'
  if (modifier.includes('right')) return '↱'

  if (modifier === 'slight left') return '↖️'
  if (modifier === 'sharp left') return '↖️'
  if (modifier.includes('left')) return '↰'

  if (modifier.includes('u-turn')) return '↩️'

  return '⬆️'
}

