/**
 * Helper to determine local Wikipedia language code based on country
 */
export const getWikiLangCode = (country) => {
  if (!country) return 'en'
  const c = country.toLowerCase()
  if (c.includes('greece') || c.includes('gr')) return 'el'
  if (c.includes('italy') || c.includes('it')) return 'it'
  if (c.includes('israel') || c.includes('il')) return 'he'
  return 'en'
}

/**
 * Validates if a Wikipedia search result is likely the site we are looking for
 * Uses a heuristic word intersection approach to reject highly generic or wrong matches.
 */
export const isValidSearchResult = (siteName, articleTitle, country) => {
  if (!siteName || !articleTitle) return false
  
  // Normalize by making lowercase, removing accents and non-alphanumeric characters
  const normalize = (str) => str.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^\p{L}\p{N}\s]/gu, "")
  
  const name1 = normalize(siteName)
  const name2 = normalize(articleTitle)
  const countryName = country ? normalize(country) : ''

  // Direct substring match is a strong signal
  if (name1.includes(name2) || name2.includes(name1)) return true

  // Generic words to ignore when comparing overlap
  const stopWords = new Set(['the', 'of', 'in', 'and', 'at', 'on', 'for', 'a', 'an', 'fort', 'castle', 'temple', 'ruins', 'ancient', 'site', 'church', 'monastery', 'national', 'park', countryName])
  
  const words1 = name1.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))
  const words2 = name2.split(/\s+/).filter(w => w.length > 2 && !stopWords.has(w))

  // If there are meaningful words, check if there's any intersection
  if (words1.length > 0) {
    return words1.some(w => words2.includes(w))
  }
  
  return false
}
