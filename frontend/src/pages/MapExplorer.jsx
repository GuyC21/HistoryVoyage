import React, { useState, useEffect, useRef } from 'react'
import { MapContainer } from 'react-leaflet'
import MapView from '../components/MapView'
import SiteDrawer from '../components/SiteDrawer'

const API_BASE = 'http://localhost:8000'
const MIN_ZOOM_GATE = 7

export default function MapExplorer() {
  const [bounds, setBounds] = useState(null)
  const [zoom, setZoom] = useState(6)
  const [sites, setSites] = useState([])
  const [filteredSites, setFilteredSites] = useState([])
  
  // Active category filter: 'all' or one of the SITE_TYPES ('castle', 'ruins', etc.)
  const [activeFilter, setActiveFilter] = useState('all')
  
  const [selectedSite, setSelectedSite] = useState(null)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  
  const [loading, setLoading] = useState(false)
  const drawerLoading = false
  const [error, setError] = useState(null)
  
  const mapRef = useRef(null)

  // Fetch sites when bounds change (bounds are debounced in MapView)
  useEffect(() => {
    if (!bounds) {
      setSites([])
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

  // Handle marker click
  const handleSiteClick = (siteDetails) => {
    setSelectedSite(siteDetails)
    setIsDrawerOpen(true)
  }

  // Handle Zoom In from warning overlay
  const handleZoomInClick = () => {
    if (mapRef.current) {
      mapRef.current.setZoom(MIN_ZOOM_GATE)
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
        <h1>
          <span>🗺️</span> HistoryVoyage
        </h1>
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
          zoom={6}
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
        <div className="zoom-warning-overlay">
          <div className="zoom-warning-card">
            <h3>Explore Historical Regions</h3>
            <p>We have loaded 29,795 sites across Italy, Greece, and Israel. Zoom in to start exploring markers.</p>
            <button className="zoom-btn" onClick={handleZoomInClick}>
              🔍 Zoom in to Explore
            </button>
          </div>
        </div>
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
      />
    </div>
  )
}
