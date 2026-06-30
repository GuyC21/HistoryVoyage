import React, { useState } from 'react'
import SearchBar from './SearchBar'

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
  nearbyCenter
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
    <header className={`floating-header ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="header-top-row" style={isCollapsed ? { marginBottom: 0 } : {}}>
        <h1>
          <span>🗺️</span> HistoryVoyage
        </h1>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Global Language Selector */}
          <div className="language-toggle" title="Select Interface Language">
            <button
              className={`language-toggle-btn ${languageMode === 'en' ? 'active' : ''}`}
              onClick={() => setLanguageMode('en')}
            >
              EN
            </button>
            <button
              className={`language-toggle-btn ${languageMode === 'local' ? 'active' : ''}`}
              onClick={() => setLanguageMode('local')}
            >
              Local
            </button>
          </div>

          {/* Collapse/Expand Toggle Button */}
          <button
            className="filter-btn"
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

      {!isCollapsed && (
        <>
          <p>Explore ancient civilisations across Israel, Greece, and Italy.</p>
          
          <SearchBar onSelectSite={onSelectSite} />
          
          <div className="stats-bar">
            <span className="stat-badge">
              {zoom < minZoomGate 
                ? 'Zoom in to view' 
                : `Visible: ${visibleSitesCount} sites`}
            </span>
            {activeFilter !== 'all' && (
              <span className="stat-badge" style={{ background: 'var(--border)', color: 'var(--text-h)' }}>
                Filter: {activeFilter}
              </span>
            )}
          </div>

          {/* Quick Jump Buttons for Tourists */}
          <div className="filters-container" style={{ marginTop: '10px', gap: '4px' }}>
            <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-h)', alignSelf: 'center', marginRight: '4px' }}>Fly to:</span>
            <button className="filter-btn" onClick={() => onQuickJump(41.8902, 12.4922)}>🏟️ Rome</button>
            <button className="filter-btn" onClick={() => onQuickJump(37.9715, 23.7263)}>🏛️ Athens</button>
            <button className="filter-btn" onClick={() => onQuickJump(31.7767, 35.2227)}>🏰 Jerusalem</button>
            <button className="filter-btn" onClick={onLocateUser} title="Jump to my location">🎯 My Location</button>
            <button 
              className={`filter-btn ${showRadiusForm || nearbyCenter ? 'active' : ''}`} 
              onClick={() => setShowRadiusForm(prev => !prev)}
              title="Search historical sites in a radius around the current map center"
            >
              🔍 Find Nearby
            </button>
          </div>

          {/* Inline Radius Search Selector */}
          {showRadiusForm && (
            <div className="filters-container" style={{ marginTop: '8px', padding: '6px 8px', background: 'var(--border)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--text-h)' }}>Radius (m):</span>
              <input
                type="number"
                value={radiusInput}
                onChange={(e) => setRadiusInput(e.target.value)}
                min="1"
                style={{
                  width: '80px',
                  background: 'var(--bg-translucent)',
                  border: '1px solid var(--border)',
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
                className="filter-btn active" 
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
                className="filter-btn" 
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
          <div className="filters-container">
            {categories.map((cat) => (
              <button
                key={cat.id}
                className={`filter-btn ${activeFilter === cat.id ? 'active' : ''}`}
                onClick={() => setActiveFilter(cat.id)}
              >
                <span>{cat.emoji}</span> {cat.label}
              </button>
            ))}
          </div>
        </>
      )}
    </header>
  )
}

