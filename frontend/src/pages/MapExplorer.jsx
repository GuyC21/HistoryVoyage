import React, { useState, useEffect, useRef } from 'react'
import { MapContainer } from 'react-leaflet'
import MapView from '../components/MapView'
import SiteDrawer from '../components/SiteDrawer'
import ZoomPrompt from '../components/ZoomPrompt'

const API_BASE = window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000'
  : 'http://localhost:8000'
const MIN_ZOOM_GATE = 7

export default function MapExplorer() {
  const [bounds, setBounds] = useState(null)
  const [zoom, setZoom] = useState(7)
  const [sites, setSites] = useState([])
  const [filteredSites, setFilteredSites] = useState([])
  
  // Active category filter: 'all' or one of the SITE_TYPES ('castle', 'ruins', etc.)
  const [activeFilter, setActiveFilter] = useState('all')
  
  // Translation preference: 'en' (English) or 'local' (Native Language)
  const [languageMode, setLanguageMode] = useState('en')
  
  const [selectedSite, setSelectedSite] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const [drawerLoading, setDrawerLoading] = useState(false)
  const [error, setError] = useState(null)
  
  const mapRef = useRef(null)
  const drawerAbortRef = useRef(null)

  // Fetch sites when bounds change (bounds are debounced in MapView)
  useEffect(() => {
    if (!bounds) {
      setSites([])
      setError(null)
      return
    }

    const abortController = new AbortController()
    const fetchSites = async () => {
      setLoading(true)
      setError(null)
      try {
        const response = await fetch(
          `${API_BASE}/api/sites/?in_bbox=${bounds}&limit=500`,
          { signal: abortController.signal }
        )
        if (!response.ok) {
          throw new Error(`API Error: ${response.statusText}`)
        }
        const data = await response.json()
        setSites(data.features || [])
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError('Failed to fetch historical sites. Make sure the backend is running.')
          console.error(err)
        }
      } finally {
        setLoading(false)
      }
    }

    fetchSites()

    return () => {
      abortController.abort()
    }
  }, [bounds])

  // Filter sites locally for instant response
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredSites(sites)
    } else {
      setFilteredSites(
        sites.filter((site) => site.properties.site_type === activeFilter)
      )
    }
  }, [sites, activeFilter])

  // Clean up any pending drawer fetches on unmount
  useEffect(() => {
    return () => {
      if (drawerAbortRef.current) {
        drawerAbortRef.current.abort()
      }
    }
  }, [])

  // Handle marker click (triggers dynamic Wikidata translation fetch)
  const handleSiteClick = async (siteDetails) => {
    // Cancel any in-flight translation queries to prevent race conditions
    if (drawerAbortRef.current) {
      drawerAbortRef.current.abort()
    }

    setSelectedSite({
      ...siteDetails,
      englishName: null,
      englishDescription: null,
      hasTranslationAttempted: false
    })
    setIsDrawerOpen(true)

    // If there is no Wikidata ID, we cannot translate, so exit early
    if (!siteDetails.wikidata) {
      return
    }

    setDrawerLoading(true)
    const controller = new AbortController()
    drawerAbortRef.current = controller

    try {
      const response = await fetch(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${siteDetails.wikidata}&props=labels|descriptions|claims&languages=en&format=json&origin=*`,
        { signal: controller.signal }
      )
      if (!response.ok) {
        throw new Error('Wikidata fetch failed')
      }
      const data = await response.json()
      
      const entity = data.entities?.[siteDetails.wikidata]
      const englishName = entity?.labels?.en?.value || null
      const englishDescription = entity?.descriptions?.en?.value || null

      // Extract image file name from P18 claim if present
      let imageUrl = null
      if (entity?.claims?.P18?.[0]?.mainsnak?.datavalue?.value) {
        const imageName = entity.claims.P18[0].mainsnak.datavalue.value
        imageUrl = `https://commons.wikimedia.org/w/index.php?title=Special:FilePath/${encodeURIComponent(imageName)}&width=600`
      }

      setSelectedSite((prev) => {
        // Only update state if the user hasn't switched to a different marker in the meantime
        if (prev && prev.id === siteDetails.id) {
          return {
            ...prev,
            englishName: englishName,
            englishDescription: englishDescription,
            imageUrl: imageUrl,
            hasTranslationAttempted: true
          }
        }
        return prev
      })
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.error('Failed to fetch Wikidata translation:', err)
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

  // Handle Zoom In from warning overlay
  const handleZoomInClick = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(MIN_ZOOM_GATE)
    }
  }

  // Handle Quick Jump to key tourist destinations
  const handleQuickJump = (lat, lng) => {
    if (mapRef.current) {
      // Zoom into 12 which automatically clears the zoom gate (zoom >= 7) and fetches markers
      mapRef.current.setView([lat, lng], 12)
    }
  }

  // Category definitions for rendering badges/filters
  const categories = [
    { id: 'all', label: 'All', emoji: '🗺️' },
    { id: 'castle', label: 'Castles', emoji: '🏰' },
    { id: 'ruins', label: 'Ruins', emoji: '🏚️' },
    { id: 'holy_site', label: 'Holy Sites', emoji: '⛪' },
    { id: 'monument', label: 'Monuments', emoji: '🗽' },
    { id: 'archaeological', label: 'Archaeology', emoji: '🏺' }
  ]

  return (
    <div className="dashboard-container">
      {/* Floating Header Card */}
      <header className="floating-header">
        <div className="header-top-row">
          <h1>
            <span>🗺️</span> HistoryVoyage
          </h1>
          
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
        </div>
        <p>Explore ancient civilisations across Israel, Greece, and Italy.</p>
        
        <div className="stats-bar">
          <span className="stat-badge">
            {zoom < MIN_ZOOM_GATE 
              ? 'Zoom in to view' 
              : `Visible: ${filteredSites.length} sites`}
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
          <button className="filter-btn" onClick={() => handleQuickJump(41.8902, 12.4922)}>🏟️ Rome</button>
          <button className="filter-btn" onClick={() => handleQuickJump(37.9715, 23.7263)}>🏛️ Athens</button>
          <button className="filter-btn" onClick={() => handleQuickJump(31.7767, 35.2227)}>🏰 Jerusalem</button>
        </div>

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
      </header>

      {/* Map loading spinner */}
      {loading && (
        <div className="loading-indicator">
          <div className="spinner"></div>
          <span>Loading sites...</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="loading-indicator" style={{ borderLeft: '4px solid #ef4444' }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {/* Map Viewport Wrapper */}
      <main className="map-wrapper">
        <MapContainer
          center={[38.5, 20.0]} // Centered on Mediterranean
          zoom={7}
          minZoom={5}
          maxZoom={18}
          className="map-element"
          zoomControl={false}
          ref={mapRef}
        >
          {/* Custom zoom controls */}
          <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '10px', marginRight: '10px' }}>
            <div className="leaflet-control leaflet-bar">
              <a className="leaflet-control-zoom-in" href="#" title="Zoom in" role="button" aria-label="Zoom in" onClick={(e) => { e.preventDefault(); mapRef.current.zoomIn(); }}>+</a>
              <a className="leaflet-control-zoom-out" href="#" title="Zoom out" role="button" aria-label="Zoom out" onClick={(e) => { e.preventDefault(); mapRef.current.zoomOut(); }}>-</a>
            </div>
          </div>

          <MapView
            sites={filteredSites}
            selectedSite={selectedSite}
            onSiteClick={handleSiteClick}
            onBoundsChange={setBounds}
            onZoomChange={setZoom}
            currentZoom={zoom}
            minZoomGate={MIN_ZOOM_GATE}
          />
        </MapContainer>
      </main>

      {/* Zoom Gate Low Zoom Message */}
      {zoom < MIN_ZOOM_GATE && (
        <ZoomPrompt onZoomClick={handleZoomInClick} />
      )}

      {/* Slide-out details drawer */}
      <SiteDrawer
        site={selectedSite}
        isOpen={isDrawerOpen}
        onClose={() => {
          setIsDrawerOpen(false)
          setSelectedSite(null)
        }}
        isLoading={drawerLoading}
        languageMode={languageMode}
        setLanguageMode={setLanguageMode}
      />
    </div>
  )
}
