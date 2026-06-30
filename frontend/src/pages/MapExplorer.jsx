import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import MapView from '../components/MapView'
import SiteDrawer from '../components/SiteDrawer'
import ZoomPrompt from '../components/ZoomPrompt'
import GeolocationHandler from '../components/GeolocationHandler'
import HeaderCard from '../components/HeaderCard'
import { useDeepLink } from '../hooks/useDeepLink'
import { useSiteDetails } from '../hooks/useSiteDetails'
import { useMapData } from '../hooks/useMapData'

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

const MIN_ZOOM_GATE = 7

/**
 * MapExplorer Page Component
 * Main application dashboard and viewport for the HistoryVoyage map.
 * Orchestrates calls to the local Django backend and fetches metadata/assets dynamically.
 */
export default function MapExplorer() {
  const [bounds, setBounds] = useState(null)
  const [zoom, setZoom] = useState(7)
  const [filteredSites, setFilteredSites] = useState([])
  
  // Active category filter: 'all' or one of the SITE_TYPES ('castle', 'ruins', etc.)
  const [activeFilter, setActiveFilter] = useState('all')
  
  // Translation preference: 'en' (English) or 'local' (Native Language)
  const [languageMode, setLanguageMode] = useState('en')
  
  const [activePolygon, setActivePolygon] = useState(null)
  const [mapInstance, setMapInstance] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [toast, setToast] = useState(null)
  
  const geoRef = useRef(null)

  // Custom Hooks for business logic
  const { sites, loading, error } = useMapData(bounds)
  const { 
    selectedSite, 
    isDrawerOpen, 
    drawerLoading, 
    handleSiteClick, 
    closeDrawer 
  } = useSiteDetails(mapInstance, setActivePolygon)

  useDeepLink(mapInstance, handleSiteClick)

  // Automatically clear toast messages after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Filter sites when sites data or activeFilter changes
  useEffect(() => {
    if (activeFilter === 'all') {
      setFilteredSites(sites)
    } else {
      setFilteredSites(
        sites.filter((site) => site.properties?.site_type === activeFilter)
      )
    }
  }, [sites, activeFilter])

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

  // Handle selecting a site from search autocomplete suggestions
  const handleSelectSite = (siteFeature) => {
    if (!siteFeature.geometry || !siteFeature.geometry.coordinates) return
    const [lng, lat] = siteFeature.geometry.coordinates
    if (mapInstance) {
      mapInstance.setView([lat, lng], 18) // Zoom in closely (premium detail) to show the specific site
    }
    handleSiteClick({
      id: siteFeature.id,
      ...siteFeature.properties,
      coordinates: [lat, lng]
    })
  }

  // Category definitions for rendering badges/filters
  const categories = [
    { id: 'all', label: 'All', emoji: '🌍' },
    { id: 'castle', label: 'Castles', emoji: '🏰' },
    { id: 'ruins', label: 'Ruins', emoji: '🏛️' },
    { id: 'holy_site', label: 'Holy Sites', emoji: '⛪' },
    { id: 'monument', label: 'Monuments', emoji: '🗽' },
    { id: 'archaeological', label: 'Archaeology', emoji: '🏺' },
    { id: 'relation', label: 'Complex Sites', emoji: '🗺️' }
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
        onLocateUser={() => geoRef.current?.locate()}
        onSelectSite={handleSelectSite}
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
          minZoom={8}
          maxZoom={22}
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
                📍
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
            activePolygon={activePolygon}
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
        onClose={closeDrawer}
        isLoading={drawerLoading}
        languageMode={languageMode}
        setLanguageMode={setLanguageMode}
        userLocation={userLocation}
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
