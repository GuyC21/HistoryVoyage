import React, { useState, useEffect, useRef } from 'react'
import { getRoadDistance, formatDistance } from '~/utils/distance'
import { useVoyage } from '~/context/VoyageContext'
import { useAuth } from '~/context/AuthContext'
import { supabase } from '~/services/supabase'
import { backendApi } from '~/services/api'
import styles from './SiteDrawer.module.css'

/**
 * SiteDrawer Component
 * Renders the sliding details panel for the currently selected historical site.
 * Displays site category badges, localized names, descriptions, Wikimedia cover images,
 * and external explore links. Includes an internal scroll wrapper to prevent viewport overflow.
 *
 * @param {Object} props
 * @param {Object|null} props.site - Selected site properties.
 * @param {boolean} props.isOpen - Controls drawer visibility state.
 * @param {Function} props.onClose - Callback triggered when closing the drawer.
 * @param {boolean} props.isLoading - Controls loader skeleton animations.
 * @param {string} props.languageMode - Interface language preference ('en' or 'local').
 * @param {Function} props.setLanguageMode - Callback to update the language preference.
 * @param {Array|Object|null} props.userLocation - User's current location [lat, lng].
 */
export default function SiteDrawer({ 
  site, 
  isOpen, 
  onClose, 
  isLoading, 
  languageMode, 
  setLanguageMode,
  userLocation,
  onToast,
  onRefreshDetails
}) {
  const { user, djangoUser } = useAuth()

  // State for Wikidata inline editor
  const [isEditingWikidata, setIsEditingWikidata] = useState(false)
  const [editWikidataVal, setEditWikidataVal] = useState('')
  const [updatingWikidata, setUpdatingWikidata] = useState(false)
  // Mobile drawer state
  const [isExpanded, setIsExpanded] = useState(false)
  const touchStartY = useRef(null)
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Sync edit input value when selected site changes
  useEffect(() => {
    if (site) {
      setEditWikidataVal(site.wikidata || '')
    }
    setIsEditingWikidata(false)
  }, [site])

  const handleSaveWikidata = async () => {
    if (!site) return

    let cleanVal = editWikidataVal.trim()
    if (cleanVal) {
      if (!cleanVal.toUpperCase().startsWith('Q') || !/^\d+$/.test(cleanVal.slice(1))) {
        if (onToast) {
          onToast('Invalid Wikidata ID. Must start with Q followed by numbers.', 'error')
        } else {
          alert('Invalid Wikidata ID. Must start with Q followed by numbers.')
        }
        return
      }
      cleanVal = cleanVal.toUpperCase()
    } else {
      cleanVal = null
    }

    setUpdatingWikidata(true)
    try {
      await backendApi.updateSiteWikidata(site.id, cleanVal)
      if (onToast) {
        onToast('Wikidata ID updated successfully!', 'success')
      }
      setIsEditingWikidata(false)

      if (onRefreshDetails) {
        onRefreshDetails({
          ...site,
          wikidata: cleanVal,
          englishName: null,
          englishDescription: null
        })
      }
    } catch (err) {
      console.error(err)
      if (onToast) {
        onToast(err.message || 'Failed to update Wikidata ID', 'error')
      }
    } finally {
      setUpdatingWikidata(false)
    }
  }

  /** @type {string} Unit selection: 'km' (kilometers) or 'mi' (miles). */
  const [distanceUnit, setDistanceUnit] = useState(() => {
    return localStorage.getItem('app-distance-unit') || 'km'
  })

  // Sync distanceUnit state when user metadata is loaded
  useEffect(() => {
    if (user?.user_metadata?.distance_unit) {
      setDistanceUnit(user.user_metadata.distance_unit)
    }
  }, [user])

  const handleDistanceUnitChange = async (newUnit) => {
    setDistanceUnit(newUnit)
    localStorage.setItem('app-distance-unit', newUnit)
    if (user) {
      try {
        await supabase.auth.updateUser({
          data: {
            distance_unit: newUnit
          }
        })
      } catch (err) {
        console.error('Failed to sync distance unit to Supabase:', err)
      }
    }
  }

  /**
   * @type {Object|null} Resolved driving/air distance details.
   * Format: { distance: number, isAir: boolean }.
   */
  const [distanceData, setDistanceData] = useState(null)

  const { activeVoyage, addSiteToVoyage, removeSiteFromVoyage } = useVoyage()
  const [isAdding, setIsAdding] = useState(false)
  const [isRemoving, setIsRemoving] = useState(false)

  /** @type {React.MutableRefObject<AbortController|null>} Ref tracking OSRM driving distance fetch operations. */
  const distanceAbortRef = useRef(null)

  useEffect(() => {
    if (distanceAbortRef.current) {
      distanceAbortRef.current.abort()
    }
    
    if (!isOpen) {
      setDistanceData(null)
      return
    }

    if (!site || !site.coordinates || !userLocation) {
      setDistanceData(null)
      return
    }

    const fetchDistance = async () => {
      const controller = new AbortController()
      distanceAbortRef.current = controller

      try {
        const [siteLat, siteLng] = site.coordinates
        // userLocation might be an array or an object from Leaflet
        const userLat = Array.isArray(userLocation) ? userLocation[0] : userLocation.lat
        const userLng = Array.isArray(userLocation) ? userLocation[1] : userLocation.lng
        
        const data = await getRoadDistance(userLat, userLng, siteLat, siteLng, controller.signal)
        setDistanceData(data)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Distance calculation failed:', err)
          setDistanceData(null)
        }
      }
    }

    fetchDistance()

    return () => {
      if (distanceAbortRef.current) {
        distanceAbortRef.current.abort()
      }
    }
  }, [site, userLocation, isOpen])



  // Helper to get category emojis and colors
  const getCategoryMeta = (type) => {
    switch (type) {
      case 'castle':
        return { label: 'Castle', emoji: '🏰', color: 'var(--color-castle)' }
      case 'ruins':
        return { label: 'Ruins', emoji: '🏚️', color: 'var(--color-ruins)' }
      case 'holy_site':
        return { label: 'Holy Site', emoji: '⛪', color: 'var(--color-holy)' }
      case 'monument':
        return { label: 'Monument', emoji: '🗽', color: 'var(--color-monument)' }
      case 'archaeological':
        return { label: 'Archaeological Site', emoji: '🏺', color: 'var(--color-archaeological)' }
      default:
        return { label: 'Historical Site', emoji: '🗺️', color: 'var(--color-other)' }
    }
  }

  const category = site ? getCategoryMeta(site.site_type) : null

  // Reset expansion state when opening a new site or when the drawer opens
  useEffect(() => {
    if (isOpen) {
      setIsExpanded(false)
    }
  }, [isOpen, site])

  const handleTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e) => {
    if (touchStartY.current === null) return
    const touchEndY = e.changedTouches[0].clientY
    const deltaY = touchEndY - touchStartY.current
    
    // Swipe down to collapse
    if (deltaY > 50 && isExpanded) {
      setIsExpanded(false)
    }
    // Swipe up to expand
    else if (deltaY < -50 && !isExpanded) {
      setIsExpanded(true)
    }
    touchStartY.current = null
  }

  // Determine title and description to show based on languageMode
  let displayName = ''
  let displayDescription = ''
  let showNativeSubLabel = false
  let isFallback = false

  if (site) {
    if (languageMode === 'en') {
      displayName = site.englishName || site.name
      displayDescription = site.englishDescription || site.description
      
      // If we are showing English but it fell back to the native name
      if (!site.englishName) {
        isFallback = true
      }
      
      // If we are showing the translated name, and it is different from native name, show native sub-label
      if (site.englishName && site.englishName.toLowerCase() !== site.name.toLowerCase()) {
        showNativeSubLabel = true
      }
    } else {
      displayName = site.name
      displayDescription = site.description
    }
  }

  return (
    <div 
      className={`${styles.siteDrawer} ${isOpen ? styles.open : ''} ${isExpanded ? styles.expanded : styles.collapsed} ${site?.imageUrl ? styles.hasImage : styles.noImage}`}
      style={{ '--marker-color': category?.color }}
    >
      <div 
        className={styles.dragHandleContainer} 
        onTouchStart={handleTouchStart} 
        onTouchEnd={handleTouchEnd}
      >
        <div className={styles.dragHandle}></div>
      </div>

      <button className={styles.drawerCloseBtn} onClick={onClose} aria-label="Close details">
        &times;
      </button>

      {isLoading ? (
        <div className={styles.drawerContentLoading}>
          <div className={`${styles.skeleton} ${styles.skeletonImage}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonTag}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonTitle}`}></div>
          <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '90%' }}></div>
          <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '95%' }}></div>
          <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '80%' }}></div>
          <div className={styles.drawerDivider}></div>
          <div className={`${styles.skeleton} ${styles.skeletonText}`} style={{ width: '50%' }}></div>
        </div>
      ) : site ? (
        <div className={styles.drawerScrollContainer}>
          {site.imageUrl && (
            <div className={styles.drawerImageContainer}>
              <img 
                src={site.imageUrl} 
                alt={displayName} 
                className={styles.drawerImage}
                loading="lazy"
              />
            </div>
          )}
          <span className={styles.drawerTag}>
            {category.emoji} {category.label}
          </span>
          <div className={styles.drawerHeader}>
            <h2 className={styles.drawerTitle}>
              {displayName}
              {isFallback && languageMode === 'en' && (
                <span className={styles.fallbackIndicator} title="No English translation available, showing local name">
                  Local Name
                </span>
              )}
            </h2>

            {showNativeSubLabel && (
              <div className={styles.drawerNativeName} title="Native local name">
                Native: {site.name}
              </div>
            )}

            <h3 className={styles.sectionTitle}>Location</h3>
            <div className={styles.drawerLanguageRow}>
              <div className={styles.drawerMeta}>
                <span className={`${styles.addressText} ${(!isMobile || isExpanded) ? styles.expanded : ''}`}>
                  📍 {site.address || site.country}
                </span>
                {isEditingWikidata ? (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', margin: '4px 0' }}>
                    <span style={{ fontSize: '12px' }}>🆔</span>
                    <input 
                      type="text" 
                      value={editWikidataVal}
                      onChange={(e) => setEditWikidataVal(e.target.value)}
                      placeholder="e.g. Q186326"
                      disabled={updatingWikidata}
                      style={{
                        padding: '2px 6px',
                        fontSize: '12px',
                        borderRadius: '4px',
                        border: '1px solid var(--input-border)',
                        background: 'var(--input-bg)',
                        color: 'var(--text-h)',
                        width: '90px'
                      }}
                    />
                    <button 
                      onClick={handleSaveWikidata}
                      disabled={updatingWikidata}
                      style={{
                        padding: '2px 6px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        background: 'var(--color-castle)',
                        color: 'white',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      {updatingWikidata ? '...' : 'Save'}
                    </button>
                    <button 
                      onClick={() => setIsEditingWikidata(false)}
                      disabled={updatingWikidata}
                      style={{
                        padding: '2px 6px',
                        fontSize: '11px',
                        borderRadius: '4px',
                        background: 'var(--border)',
                        color: 'var(--text-h)',
                        border: 'none',
                        cursor: 'pointer'
                      }}
                    >
                      X
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    {site.wikidata ? (
                      <span>🆔 {site.wikidata}</span>
                    ) : (
                      <span style={{ opacity: 0.6, fontSize: '0.85em' }}>No Wikidata ID</span>
                    )}
                    {djangoUser?.is_staff && (
                      <button
                        onClick={() => {
                          setEditWikidataVal(site.wikidata || '')
                          setIsEditingWikidata(true)
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '2px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          opacity: 0.7,
                          color: 'var(--text-h)',
                          fontSize: '12px'
                        }}
                        title="Edit Wikidata ID"
                      >
                        ✏️
                      </button>
                    )}
                  </div>
                )}
                
                {distanceData && (
                  <div className={styles.drawerDistanceWrapper} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', padding: '6px 8px', backgroundColor: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.9em', fontWeight: '500' }} title={distanceData.isAir ? "Straight-line air distance" : "Driving distance by roads"}>
                      {distanceData.isAir ? '✈️' : '🚗'} {formatDistance(distanceData.distance, distanceUnit)}
                      {distanceData.isAir && <span style={{ opacity: 0.6, fontSize: '0.85em', marginLeft: '4px', fontWeight: 'normal' }}>(air distance)</span>}
                    </span>
                    <button 
                      onClick={() => handleDistanceUnitChange(distanceUnit === 'km' ? 'mi' : 'km')}
                      style={{ fontSize: '11px', padding: '2px 6px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--bg-translucent)', cursor: 'pointer', color: 'var(--text-h)', marginLeft: 'auto' }}
                      title={`Switch to ${distanceUnit === 'km' ? 'miles' : 'kilometers'}`}
                    >
                      {distanceUnit === 'km' ? 'mi' : 'km'}
                    </button>
                  </div>
                )}
              </div>

              {/* Inline Language Selector */}
              {site.wikidata && (
                <div className={styles.drawerLanguageSelector}>
                  <button
                    className={`${styles.drawerLangBtn} ${languageMode === 'en' ? styles.active : ''}`}
                    onClick={() => setLanguageMode('en')}
                  >
                    EN
                  </button>
                  <button
                    className={`${styles.drawerLangBtn} ${languageMode === 'local' ? styles.active : ''}`}
                    onClick={() => setLanguageMode('local')}
                  >
                    Local
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className={styles.drawerDivider}></div>

          <div className={styles.actionButtonsRow}>
            {(() => {
              const wikiUrl = languageMode === 'en' 
                ? (site.wikiUrlEn || site.wikiUrlLocal) 
                : (site.wikiUrlLocal || site.wikiUrlEn)
              
              if (wikiUrl) {
                return (
                  <a 
                    href={wikiUrl} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={styles.wikipediaBtn}
                  >
                    📚 Wikipedia
                  </a>
                )
              }
              if (site.wikidata) {
                return (
                  <a 
                    href={`https://www.wikidata.org/wiki/${site.wikidata}`} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className={styles.wikipediaBtn}
                  >
                    📚 Wikipedia
                  </a>
                )
              }
              return null
            })()}

            {/* Voyage Actions */}
            {(() => {
              if (!activeVoyage) {
                return (
                  <div style={{ marginTop: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                    Select a Voyage from your Dashboard to add sites.
                  </div>
                )
              }

              const isAdded = activeVoyage.stops?.some(stop => String(stop.siteId) === String(site.id))

              if (isAdded) {
                return (
                  <button
                    onClick={async () => {
                      try {
                        setIsRemoving(true)
                        await removeSiteFromVoyage(activeVoyage.id, site.id)
                        onToast?.(`Removed ${displayName} from ${activeVoyage.title}`)
                      } catch (err) {
                        console.error('Failed to remove site:', err)
                        onToast?.('Failed to remove site from voyage')
                      } finally {
                        setIsRemoving(false)
                      }
                    }}
                    disabled={isRemoving}
                    className={`${styles.voyageActionBtn} ${styles.voyageRemoveBtn}`}
                  >
                    {isRemoving ? 'Removing...' : `❌ Remove`}
                  </button>
                )
              }

              return (
                <button
                  onClick={async () => {
                    try {
                      setIsAdding(true)
                      await addSiteToVoyage(activeVoyage.id, site.id)
                      onToast?.(`Added ${displayName} to ${activeVoyage.title}`)
                    } catch (err) {
                      console.error('Failed to add site:', err)
                      onToast?.('Failed to add site to voyage')
                    } finally {
                      setIsAdding(false)
                    }
                  }}
                  disabled={isAdding}
                  className={`${styles.voyageActionBtn} ${styles.voyageAddBtn}`}
                >
                  {isAdding ? 'Adding...' : `➕ Add`}
                </button>
              )
            })()}
          </div>

          <h3 className={styles.sectionTitle}>Overview</h3>
          <div className={styles.drawerBody}>
            {(() => {
              const activeDescription = displayDescription || (
                languageMode === 'en' 
                  ? 'No English description available for this historical site. You can explore more about it on Wikidata or search for its historical context in the region.'
                  : 'אין תיאור זמין או non è disponibile alcuna descrizione per questo sito storico.'
              )
              const limit = site.imageUrl ? 60 : 140
              const isDescriptionLong = activeDescription.length > limit

              return <p>{activeDescription}</p>
            })()}
          </div>
          </div>
        ) : (
        <p>Select a historical site to view details.</p>
      )}
    </div>
  )
}
