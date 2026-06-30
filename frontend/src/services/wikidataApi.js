export const wikidataApi = {
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

  getImageUrlFromEntity: (entity) => {
    if (entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value) {
      const imageName = entity.claims.P18[0].mainsnak.datavalue.value
      return `https://commons.wikimedia.org/w/index.php?title=Special:FilePath/${encodeURIComponent(imageName)}&width=600`
    }
    return null
  }
}
