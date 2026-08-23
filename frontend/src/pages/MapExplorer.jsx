import React, { useState, useEffect, useRef } from 'react'
import { MapContainer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import MapView from '~/components/MapView'
import SiteDrawer from '~/components/SiteDrawer'
import ZoomPrompt from '~/components/ZoomPrompt'
import GeolocationHandler from '~/components/GeolocationHandler'
import HeaderCard from '~/components/HeaderCard'
import ItinerarySidebar from '~/components/ItinerarySidebar/ItinerarySidebar'
import NavigationOverlay from '~/components/NavigationOverlay/NavigationOverlay'
import { useDeepLink } from '~/hooks/useDeepLink'
import { useSiteDetails } from '~/hooks/useSiteDetails'
import { useMapData } from '~/hooks/useMapData'
import { useActiveNavigation } from '~/hooks/useActiveNavigation'
import { useFilteredSites } from '~/hooks/useFilteredSites'
import { useVoyageMapBounds } from '~/hooks/useVoyageMapBounds'
import { useVoyage } from '~/context/VoyageContext'
import { useAuth } from '~/context/AuthContext'
import { supabase } from '~/services/supabase'

// Custom pulsing blue icon for user location pin
const userLocationIcon = L.divIcon({
  html: `<div class="user-location-ping">
           <div class="direction-cone"></div>
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
 * Waze/Google Maps live active navigation focus mode, and slides out details drawer.
 * 
 * @returns {React.ReactElement} The dashboard layout view element.
 */
export default function MapExplorer() {
  /** @type {string|null} Bounding box CSV coordinates string ('west,south,east,north'). */
  const [bounds, setBounds] = useState(null)

  /** @type {number} Current map zoom level. Governs whether markers render. */
  const [zoom, setZoom] = useState(7)
  
  /** @type {string} Selected category type ID (e.g. 'castle', 'ruins', 'all'). */
  const [activeFilter, setActiveFilter] = useState('all')
  
  const { user } = useAuth()
  
  /** @type {string} Current interface language ('en' for English translation, 'local'). */
  const [languageMode, setLanguageMode] = useState(() => {
    return user?.user_metadata?.language_mode || 'en'
  })

  // Sync languageMode when user metadata resolves
  useEffect(() => {
    if (user?.user_metadata?.language_mode) {
      setLanguageMode(user.user_metadata.language_mode)
    }
  }, [user])

  const handleLanguageChange = async (newMode) => {
    setLanguageMode(newMode)
    if (user) {
      try {
        await supabase.auth.updateUser({
          data: { language_mode: newMode }
        })
      } catch (err) {
        console.error('Failed to save language preference to Supabase profile:', err)
      }
    }
  }

  /** @type {Array<Array<number>>|null} Active site layout polygon coordinates. */
  const [activePolygon, setActivePolygon] = useState(null)

  /** @type {L.Map|null} Active leaflet map reference instance. */
  const [mapInstance, setMapInstance] = useState(null)

  /** @type {Array<number>|null} Resolved user device coordinates: [lat, lng]. */
  const [userLocation, setUserLocation] = useState(null)

  /** @type {string|null} Active status text displayed in the toast notification. */
  const [toast, setToast] = useState(null)

  /** @type {boolean} Controls visibility of the left collapsible Itinerary sidebar. */
  const [isItineraryOpen, setIsItineraryOpen] = useState(false)
  
  /** @type {React.RefObject} Ref containing locate functions exposed by GeolocationHandler. */
  const geoRef = useRef(null)

  // Custom Hooks for business logic
  const { sites, loading, error } = useMapData(bounds, activeFilter)
  
  // Controls individual historical site details retrieval, images loading, and drawer slides
  const { 
    selectedSite, 
    isDrawerOpen, 
    drawerLoading, 
    handleSiteClick, 
    closeDrawer 
  } = useSiteDetails(mapInstance, setActivePolygon)

  // Waze / Google Maps-style live active navigation hook
  const {
    isNavigating,
    activeDestination,
    routeData,
    currentStep,
    upcomingStep,
    distToNextTurn,
    isFollowing,
    isMuted,
    travelMode,
    startNavigation: startNavHook,
    stopNavigation,
    toggleFollowMode,
    toggleMute,
    toggleTravelMode
  } = useActiveNavigation(userLocation, mapInstance, setToast)

  // Handler to initiate live navigation focus mode from SiteDrawer
  const handleStartNavigation = (site) => {
    let startPos = userLocation

    if (!startPos && mapInstance) {
      const center = mapInstance.getCenter()
      startPos = [center.lat, center.lng]
      setToast('Starting navigation from map view center')
    } else if (!startPos) {
      setToast('Searching for GPS signal... Please allow location access.')
      geoRef.current?.locate()
      return
    }

    closeDrawer()
    setIsItineraryOpen(false)
    startNavHook(site, startPos)
  }

  // Voyage context
  const { activeVoyage, isVoyageOnlyView, toggleVoyageView } = useVoyage()

  // Custom hook for site filtering & voyage stop mapping
  const filteredSites = useFilteredSites(sites, activeFilter, isVoyageOnlyView, activeVoyage)

  // Custom hook for auto-fitting map bounds when loading an active voyage
  useVoyageMapBounds(mapInstance, activeVoyage)

  // Resolves direct links containing ?site=<id> URL search parameters
  useDeepLink(mapInstance, handleSiteClick)

  // Automatically clear toast messages after 5 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [toast])

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

    // Intercept cities: zoom to them without opening the detail drawer
    if (siteFeature.properties?.site_type === 'city') {
      if (siteFeature.properties.bbox && mapInstance) {
        const [south, west, north, east] = siteFeature.properties.bbox
        const bounds = L.latLngBounds([[south, west], [north, east]])
        mapInstance.flyToBounds(bounds, { padding: [50, 50], maxZoom: 12 })
      } else {
        handleQuickJump(lat, lng)
      }
      return
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
      {/* Distraction-Free Focus Mode Overlay when Live Navigation is Active */}
      {isNavigating ? (
        <NavigationOverlay
          activeDestination={activeDestination}
          routeData={routeData}
          currentStep={currentStep}
          upcomingStep={upcomingStep}
          distToNextTurn={distToNextTurn}
          isFollowing={isFollowing}
          isMuted={isMuted}
          travelMode={travelMode}
          userLocation={userLocation}
          onStopNavigation={stopNavigation}
          onToggleFollow={toggleFollowMode}
          onToggleMute={toggleMute}
          onToggleTravelMode={toggleTravelMode}
        />
      ) : (
        <>
          {/* Floating Header Card */}
          <HeaderCard
            languageMode={languageMode}
            setLanguageMode={handleLanguageChange}
            zoom={zoom}
            minZoomGate={MIN_ZOOM_GATE}
            visibleSitesCount={filteredSites.length}
            activeFilter={activeFilter}
            setActiveFilter={setActiveFilter}
            categories={categories}
            onQuickJump={handleQuickJump}
            onLocateUser={() => geoRef.current?.locate()}
            onSelectSite={handleSelectSite}
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
        </>
      )}

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
          {/* Custom Controls (Locate Me & Zoom) - Hidden in Focus Navigation Mode */}
          {!isNavigating && (
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
          )}

          <MapView
            sites={filteredSites}
            selectedSite={selectedSite}
            onSiteClick={handleSiteClick}
            onBoundsChange={setBounds}
            onZoomChange={setZoom}
            currentZoom={zoom}
            minZoomGate={MIN_ZOOM_GATE}
            activePolygon={activePolygon}
            isVoyageOnlyView={isVoyageOnlyView}
            routeData={routeData}
            activeDestination={activeDestination}
            onUserDrag={() => isFollowing && toggleFollowMode()}
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
      {zoom < MIN_ZOOM_GATE && !isNavigating && (
        <ZoomPrompt onZoomClick={handleZoomInClick} />
      )}

      {/* Slide-out details drawer - Hidden in Focus Navigation Mode */}
      {!isNavigating && (
        <SiteDrawer
          site={selectedSite}
          isOpen={isDrawerOpen}
          onClose={closeDrawer}
          isLoading={drawerLoading}
          languageMode={languageMode}
          setLanguageMode={handleLanguageChange}
          userLocation={userLocation}
          onToast={setToast}
          onRefreshDetails={handleSiteClick}
          onStartNavigation={handleStartNavigation}
        />
      )}

      {/* Floating toast notification */}
      {toast && (
        <div className="custom-toast" onClick={() => setToast(null)}>
          <span>ℹ️ {toast}</span>
        </div>
      )}
    </div>
  )
}
