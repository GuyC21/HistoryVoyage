import React, { useState } from 'react'
import SearchBar from '~/components/SearchBar'
import styles from './HeaderCard.module.css'

/**
 * HeaderCard Component
 * Displays the main control panel floating in the upper-left corner of the map explorer view.
 * Includes application branding, interface language toggle, live status indicators,
 * tourist quick-jump buttons (Rome, Athens, Jerusalem), category filters, and a collapse button.
 *
 * @param {Object} props
 * @param {string} props.languageMode - Interface language preference ('en' or 'local').
 * @param {Function} props.setLanguageMode - Callback to update the interface language setting.
 * @param {number} props.zoom - Current map viewport zoom level.
 * @param {number} props.minZoomGate - Minimum zoom level required to display markers.
 * @param {number} props.visibleSitesCount - Number of sites currently within the map's visible bounds.
 * @param {string} props.activeFilter - Currently selected category filter ID.
 * @param {Function} props.setActiveFilter - Callback to change the selected category filter.
 * @param {Array<Object>} props.categories - Array of selectable categories (id, label, emoji).
 * @param {Function} props.onQuickJump - Callback to zoom/pan the map coordinates: (lat, lng) => void.
 * @param {Function} props.onLocateUser - Callback to trigger user geolocation and center the map on their location.
 * @param {Function} props.onSelectSite - Callback when a site is selected from the search bar.
 */
export default function HeaderCard({
  languageMode,
  setLanguageMode,
  zoom,
  minZoomGate,
  visibleSitesCount,
  activeFilter,
  setActiveFilter,
  categories,
  onQuickJump,
  onLocateUser,
  onSelectSite,
  onTriggerNearby,
  onClearNearby,
  nearbyCenter,
  activeVoyage,
  isVoyageOnlyView,
  toggleVoyageView,
  isItineraryOpen,
  onToggleItinerary
}) {
  /** @type {boolean} Governs the visibility of the radius input search widget. */
  const [showRadiusForm, setShowRadiusForm] = useState(false)

  /** @type {string} Text binding for the radius query distance field. Defaults to '5000' (meters). */
  const [radiusInput, setRadiusInput] = useState('5000')

  /**
   * @type {boolean} Collapsed status of the header panel.
   * Restores settings from localStorage to preserve UI configuration layout.
   */
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem('history_voyage_header_collapsed')
      return saved ? JSON.parse(saved) : false
    } catch {
      return false
    }
  })

  /**
   * Toggles the collapse state of the control card panel, caching preference in localStorage.
   */
  const toggleCollapse = () => {
    setIsCollapsed(prev => {
      const next = !prev
      try {
        localStorage.setItem('history_voyage_header_collapsed', JSON.stringify(next))
      } catch (e) {
        console.error(e)
      }
      return next
    })
  }

  return (
    <header className={`${styles.floatingHeader} ${isCollapsed ? styles.collapsed : ''} ${isItineraryOpen ? styles.shifted : ''}`}>
      <div className={styles.headerTopRow} style={isCollapsed ? { marginBottom: 0 } : {}}>
        <h1>
          <span>🗺️</span> HistoryVoyage
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Global Language Selector */}
          <div className={styles.languageToggle} title="Select Interface Language">
            <button
              className={`${styles.languageToggleBtn} ${languageMode === 'en' ? styles.active : ''}`}
              onClick={() => setLanguageMode('en')}
            >
              EN
            </button>
            <button
              className={`${styles.languageToggleBtn} ${languageMode === 'local' ? styles.active : ''}`}
              onClick={() => setLanguageMode('local')}
            >
              Local
            </button>
          </div>

          {/* Collapse/Expand Toggle Button */}
          <button
            className={styles.filterBtn}
            onClick={toggleCollapse}
            style={{
              padding: '6px 10px',
              fontSize: '11px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '28px',
              height: '26px'
            }}
            title={isCollapsed ? "Expand panel" : "Collapse panel"}
            aria-label={isCollapsed ? "Expand panel" : "Collapse panel"}
          >
            {isCollapsed ? '▼' : '▲'}
          </button>
        </div>
      </div>

      <div className={`${styles.collapsibleContent} ${isCollapsed ? styles.collapsed : ''}`}>
        <p>Explore ancient civilisations across Israel, Greece, and Italy.</p>

        {/* Active Voyage Context Toggle */}
        {activeVoyage && (
          <div className={styles.voyagePanel}>
            <h3 className={styles.voyageTitle}>
              Active Voyage: {activeVoyage.title}
            </h3>
            <span className={styles.voyageStopsCount}>
              📍 {activeVoyage.stops?.length || 0} stops planned
            </span>
            
            <div className={styles.segmentedControl}>
              <button 
                onClick={() => isVoyageOnlyView && toggleVoyageView()}
                className={`${styles.segmentBtn} ${!isVoyageOnlyView ? styles.active : ''}`}
              >
                🌍 Show All
              </button>
              <button 
                onClick={() => !isVoyageOnlyView && toggleVoyageView()}
                className={`${styles.segmentBtn} ${isVoyageOnlyView ? styles.active : ''}`}
              >
                🎯 Voyage Only
              </button>
            </div>

            {/* View Itinerary Toggle Button */}
            <button 
              onClick={onToggleItinerary}
              style={{
                marginTop: '8px',
                width: '100%',
                background: isItineraryOpen ? 'var(--accent)' : 'var(--bg-translucent)',
                color: isItineraryOpen ? '#ffffff' : 'var(--text-h)',
                border: `1px solid ${isItineraryOpen ? 'var(--accent)' : 'var(--border)'}`,
                padding: '8px 12px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                transition: 'all 0.2s ease'
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6" />
                <line x1="8" y1="12" x2="21" y2="12" />
                <line x1="8" y1="18" x2="21" y2="18" />
                <line x1="3" y1="6" x2="3.01" y2="6" />
                <line x1="3" y1="12" x2="3.01" y2="12" />
                <line x1="3" y1="18" x2="3.01" y2="18" />
              </svg>
              {isItineraryOpen ? 'Hide Itinerary' : 'View Itinerary Stops'}
            </button>
          </div>
        )}
        
        <SearchBar onSelectSite={onSelectSite} />
        
        <div className={styles.statsBar}>
          <span className={styles.statBadge}>
            {zoom < minZoomGate 
              ? 'Zoom in to view' 
              : `Visible: ${visibleSitesCount} sites`}
          </span>
          {activeFilter !== 'all' && (
            <span className={styles.statBadge} style={{ background: 'var(--border)', color: 'var(--text-h)' }}>
              Filter: {activeFilter}
            </span>
          )}
        </div>

        {/* Quick Jump Buttons for Tourists */}
        <div className={styles.filtersContainer} style={{ marginTop: '10px', gap: '4px' }}>
          <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-h)', alignSelf: 'center', marginRight: '4px' }}>Fly to:</span>
          <button className={styles.filterBtn} onClick={() => onQuickJump(41.8902, 12.4922)}>🏟️ Rome</button>
          <button className={styles.filterBtn} onClick={() => onQuickJump(37.9715, 23.7263)}>🏛️ Athens</button>
          <button className={styles.filterBtn} onClick={() => onQuickJump(31.7767, 35.2227)}>🏰 Jerusalem</button>
          <button className={styles.filterBtn} onClick={onLocateUser} title="Jump to my location">🎯 My Location</button>
          <button 
            className={`${styles.filterBtn} ${showRadiusForm || nearbyCenter ? styles.active : ''}`} 
            onClick={() => setShowRadiusForm(prev => !prev)}
            title="Search historical sites in a radius around the current map center"
          >
            🔍 Find Nearby
          </button>
        </div>

        {/* Inline Radius Search Selector */}
        {showRadiusForm && (
          <div className={styles.filtersContainer} style={{ marginTop: '8px', padding: '6px 8px', background: 'var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-h)' }}>Radius (m):</span>
            <input
              type="number"
              value={radiusInput}
              onChange={(e) => setRadiusInput(e.target.value)}
              min="1"
              style={{
                width: '80px',
                background: 'var(--input-bg)',
                border: '1px solid var(--input-border)',
                borderRadius: '4px',
                padding: '2px 6px',
                color: 'var(--text-h)',
                fontSize: '12px'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const r = parseFloat(radiusInput)
                  if (!isNaN(r) && r > 0) {
                    onTriggerNearby(r)
                  }
                }
              }}
            />
            <button 
              className={`${styles.filterBtn} ${styles.active}`} 
              style={{ padding: '2px 8px' }}
              onClick={() => {
                const r = parseFloat(radiusInput)
                if (!isNaN(r) && r > 0) {
                  onTriggerNearby(r)
                }
              }}
            >
              Go
            </button>
            <button 
              className={styles.filterBtn} 
              style={{ padding: '2px 8px' }}
              onClick={() => {
                setShowRadiusForm(false)
                onClearNearby()
              }}
            >
              ❌ Clear
            </button>
          </div>
        )}

        {/* Filters */}
        <div className={styles.filtersContainer}>
          {categories.map((cat) => (
            <button
              key={cat.id}
              className={`${styles.filterBtn} ${activeFilter === cat.id ? styles.active : ''}`}
              onClick={() => setActiveFilter(cat.id)}
            >
              <span>{cat.emoji}</span> {cat.label}
            </button>
          ))}
        </div>
      </div>
    </header>
  )
}

