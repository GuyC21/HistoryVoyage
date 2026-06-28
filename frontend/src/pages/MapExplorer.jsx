import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import MapView from '../components/MapView'
import SiteDrawer from '../components/SiteDrawer'
import ZoomPrompt from '../components/ZoomPrompt'
import GeolocationHandler from '../components/GeolocationHandler'
import HeaderCard from '../components/HeaderCard'

// Custom pulsing blue icon for user location pin
const userLocationIcon = L.divIcon({
  html: `<div class="user-location-ping">
           <div class="ping-circle"></div>
           <div class="core-dot"></div>
         </div>`,
  className: 'user-location-marker-wrapper',
  iconSize: [20, 20],
  iconAnchor: [10, 10]
})

const API_BASE = window.location.hostname === '127.0.0.1'
  ? 'http://127.0.0.1:8000'
  : 'http://localhost:8000'
const MIN_ZOOM_GATE = 7

/**
 * MapExplorer Page Component
 * Main application dashboard and viewport for the HistoryVoyage map.
 * Manages coordinates querying, viewport bounding-box debounces, active category filtering tags,
 * interface language state, and sliding details drawer loaders. 
 * Orchestrates calls to the local Django backend and fetches metadata/assets dynamically from Wikidata APIs.
 */
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
  
  const [mapInstance, setMapInstance] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [toast, setToast] = useState(null)
  
  const geoRef = useRef(null)
  const drawerAbortRef = useRef(null)

  // Automatically clear toast messages after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

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
    if (mapInstance) {
      mapInstance.setZoom(MIN_ZOOM_GATE)
    }
  }

  // Handle Quick Jump to key tourist destinations
  const handleQuickJump = (lat, lng) => {
    if (mapInstance) {
      // Zoom into 12 which automatically clears the zoom gate (zoom >= 7) and fetches markers
      mapInstance.setView([lat, lng], 12)
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
      <HeaderCard
        languageMode={languageMode}
        setLanguageMode={setLanguageMode}
        zoom={zoom}
        minZoomGate={MIN_ZOOM_GATE}
        visibleSitesCount={filteredSites.length}
        activeFilter={activeFilter}
        setActiveFilter={setActiveFilter}
        categories={categories}
        onQuickJump={handleQuickJump}
      />

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
          ref={setMapInstance}
        >
          {/* Custom Controls (Locate Me & Zoom) */}
          <div className="leaflet-bottom leaflet-right" style={{ marginBottom: '10px', marginRight: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* Locate Me button */}
            <div className="leaflet-control leaflet-bar" style={{ border: 'none', boxShadow: 'var(--shadow-sm)', margin: 0 }}>
              <a 
                href="#" 
                title="Locate Me" 
                role="button" 
                aria-label="Locate Me" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  fontSize: '15px', 
                  background: 'var(--bg-translucent)', 
                  backdropFilter: 'blur(8px)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '8px', 
                  width: '34px', 
                  height: '34px',
                  color: 'var(--text-h)',
                  cursor: 'pointer'
                }}
                onClick={(e) => { 
                  e.preventDefault(); 
                  geoRef.current?.locate(); 
                }}
              >
                🎯
              </a>
            </div>

            {/* Zoom Controls */}
            <div className="leaflet-control leaflet-bar" style={{ border: 'none', boxShadow: 'var(--shadow-sm)', margin: 0 }}>
              <a 
                className="leaflet-control-zoom-in" 
                href="#" 
                title="Zoom in" 
                role="button" 
                aria-label="Zoom in" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  background: 'var(--bg-translucent)', 
                  backdropFilter: 'blur(8px)', 
                  border: '1px solid var(--border)', 
                  borderBottom: 'none', 
                  borderRadius: '8px 8px 0 0', 
                  width: '34px', 
                  height: '34px',
                  color: 'var(--text-h)',
                  cursor: 'pointer'
                }} 
                onClick={(e) => { 
                  e.preventDefault(); 
                  if (mapInstance) mapInstance.zoomIn(); 
                }}
              >
                +
              </a>
              <a 
                className="leaflet-control-zoom-out" 
                href="#" 
                title="Zoom out" 
                role="button" 
                aria-label="Zoom out" 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  justifyContent: 'center', 
                  background: 'var(--bg-translucent)', 
                  backdropFilter: 'blur(8px)', 
                  border: '1px solid var(--border)', 
                  borderRadius: '0 0 8px 8px', 
                  width: '34px', 
                  height: '34px',
                  color: 'var(--text-h)',
                  cursor: 'pointer'
                }} 
                onClick={(e) => { 
                  e.preventDefault(); 
                  if (mapInstance) mapInstance.zoomOut(); 
                }}
              >
                -
              </a>
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

          {/* Reusable geolocation logic component */}
          <GeolocationHandler 
            ref={geoRef} 
            mapInstance={mapInstance} 
            onToast={setToast} 
            onLocationFound={setUserLocation} 
          />

          {/* User location pulsing blue dot pin */}
          {userLocation && (
            <Marker position={userLocation} icon={userLocationIcon}>
              <Popup>
                <div style={{ fontWeight: '600', fontSize: '12px', textAlign: 'center' }}>You are here</div>
              </Popup>
            </Marker>
          )}
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

      {/* Floating toast notification */}
      {toast && (
        <div className="custom-toast" onClick={() => setToast(null)}>
          <span>ℹ️ {toast}</span>
        </div>
      )}
    </div>
  )
}
