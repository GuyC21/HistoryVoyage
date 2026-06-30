const API_BASE = window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000'
  : 'http://localhost:8000'

export const backendApi = {
  fetchSitesInBounds: async (boundsStr, abortController) => {
    const res = await fetch(`${API_BASE}/api/sites/?in_bbox=${boundsStr}`, { signal: abortController?.signal })
    if (!res.ok) throw new Error('Failed to fetch sites')
    return res.json()
  },

  fetchSiteDetails: async (siteId, abortController) => {
    const res = await fetch(`${API_BASE}/api/sites/${siteId}/`, { signal: abortController?.signal })
    if (!res.ok) throw new Error('Backend retrieve failed')
    return res.json()
  }
}
