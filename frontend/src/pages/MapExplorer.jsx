import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import MapView from '~/components/MapView'
import SiteDrawer from '~/components/SiteDrawer'
import ZoomPrompt from '~/components/ZoomPrompt'
import GeolocationHandler from '~/components/GeolocationHandler'
import HeaderCard from '~/components/HeaderCard'
import ItinerarySidebar from '~/components/ItinerarySidebar/ItinerarySidebar'
import { useDeepLink } from '~/hooks/useDeepLink'
import { useSiteDetails } from '~/hooks/useSiteDetails'
import { useMapData } from '~/hooks/useMapData'
import { useVoyage } from '~/context/VoyageContext'

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
 * MapExplorer Component
 * 
 * The root container page/dashboard for the HistoryVoyage client application.
 * Manages Leaflet map state, user coordinates tracking, categories filtering,
 * and slides out the details drawer. Coordinates state sharing between:
 * - `HeaderCard` (Branding, filters, quick jump search bar)
 * - `MapView` (Leaflet tile layers, site markers, boundary outline overlays)
 * - `SiteDrawer` (Detailed historical descriptions, Wikipedia web views, road distance details)
 * - `ZoomPrompt` (Visual shield prompt to zoom in for performance/data-density gate)
 * - `GeolocationHandler` (Imperative locator targeting current device coords)
 * 
 * @returns {React.ReactElement} The dashboard layout view element.
 */
export default function MapExplorer() {
  /**
   * @type {string|null} Bounding box CSV coordinates string ('west,south,east,north').
   * Passed to useMapData hook to retrieve historical site nodes.
   */
  const [bounds, setBounds] = useState(null)

  /** @type {number} Current map zoom level. Governs whether markers render. */
  const [zoom, setZoom] = useState(7)

  /** @type {Array<Object>} List of historical site features filtered by active category type. */
  const [filteredSites, setFilteredSites] = useState([])
  
  /** @type {string} Selected category type ID (e.g. 'castle', 'ruins', 'all'). */
  const [activeFilter, setActiveFilter] = useState('all')
  
  /** @type {string} Current interface language ('en' for English translation, 'local'). */
  const [languageMode, setLanguageMode] = useState('en')
  
  /** @type {Array<Array<number>>|null} Active site layout polygon coordinates. */
  const [activePolygon, setActivePolygon] = useState(null)

  /** @type {L.Map|null} Active leaflet map reference instance. */
  const [mapInstance, setMapInstance] = useState(null)

  /** @type {Array<number>|null} Resolved user device coordinates: [lat, lng]. */
  const [userLocation, setUserLocation] = useState(null)

  /** @type {string|null} Active status text displayed in the toast notification. */
  const [toast, setToast] = useState(null)

  /** @type {Object|null} Location center for circular radius searches: {lat, lng}. */
  const [nearbyCenter, setNearbyCenter] = useState(null)

  /** @type {number} Radius search limit boundary in meters. */
  const [nearbyRadius, setNearbyRadius] = useState(5000)

  /** @type {boolean} Controls visibility of the left collapsible Itinerary sidebar. */
  const [isItineraryOpen, setIsItineraryOpen] = useState(false)
  
  /** @type {React.RefObject} Ref containing locate functions exposed by GeolocationHandler. */
  const geoRef = useRef(null)

  /**
   * Triggers a circular radius search around the current center coordinates of the map.
   * 
   * @param {number} radiusMeters - The distance radius in meters.
   */
  const handleTriggerNearby = (radiusMeters) => {
    if (mapInstance) {
      const center = mapInstance.getCenter()
      setNearbyCenter({ lat: center.lat, lng: center.lng })
      setNearbyRadius(radiusMeters)
    } else {
      setToast("Map is not loaded yet.")
    }
  }

  /**
   * Clears the active radius search criteria and resets map filters.
   */
  const handleClearNearby = () => {
    setNearbyCenter(null)
  }

  // Custom Hooks for business logic
  
  const { sites, loading, error } = useMapData(bounds, nearbyCenter, nearbyRadius, activeFilter)
  
  // Controls individual historical site details retrieval, images loading, and drawer slides
  const { 
    selectedSite, 
    isDrawerOpen, 
    drawerLoading, 
    handleSiteClick, 
    closeDrawer 
  } = useSiteDetails(mapInstance, setActivePolygon)

  // Voyage context
  const { activeVoyage, isVoyageOnlyView, toggleVoyageView } = useVoyage()

  // Resolves direct links containing ?site=<id> URL search parameters
  useDeepLink(mapInstance, handleSiteClick)

  // Automatically clear toast messages after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

  // Filter sites when sites data, activeFilter, or voyage toggle changes
  useEffect(() => {
    let filtered = sites

    // 1. Filter by category
    if (activeFilter === 'relation') {
      filtered = filtered.filter((site) => site.properties?.osmType === 'relation')
    } else if (activeFilter !== 'all') {
      filtered = filtered.filter((site) => site.properties?.site_type === activeFilter)
    }

    // 2. Filter by Voyage if active
    if (isVoyageOnlyView && activeVoyage) {
      filtered = (activeVoyage.stops || []).map(stop => {
        const details = stop.siteDetails
        if (!details || !details.coordinates) return null
        return {
          id: details.id,
          geometry: {
            type: 'Point',
            coordinates: [details.coordinates[1], details.coordinates[0]] // [lng, lat]
          },
          properties: {
            name: details.name,
            englishName: details.englishName,
            site_type: details.siteType,
            wikidata: details.wikidata,
            country: details.country,
            osmType: 'node'
          }
        }
      }).filter(Boolean)
    }

    setFilteredSites(filtered)
  }, [sites, activeFilter, isVoyageOnlyView, activeVoyage])



  /**
   * Zooms the map view into the threshold level MIN_ZOOM_GATE.
   */
  const handleZoomInClick = () => {
    if (mapInstance) {
      mapInstance.setZoom(MIN_ZOOM_GATE)
    }
  }

  /**
   * Centers the viewport over specific coordinates.
   * 
   * @param {number} lat - Target latitude.
   * @param {number} lng - Target longitude.
   */
  const handleQuickJump = (lat, lng) => {
    if (mapInstance) {
      // Fly to the city center using Leaflet's default space-flight animation
      mapInstance.flyTo([lat, lng], 12, { animate: true })
    }
  }

  /**
   * Centers map and triggers detail drawer when selecting a site suggestion.
   * 
   * @param {Object} siteFeature - The GeoJSON site feature selected.
   */
  const handleSelectSite = (siteFeature) => {
    if (!siteFeature.geometry || !siteFeature.geometry.coordinates) return
    const [lng, lat] = siteFeature.geometry.coordinates
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
        onTriggerNearby={handleTriggerNearby}
        onClearNearby={handleClearNearby}
        nearbyCenter={nearbyCenter}
        activeVoyage={activeVoyage}
        isVoyageOnlyView={isVoyageOnlyView}
        toggleVoyageView={toggleVoyageView}
        isItineraryOpen={isItineraryOpen}
        onToggleItinerary={() => setIsItineraryOpen(prev => !prev)}
      />

      {/* Collapsible Itinerary Sidebar sliding from the left */}
      <ItinerarySidebar
        isOpen={isItineraryOpen}
        onClose={() => setIsItineraryOpen(false)}
        onToast={setToast}
        mapInstance={mapInstance}
        onSelectSite={handleSiteClick}
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
            nearbyCenter={nearbyCenter}
            nearbyRadius={nearbyRadius}
            isVoyageOnlyView={isVoyageOnlyView}
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
        onToast={setToast}
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
