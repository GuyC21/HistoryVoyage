/**
 * wikidataApi Service
 * 
 * Abstraction layer to query the public Wikidata entity API.
 */
export const wikidataApi = {
  /**
   * Queries standard entity claims, labels, descriptions, and sitelinks for a Wikidata ID.
   * 
   * @param {string} wikidataId - Target Wikidata identifier (e.g. Q42).
   * @param {AbortController} [abortController] - Optional cancel token reference.
   * @returns {Promise<Object|null>} Resolved entity claims payload, or null if query fails.
   */
  fetchEntity: async (wikidataId, abortController) => {
    if (!wikidataId) return null
    try {
      const res = await fetch(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${wikidataId}&props=labels|descriptions|claims|sitelinks&languages=en&format=json&origin=*`,
        { signal: abortController?.signal }
      )
      if (!res.ok) throw new Error('Wikidata fetch failed')
      const data = await res.json()
      return data.entities?.[wikidataId] || null
    } catch (err) {
      if (err.name !== 'AbortError') console.error('Wikidata fetch failed:', err)
      return null
    }
  },

  /**
   * Evaluates Wikidata claims for image statements (P18 property) and formats a Commons URL.
   * 
   * @param {Object} entity - The resolved Wikidata entity claims.
   * @returns {string|null} Wikimedia Commons Special:FilePath URL, or null if claim is missing.
   */
  getImageUrlFromEntity: (entity) => {
    if (entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value) {
      const imageName = entity.claims.P18[0].mainsnak.datavalue.value
      return `https://commons.wikimedia.org/w/index.php?title=Special:FilePath/${encodeURIComponent(imageName)}&width=600`
    }
    return null
  }
}
