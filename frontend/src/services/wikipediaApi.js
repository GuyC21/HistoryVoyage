import { isValidSearchResult } from '~/utils/wikipediaHelpers'

/**
 * wikipediaApi Service
 * 
 * Provides integration helper methods to fetch descriptions and visual assets from Wikipedia.
 */
export const wikipediaApi = {
  /**
   * Fetches intro extracts and thumbnail images for a known Wikipedia page title.
   * 
   * @param {string} title - The exact article title to retrieve.
   * @param {string} lang - The Wikipedia sub-domain language code (e.g. 'en', 'he', 'it', 'el').
   * @param {AbortController} [abortController] - Optional cancel token reference.
   * @returns {Promise<Object|null>} Resolved page properties: { extract, thumbnail, title }, or null.
   */
  fetchWikiContent: async (title, lang, abortController) => {
    if (!title) return null
    try {
      const res = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&prop=extracts|pageimages&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=600&titles=${encodeURIComponent(title)}&origin=*`,
        { signal: abortController?.signal }
      )
      const json = await res.json()
      const page = json.query?.pages?.[0]
      if (page) {
        return {
          extract: page.extract ? page.extract.split('\n')[0].trim() : null,
          thumbnail: page.thumbnail?.source || null,
          title: page.title
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error(`Wikipedia ${lang} fetch error`, e)
    }
    return null
  },

  /**
   * Performs an article search and filters results based on string intersection heuristics.
   * 
   * @param {string} query - The search query term.
   * @param {string} lang - The Wikipedia sub-domain language code.
   * @param {string} siteName - The name of the target site to cross-validate.
   * @param {string} country - The country of the target site to cross-validate.
   * @param {AbortController} [abortController] - Optional cancel token reference.
   * @returns {Promise<Object|null>} Match result metadata: { extract, thumbnail, title }, or null.
   */
  searchWikiContent: async (query, lang, siteName, country, abortController) => {
    if (!query) return null
    try {
      const res = await fetch(
        `https://${lang}.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&generator=search&gsrsearch=${encodeURIComponent(query)}&gsrlimit=3&prop=extracts|pageimages&exintro=true&explaintext=true&piprop=thumbnail&pithumbsize=600&origin=*`,
        { signal: abortController?.signal }
      )
      const json = await res.json()
      const pages = json.query?.pages || []
      
      for (const page of pages) {
        if (isValidSearchResult(siteName, page.title, country)) {
          return {
            extract: page.extract ? page.extract.split('\n')[0].trim() : null,
            thumbnail: page.thumbnail?.source || null,
            title: page.title
          }
        }
      }
    } catch (e) {
      if (e.name !== 'AbortError') console.error(`Wikipedia ${lang} search error`, e)
    }
    return null
  }
}
