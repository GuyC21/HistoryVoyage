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

  fetchCurrentUser: async () => {
    const res = await apiFetch(`${API_BASE}/api/accounts/me/`)
    return handleResponse(res, 'Failed to fetch current user profile')
  },

  /**
   * Fetches all voyages belonging to the authenticated user.
   */
  fetchVoyages: async () => {
    const res = await apiFetch(`${API_BASE}/api/voyages/`)
    return handleResponse(res, 'Failed to fetch voyages')
  },

  /**
   * Creates a new voyage for the authenticated user.
   * 
   * @param {string} title - The title of the new voyage.
   */
  createVoyage: async (title) => {
    const res = await apiFetch(`${API_BASE}/api/voyages/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title })
    })
    return handleResponse(res, 'Failed to create voyage')
  },

  /**
   * Deletes a voyage.
   * 
   * @param {string|number} voyageId - The ID of the voyage to delete.
   */
  deleteVoyage: async (voyageId) => {
    const res = await apiFetch(`${API_BASE}/api/voyages/${voyageId}/`, {
      method: 'DELETE'
    })
    if (!res.ok) {
      throw new Error('Failed to delete voyage')
    }
    // DELETE doesn't return JSON
    return true
  },

  /**
   * Adds a historical site stop to the specified voyage.
   * 
   * @param {string|number} voyageId - The ID of the voyage.
   * @param {string|number} siteId - The ID of the historical site.
   */
  addSiteToVoyage: async (voyageId, siteId) => {
    const res = await apiFetch(`${API_BASE}/api/voyages/${voyageId}/add-site/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId })
    })
    return handleResponse(res, 'Failed to add site to voyage')
  },

  /**
   * Reorders the stops in a voyage.
   * 
   * @param {string|number} voyageId - The ID of the voyage.
   * @param {Array<number>} stopIds - The ordered array of VoyageStop IDs.
   */
  reorderVoyageStops: async (voyageId, stopIds) => {
    const res = await apiFetch(`${API_BASE}/api/voyages/${voyageId}/reorder-stops/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stopIds })
    })
    return handleResponse(res, 'Failed to reorder stops')
  },

  /**
   * Removes a historical site stop from the specified voyage.
   */
  removeSiteFromVoyage: async (voyageId, siteId) => {
    const res = await apiFetch(`${API_BASE}/api/voyages/${voyageId}/remove-site/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ siteId })
    })
    return handleResponse(res, 'Failed to remove site from voyage')
  }
}
