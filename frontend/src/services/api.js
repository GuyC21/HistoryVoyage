const API_BASE = window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000'
  : 'http://localhost:8000'

/**
 * backendApi Service
 * 
 * Provides abstraction methods to communicate with the local Django REST API.
 */
export const backendApi = {
  /**
   * Retrieves historical sites situated within a specific bounding box.
   * 
   * @param {string} boundsStr - Bounding box coordinates string ('west,south,east,north').
   * @param {string} filterType - Category key filter constraint (e.g., 'castle', 'relation').
   * @param {AbortController} [abortController] - Optional cancel token reference.
   * @returns {Promise<Object>} Resolved GeoJSON feature collection payload.
   */
  fetchSitesInBounds: async (boundsStr, filterType, abortController) => {
    let url = `${API_BASE}/api/sites/?in_bbox=${boundsStr}`
    if (filterType && filterType !== 'all') {
      if (filterType === 'relation') {
        url += `&osm_type=relation`
      } else {
        url += `&site_type=${filterType}`
      }
    }
    const res = await fetch(url, { signal: abortController?.signal })
    if (!res.ok) throw new Error('Failed to fetch sites')
    return res.json()
  },

  /**
   * Retrieves full details for a single site, including boundaries if present.
   * 
   * @param {string|number} siteId - Target database record primary key ID.
   * @param {AbortController} [abortController] - Optional cancel token reference.
   * @returns {Promise<Object>} GeoJSON detailed feature object.
   */
  fetchSiteDetails: async (siteId, abortController) => {
    const res = await fetch(`${API_BASE}/api/sites/${siteId}/`, { signal: abortController?.signal })
    if (!res.ok) throw new Error('Backend retrieve failed')
    return res.json()
  },

  /**
   * Queries nearby historical sites situated within a given radius.
   * 
   * @param {number} lat - Center latitude.
   * @param {number} lng - Center longitude.
   * @param {number} radiusMeters - Maximum radius in meters.
   * @param {AbortController} [abortController] - Optional cancel token reference.
   * @returns {Promise<Object>} Resolved sites list GeoJSON payload.
   */
  fetchNearbySites: async (lat, lng, radiusMeters, abortController) => {
    const res = await fetch(`${API_BASE}/api/sites/nearby/?lat=${lat}&lng=${lng}&radius=${radiusMeters}`, { signal: abortController?.signal })
    if (!res.ok) throw new Error('Failed to fetch nearby sites')
    return res.json()
  }
}
