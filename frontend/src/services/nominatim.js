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
export const searchCities = async (query, signal, countryCode = null) => {
  if (!query.trim()) return [];

  // Use Open-Meteo Geocoding API for robust city autocomplete (no API key required)
  const url = new URL(`https://geocoding-api.open-meteo.com/v1/search`);
  url.searchParams.append('name', query);
  url.searchParams.append('count', '100'); // Fetch enough to filter client-side
  url.searchParams.append('language', 'en');
  url.searchParams.append('format', 'json');

  const response = await fetch(url.toString(), { signal });

  if (!response.ok) {
    throw new Error('City search request failed');
  }

  const data = await response.json();
  if (!data.results) return [];

  let results = data.results;

  // Strictly filter the results to the selected country if provided
  if (countryCode) {
    results = results.filter(
      item => item.country_code && item.country_code.toLowerCase() === countryCode.toLowerCase()
    );
  }

  // Map Open-Meteo results to the expected format
  return results.map((item) => {
    const lat = item.latitude;
    const lon = item.longitude;

    // Open-Meteo returns coordinates, but MapExplorer needs a bounding box to fly to.
    // Create a synthetic bounding box roughly 10km across (~0.05 degrees)
    const bbox = [
      lat - 0.05, // minLat (south)
      lon - 0.05, // minLon (west)
      lat + 0.05, // maxLat (north)
      lon + 0.05  // maxLon (east)
    ];

    // Construct a clean display name (e.g. "Corfu, Ionian Islands, Greece")
    const parts = [item.name];
    if (item.admin1 && item.admin1 !== item.name) parts.push(item.admin1);
    if (item.country) parts.push(item.country);
    
    return {
      id: `city-${item.id}`,
      type: 'Feature',
      geometry: {
        type: 'Point',
        coordinates: [lon, lat] // GeoJSON is [lng, lat]
      },
      properties: {
        name: item.name,
        englishName: item.name, // Fallback
        country: item.country,
        site_type: 'city',
        bbox: bbox, // Custom property to hold synthetic bbox
        display_name: parts.join(', ') // Add the rich display name we constructed
      }
    };
  });
};
