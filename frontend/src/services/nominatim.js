/**
 * Service to interact with the Nominatim OpenStreetMap Geocoding API.
 */

const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';

/**
 * Searches for cities matching the given query using Nominatim API.
 * 
 * @param {string} query - The city name to search for.
 * @param {AbortSignal} signal - Abort signal to cancel the fetch request.
 * @returns {Promise<Array<Object>>} A promise resolving to an array of site-like feature objects.
 */
export const searchCities = async (query, signal) => {
  if (!query.trim()) return [];

  const url = new URL(`${NOMINATIM_BASE_URL}/search`);
  url.searchParams.append('city', query);
  url.searchParams.append('format', 'json');
  url.searchParams.append('limit', '5');
  url.searchParams.append('addressdetails', '1');

  const response = await fetch(url.toString(), {
    signal,
    headers: {
      // Nominatim requires a valid user agent
      'User-Agent': 'HistoryVoyageApp/1.0 (frontend client)'
    }
  });

  if (!response.ok) {
    throw new Error('Nominatim search request failed');
  }

  const data = await response.json();

  // Map Nominatim results to the GeoJSON-like structure used by SearchBar
  return data.map((item) => {
    // Nominatim bounding box: [south, north, west, east]
    // Note: Some places use [min_lat, max_lat, min_lon, max_lon]
    const [minLat, maxLat, minLon, maxLon] = item.boundingbox.map(parseFloat);
    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);

    const country = item.address?.country || item.display_name.split(',').pop().trim();
    const name = item.name || item.display_name.split(',')[0];

    return {
      id: `city-${item.place_id}`,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat] // GeoJSON is [lng, lat]
      },
      properties: {
        name: name,
        englishName: name, // Fallback
        country: country,
        site_type: 'city',
        bbox: [minLat, minLon, maxLat, maxLon], // Custom property to hold bbox [south, west, north, east]
      }
    };
  });
};
