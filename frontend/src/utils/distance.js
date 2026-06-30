/**
 * Distance Calculation Utilities
 * Handles geodesic distance (Haversine) and actual routing distance (OSRM API).
 */

// Radius of the Earth in meters
const R = 6371e3;

/**
 * Calculates the straight-line (air) distance between two coordinates using the Haversine formula.
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lon1 - Longitude of point 1
 * @param {number} lat2 - Latitude of point 2
 * @param {number} lon2 - Longitude of point 2
 * @returns {number} Distance in meters
 */
export const getAirDistance = (lat1, lon1, lat2, lon2) => {
  const toRad = (value) => (value * Math.PI) / 180;
  
  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const deltaPhi = toRad(lat2 - lat1);
  const deltaLambda = toRad(lon2 - lon1);

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) *
    Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
};

/**
 * Fetches the road driving distance using the public OSRM API.
 * @param {number} lat1 - Latitude of origin
 * @param {number} lon1 - Longitude of origin
 * @param {number} lat2 - Latitude of destination
 * @param {number} lon2 - Longitude of destination
 * @param {AbortSignal} signal - Optional abort signal to cancel requests
 * @returns {Promise<{distance: number, isAir: boolean}>} Object containing distance in meters and whether it fell back to air distance
 */
export const getRoadDistance = async (lat1, lon1, lat2, lon2, signal = null) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${lon1},${lat1};${lon2},${lat2}?overview=false`;
    
    const response = await fetch(url, { signal });
    if (!response.ok) {
      throw new Error(`OSRM API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.code === 'Ok' && data.routes && data.routes.length > 0) {
      // OSRM returns distance in meters
      return { distance: data.routes[0].distance, isAir: false };
    } else {
      throw new Error(`No route found: ${data.code}`);
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
    console.warn('OSRM routing failed, falling back to air distance (Haversine).', error);
    // Fallback to Haversine air distance
    const airDist = getAirDistance(lat1, lon1, lat2, lon2);
    return { distance: airDist, isAir: true };
  }
};

/**
 * Converts meters to the specified format (km or mi) and returns a formatted string.
 * @param {number} meters - Distance in meters
 * @param {string} unit - 'km' or 'mi'
 * @returns {string} Formatted string with 1 decimal place
 */
export const formatDistance = (meters, unit = 'km') => {
  if (unit === 'mi') {
    const miles = meters / 1609.344;
    return `${miles.toFixed(1)} mi`;
  }
  // Default to km
  const km = meters / 1000;
  return `${km.toFixed(1)} km`;
};
