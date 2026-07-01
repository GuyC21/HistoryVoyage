import { useState, useRef } from 'react'
import { backendApi } from '~/services/api'
import { wikidataApi } from '~/services/wikidataApi'
import { wikipediaApi } from '~/services/wikipediaApi'
import { getWikiLangCode } from '~/utils/wikipediaHelpers'
import L from 'leaflet'

/**
 * useSiteDetails Custom Hook
 * 
 * Manages the state and asynchronous resolution of detailed historical site metadata.
 * Implements a multi-tiered fallback architecture to load localized text and assets:
 * 1. Queries backend Django API for missing English properties and geometry outlines.
 * 2. Fetches Wikidata entity fields (using Wikidata ID) to retrieve Commons images and site links.
 * 3. Crawls Wikipedia API page abstracts for multilingual intro extracts.
 * 4. Falls back to search heuristic matching if direct sitelinks are unavailable.
 * 
 * @param {L.Map|null} mapInstance - Leaflet map reference instance.
 * @param {Function} setActivePolygon - Sets active boundary coordinates to overlay on map.
 * @returns {Object} Site details state attributes and drawer controls.
 */
export const useSiteDetails = (mapInstance, setActivePolygon) => {
  /** @type {Object|null} Properties of the currently focused historical site. */
  const [selectedSite, setSelectedSite] = useState(null)

  /** @type {boolean} Visual open status for details sliding drawer. */
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)

  /** @type {boolean} Loader skeleton visibility status. */
  const [drawerLoading, setDrawerLoading] = useState(false)

  /** @type {React.MutableRefObject<AbortController|null>} Ref tracking active details resolution. */
  const drawerAbortRef = useRef(null)

  /**
   * Selection handler triggered when clicking a site marker or search recommendation.
   * Runs the multi-tiered API resolution workflow.
   * 
   * @param {Object} siteDetails - Raw coordinate and identity parameters of target site.
   */
  const handleSiteClick = async (siteDetails) => {
    setActivePolygon(null)

    if (drawerAbortRef.current) {
      drawerAbortRef.current.abort()
    }

    const hasEnglishInDetails = !!siteDetails.englishName
    const needsBackendFetch = !hasEnglishInDetails || (siteDetails.osmType === 'relation' || siteDetails.osmType === 'way')

    setSelectedSite({
      ...siteDetails,
      englishName: siteDetails.englishName || null,
      englishDescription: siteDetails.englishDescription || null,
      hasTranslationAttempted: false
    })
    setIsDrawerOpen(true)

    // Sync to URL
    const url = new URL(window.location)
    url.searchParams.set('site', siteDetails.id)
    window.history.pushState({}, '', url)

    if (hasEnglishInDetails && !needsBackendFetch && !siteDetails.wikidata) {
      return
    }

    setDrawerLoading(true)
    const controller = new AbortController()
    drawerAbortRef.current = controller

    try {
      let backendEnglishName = siteDetails.englishName || null
      let backendEnglishDescription = siteDetails.englishDescription || null
      let backendLocalDescription = siteDetails.description || null
      let wikidataImageUrl = null
      let wikiUrlEn = null
      let wikiUrlLocal = null

      const promises = []

      // 1. Backend Fetch
      if (needsBackendFetch) {
        promises.push(
          backendApi.fetchSiteDetails(siteDetails.id, controller)
            .then((data) => {
              const props = data.properties || {}
              backendEnglishName = props.englishName || null
              if (props.englishDescription) backendEnglishDescription = props.englishDescription
              if (props.description) backendLocalDescription = props.description
              
              if (props.boundary) {
                setSelectedSite((prev) => {
                  if (prev && prev.id === siteDetails.id) {
                    setActivePolygon(props.boundary)
                  }
                  return prev
                })
                if (mapInstance) {
                  try {
                    const polygonBounds = L.polygon(props.boundary).getBounds()
                    mapInstance.fitBounds(polygonBounds, {
                      padding: [50, 50],
                      maxZoom: 19,
                      animate: true,
                      duration: 1.2
                    })
                  } catch (err) {
                    console.error('Error fitting bounds:', err)
                  }
                }
              }
            })
            .catch(err => {
              if (err.name !== 'AbortError') console.error('Backend retrieve failed:', err)
            })
        )
      }

      let wikidataPromise = Promise.resolve()

      // 2. Wikidata & Wikipedia Direct Fetch (Tier 1)
      if (siteDetails.wikidata) {
        wikidataPromise = wikidataApi.fetchEntity(siteDetails.wikidata, controller)
          .then(async (entity) => {
            if (!entity) return
            
            wikidataImageUrl = wikidataApi.getImageUrlFromEntity(entity)

            if (!backendEnglishName) {
              backendEnglishName = entity?.labels?.en?.value || null
            }
            if (!backendEnglishDescription && entity?.descriptions?.en?.value) {
              backendEnglishDescription = entity.descriptions.en.value
            }

            if (entity?.sitelinks) {
              const langCode = getWikiLangCode(siteDetails.country)
              const enTitle = entity.sitelinks.enwiki?.title
              const localTitle = entity.sitelinks[`${langCode}wiki`]?.title

              if (enTitle) wikiUrlEn = `https://en.wikipedia.org/wiki/${encodeURIComponent(enTitle)}`
              if (localTitle) wikiUrlLocal = `https://${langCode}.wikipedia.org/wiki/${encodeURIComponent(localTitle)}`

              let enWikiData = null
              if (enTitle) {
                enWikiData = await wikipediaApi.fetchWikiContent(enTitle, 'en', controller)
                if (enWikiData) {
                  if (!wikidataImageUrl && enWikiData.thumbnail) wikidataImageUrl = enWikiData.thumbnail
                  if (enWikiData.extract) backendEnglishDescription = enWikiData.extract
                }
              }

              let localWikiData = null
              if (localTitle) {
                localWikiData = await wikipediaApi.fetchWikiContent(localTitle, langCode, controller)
                if (localWikiData) {
                  if (!wikidataImageUrl && localWikiData.thumbnail) wikidataImageUrl = localWikiData.thumbnail
                  if (localWikiData.extract) backendLocalDescription = localWikiData.extract
                }
              }
            }
          })
      }

      promises.push(wikidataPromise)

      await Promise.all(promises)

      // 3. Wikipedia Search Fallback (Tier 2)
      if (!wikidataImageUrl || (!backendEnglishDescription && !backendLocalDescription)) {
        const langCode = getWikiLangCode(siteDetails.country)
        const searchQuery = `${siteDetails.englishName || siteDetails.name}, ${siteDetails.country || ''}`.trim().replace(/,$/, '')
        const siteNameForValidation = siteDetails.englishName || siteDetails.name
        
        if (!wikidataImageUrl || !backendEnglishDescription) {
          const enSearch = await wikipediaApi.searchWikiContent(searchQuery, 'en', siteNameForValidation, siteDetails.country, controller)
          if (enSearch) {
             if (!wikidataImageUrl && enSearch.thumbnail) wikidataImageUrl = enSearch.thumbnail
             if (!backendEnglishDescription && enSearch.extract) backendEnglishDescription = enSearch.extract
             if (!wikiUrlEn && enSearch.title) wikiUrlEn = `https://en.wikipedia.org/wiki/${encodeURIComponent(enSearch.title)}`
          }
        }
        
        if (!backendLocalDescription) {
           const localSearch = await wikipediaApi.searchWikiContent(searchQuery, langCode, siteNameForValidation, siteDetails.country, controller)
           if (localSearch) {
             if (!wikidataImageUrl && localSearch.thumbnail) wikidataImageUrl = localSearch.thumbnail
             if (localSearch.extract) backendLocalDescription = localSearch.extract
             if (!wikiUrlLocal && localSearch.title) wikiUrlLocal = `https://${langCode}.wikipedia.org/wiki/${encodeURIComponent(localSearch.title)}`
           }
        }
      }

      setSelectedSite((prev) => {
        if (prev && prev.id === siteDetails.id) {
          return {
            ...prev,
            englishName: backendEnglishName,
            englishDescription: backendEnglishDescription,
            description: backendLocalDescription,
            imageUrl: wikidataImageUrl || prev.imageUrl,
            wikiUrlEn,
            wikiUrlLocal,
            hasTranslationAttempted: true
          }
        }
        return prev
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to resolve translations/assets:', err)
        setSelectedSite((prev) => {
          if (prev && prev.id === siteDetails.id) {
            return { ...prev, hasTranslationAttempted: true }
          }
          return prev
        })
      }
    } finally {
      setSelectedSite((prev) => {
        if (prev && prev.id === siteDetails.id) {
          setDrawerLoading(false)
        }
        return prev
      })
    }
  }

  const closeDrawer = () => {
    setIsDrawerOpen(false)
    setSelectedSite(null)
    setActivePolygon(null)
    const url = new URL(window.location)
    url.searchParams.delete('site')
    window.history.pushState({}, '', url)
  }

  return {
    selectedSite,
    isDrawerOpen,
    drawerLoading,
    handleSiteClick,
    closeDrawer
  }
}
