import { supabase } from './supabase'

const API_BASE = window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000'
  : 'http://localhost:8000'

/**
 * Custom fetch wrapper that automatically retrieves the active Supabase JWT
 * and attaches it in the 'Authorization: Bearer <token>' header for
 * all requests directed to the Django backend.
 */
async function apiFetch(url, options = {}) {
  let token = null
  try {
    const { data: { session } } = await supabase.auth.getSession()
    token = session?.access_token
  } catch (err) {
    console.error('Error retrieving Supabase session token:', err)
  }

  const headers = {
    ...options.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, {
    ...options,
    headers,
  })
}

/**
 * Handles HTTP responses. If the response is not ok (e.g. 400, 403, 500),
 * it extracts the exact error detail from the response body and throws a descriptive Error.
 */
async function handleResponse(res, defaultErrorMsg) {
  if (!res.ok) {
    let detail = ''
    try {
      const data = await res.json()
      detail = data.detail || JSON.stringify(data)
    } catch {
      detail = `Status: ${res.status}`
    }
    throw new Error(`${defaultErrorMsg} (${detail})`)
  }
  return res.json()
}

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
    const res = await apiFetch(url, { signal: abortController?.signal })
    return handleResponse(res, 'Failed to fetch sites')
  },

  /**
   * Retrieves full details for a single site, including boundaries if present.
   * 
   * @param {string|number} siteId - Target database record primary key ID.
   * @param {AbortController} [abortController] - Optional cancel token reference.
   * @returns {Promise<Object>} GeoJSON detailed feature object.
   */
  fetchSiteDetails: async (siteId, abortController) => {
    const res = await apiFetch(`${API_BASE}/api/sites/${siteId}/`, { signal: abortController?.signal })
    return handleResponse(res, 'Backend retrieve failed')
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
    const res = await apiFetch(`${API_BASE}/api/sites/nearby/?lat=${lat}&lng=${lng}&radius=${radiusMeters}`, { signal: abortController?.signal })
    return handleResponse(res, 'Failed to fetch nearby sites')
  },

  /**
   * Fetches the profile data of the currently logged-in user, which confirms
   * correct JWT parsing and syncing to Django's accounts_user table.
   * 
   * @returns {Promise<Object>} Authenticated user profile representation.
   */
  fetchCurrentUser: async () => {
    const res = await apiFetch(`${API_BASE}/api/accounts/me/`)
    return handleResponse(res, 'Failed to fetch current user profile')
  }
}
