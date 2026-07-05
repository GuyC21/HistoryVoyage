import React, { useState, useEffect, useRef } from 'react'
import { getRoadDistance, formatDistance } from '~/utils/distance'
import './SiteDrawer.css'

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
  userLocation
}) {
  /** @type {string} Unit selection: 'km' (kilometers) or 'mi' (miles). */
  const [distanceUnit, setDistanceUnit] = useState('km')

  /**
   * @type {Object|null} Resolved driving/air distance details.
   * Format: { distance: number, isAir: boolean }.
   */
  const [distanceData, setDistanceData] = useState(null)

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

  if (!isOpen) return null

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
      className={`site-drawer ${isOpen ? 'open' : ''}`}
      style={{ '--marker-color': category?.color }}
    >
      <button className="drawer-close-btn" onClick={onClose} aria-label="Close details">
        &times;
      </button>

      {isLoading ? (
        <div className="drawer-content-loading">
          <div className="skeleton skeleton-image"></div>
          <div className="skeleton skeleton-tag"></div>
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '95%' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
          <div className="drawer-divider"></div>
          <div className="skeleton skeleton-text" style={{ width: '50%' }}></div>
        </div>
      ) : site ? (
        <div className="drawer-scroll-container">
          {site.imageUrl && (
            <div className="drawer-image-container">
              <img 
                src={site.imageUrl} 
                alt={displayName} 
                className="drawer-image"
                loading="lazy"
              />
            </div>
          )}
          <div className="drawer-header">
            <span className="drawer-tag">
              {category.emoji} {category.label}
            </span>
            
            <h2 className="drawer-title">
              {displayName}
              {isFallback && languageMode === 'en' && (
                <span className="fallback-indicator" title="No English translation available, showing local name">
                  Local Name
                </span>
              )}
            </h2>

            {showNativeSubLabel && (
              <div className="drawer-native-name" title="Native local name">
                Native: {site.name}
              </div>
            )}

            <div className="drawer-language-row">
              <div className="drawer-meta">
                <span>📍 {site.country}</span>
                {site.wikidata && <span>🆔 {site.wikidata}</span>}
                
                {distanceData && (
                  <div className="drawer-distance-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', padding: '6px 8px', backgroundColor: 'var(--bg)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                    <span style={{ fontSize: '0.9em', fontWeight: '500' }} title={distanceData.isAir ? "Straight-line air distance" : "Driving distance by roads"}>
                      {distanceData.isAir ? '✈️' : '🚗'} {formatDistance(distanceData.distance, distanceUnit)}
                      {distanceData.isAir && <span style={{ opacity: 0.6, fontSize: '0.85em', marginLeft: '4px', fontWeight: 'normal' }}>(air distance)</span>}
                    </span>
                    <button 
                      onClick={() => setDistanceUnit(prev => prev === 'km' ? 'mi' : 'km')}
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
                <div className="drawer-language-selector">
                  <button
                    className={`drawer-lang-btn ${languageMode === 'en' ? 'active' : ''}`}
                    onClick={() => setLanguageMode('en')}
                  >
                    EN
                  </button>
                  <button
                    className={`drawer-lang-btn ${languageMode === 'local' ? 'active' : ''}`}
                    onClick={() => setLanguageMode('local')}
                  >
                    Local
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="drawer-divider"></div>

          <div className="drawer-body">
            {displayDescription ? (
              <p>{displayDescription}</p>
            ) : (
              <p>
                {languageMode === 'en' 
                  ? 'No English description available for this historical site. You can explore more about it on Wikidata or search for its historical context in the region.'
                  : 'אין תיאור זמין או non è disponibile alcuna descrizione per questo sito storico.'}
              </p>
            )}
          </div>

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
                  className="wikipedia-btn"
                >
                  📚 Explore on Wikipedia
                </a>
              )
            }
            if (site.wikidata) {
              return (
                <a 
                  href={`https://www.wikidata.org/wiki/${site.wikidata}`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="wikipedia-btn"
                >
                  📚 Explore on Wikidata
                </a>
              )
            }
            return null
          })()}
        </div>
      ) : (
        <p>Select a historical site to view details.</p>
      )}
    </div>
  )
}
