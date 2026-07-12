import React, { useEffect, useState, useRef, useCallback } from 'react'
import { TileLayer, Marker, Polygon, Circle, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

const iconCache = {}

/**
 * getMarkerIcon Helper
 * Generates custom Leaflet DivIcons containing category-specific SVGs, colors, and pulsing selection glow effects.
 *
 * @param {string} siteType - Category name (e.g. 'castle', 'ruins', 'holy_site', 'monument', 'archaeological').
 * @param {boolean} isSelected - Whether the marker pin is currently selected.
 * @returns {L.DivIcon} Leaflet DivIcon instance.
 */
const getMarkerIcon = (siteType, isSelected, hasBoundary) => {
  const cacheKey = `${siteType}-${isSelected}-${hasBoundary}`
  if (iconCache[cacheKey]) {
    return iconCache[cacheKey]
  }

  let color = 'var(--color-other)'
  let iconSvg = ''

  switch (siteType) {
    case 'castle':
      color = 'var(--color-castle)'
      iconSvg = `<svg viewBox="0 0 24 24"><path d="M2 20h20v2H2zm2-2V8h3v2h2V8h4v2h2V8h3v2h2V8h2v10zM5 10v6h4v-6zm10 0v6h4v-6z"/></svg>`
      break
    case 'ruins':
      color = 'var(--color-ruins)'
      iconSvg = `<svg viewBox="0 0 24 24"><path d="M19 2H5v2h14zm-2 4H7v2h10zm-1 4H8v10h2V10h4v10h2zm3 12H3v2h18z"/></svg>`
      break
    case 'holy_site':
      color = 'var(--color-holy)'
      iconSvg = `<svg viewBox="0 0 24 24"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm1 11h3v2h-3v3h-2v-3H8v-2h3V8h2z"/></svg>`
      break
    case 'monument':
      color = 'var(--color-monument)'
      iconSvg = `<svg viewBox="0 0 24 24"><path d="M17 19h2v2H5v-2h2V9l5-6 5 6zm-2-9l-3-3.6L9 10v9h6z"/></svg>`
      break
    case 'archaeological':
      color = 'var(--color-archaeological)'
      iconSvg = `<svg viewBox="0 0 24 24"><path d="M12 3a4 4 0 0 0-4 4v1a5 5 0 0 0-3 4.58V18a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-5.42A5 5 0 0 0 16 8V7a4 4 0 0 0-4-4zm-2 4a2 2 0 0 1 4 0v1h-4zm6 11H8v-5.42A3 3 0 0 1 10.58 10h2.84A3 3 0 0 1 16 12.58z"/></svg>`
      break
    default:
      iconSvg = `<svg viewBox="0 0 24 24"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5a2.5 2.5 0 1 1 0-5 2.5 2.5 0 0 1 0 5z"/></svg>`
  }

  const html = `
    <div class="custom-pin ${isSelected ? 'selected' : ''} ${hasBoundary ? 'has-boundary' : ''}" style="--marker-color: ${color}">
      ${iconSvg}
    </div>
  `

  const icon = L.divIcon({
    html: html,
    className: 'custom-pin-wrapper',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  })

  iconCache[cacheKey] = icon
  return icon
}

/**
 * MapEventsHandler Subcomponent
 * Listens to Leaflet viewport move/zoom events, debounces query bounding-box changes,
 * and forces Leaflet size re-evaluations to resolve gray screen container size bugs.
 *
 * @param {Object} props
 * @param {Function} props.onBoundsChange - Callback with string bounding-box: "west,south,east,north" | null.
 * @param {Function} props.onZoomChange - Callback with current zoom number.
 * @param {number} props.minZoomGate - Minimum zoom gate under which database querying is disabled.
 */
function MapEventsHandler({ onBoundsChange, onZoomChange, minZoomGate }) {
  const debounceTimer = useRef(null)

  const map = useMapEvents({
    moveend: () => {
      handleMapChange()
    },
    zoomend: () => {
      const zoom = map.getZoom()
      onZoomChange(zoom)
      handleMapChange()
    }
  })

  const handleMapChange = useCallback(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current)
    }

    // Set new timer for debouncing (300ms)
    debounceTimer.current = setTimeout(() => {
      const zoom = map.getZoom()
      if (zoom >= minZoomGate) {
        const bounds = map.getBounds()
        const west = bounds.getWest()
        const south = bounds.getSouth()
        const east = bounds.getEast()
        const north = bounds.getNorth()
        
        // Report bounding box as west,south,east,north
        onBoundsChange(`${west},${south},${east},${north}`)
      } else {
        // Under the zoom gate, clear bounds to prevent querying
        onBoundsChange(null)
      }
    }, 300)
  }, [map, minZoomGate, onBoundsChange])

  // Trigger initial bounds calculation on load
  useEffect(() => {
    // Force Leaflet to recalculate container size to fix grey map/misaligned coordinate bug
    const sizeTimer = setTimeout(() => {
      map.invalidateSize()
    }, 150)

    handleMapChange()
    onZoomChange(map.getZoom())

    return () => {
      clearTimeout(sizeTimer)
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current)
      }
    }
  }, [handleMapChange, map, onZoomChange])

  return null
}

/**
 * SiteMarker Component
 * Memoized individual site marker to prevent re-attaching Leaflet event handlers 
 * on every map pan or zoom.
 */
const SiteMarker = React.memo(({ site, isSelected, hasBoundary, onSiteClick }) => {
  const [lng, lat] = site.geometry.coordinates

  const eventHandlers = React.useMemo(() => ({
    click: () => {
      onSiteClick({
        id: site.id,
        ...site.properties,
        coordinates: [lat, lng],
        fromMap: true
      })
    }
  }), [site.id, site.properties, lat, lng, onSiteClick])

  return (
    <Marker
      position={[lat, lng]}
      icon={getMarkerIcon(site.properties?.site_type, isSelected, hasBoundary)}
      eventHandlers={eventHandlers}
    />
  )
})

/**
 * MapView Component
 * Renders the reactive Leaflet layers (basemap tile layers, dynamic markers, OS dark theme handlers, and viewport bounds).
 *
 * @param {Object} props
 * @param {Array<Object>} props.sites - List of GeoJSON historical sites to map.
 * @param {Object|null} props.selectedSite - The currently highlighted/active site properties.
 * @param {Function} props.onSiteClick - Callback triggered when clicking a site marker.
 * @param {Function} props.onBoundsChange - Callback indicating map bounding box shifts.
 * @param {Function} props.onZoomChange - Callback indicating viewport zoom changes.
 * @param {number} props.currentZoom - Current map viewport zoom level.
 * @param {number} props.minZoomGate - Zoom limit gate beneath which markers are hidden.
 * @param {Array|null} props.activePolygon - Selected site boundary polygon paths to render.
 */
export default function MapView({ 
  sites, 
  selectedSite, 
  onSiteClick, 
  onBoundsChange, 
  onZoomChange, 
  currentZoom, 
  minZoomGate,
  activePolygon,
  nearbyCenter,
  nearbyRadius,
  isVoyageOnlyView
}) {
  /**
   * @type {boolean} Sensing system color scheme.
   * Tracks whether light or dark tiles should render based on the OS style.
   */
  const [isDarkMode, setIsDarkMode] = useState(
    document.documentElement.getAttribute('data-theme') !== 'light'
  )

  // Listen to data-theme attribute changes on document.documentElement
  useEffect(() => {
    const handleThemeChange = () => {
      setIsDarkMode(document.documentElement.getAttribute('data-theme') !== 'light');
    };

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          handleThemeChange();
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    
    // Initial sync just in case
    handleThemeChange();

    return () => observer.disconnect();
  }, [])

  // CartoDB Tile Providers (rendered as vector-styled raster map tiles)
  // We use light tiles as the base, and apply a CSS filter for dark mode to get a beautiful slate-blue map
  // instead of the stark black CartoDB Dark Matter map.
  const lightTiles = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  
  /** @type {string} Attribution label required for OpenStreetMap and CartoDB usage guidelines. */
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

  return (
    <>
      <TileLayer
        url={lightTiles}
        attribution={attribution}
        maxNativeZoom={19}
        maxZoom={22}
        className={isDarkMode ? 'dark-map-filter' : ''}
      />

      {activePolygon && (
        <Polygon
          positions={activePolygon}
          pathOptions={{
            color: '#a78bfa', // Light violet border glow
            fillColor: '#8b5cf6', // Indigo/violet fill
            fillOpacity: 0.2,
            weight: 3.5,
            dashArray: '6, 6', // Elegant blueprint dashed border
            lineCap: 'round',
            lineJoin: 'round',
            className: 'glowing-polygon-path'
          }}
        />
      )}

      {nearbyCenter && (
        <Circle
          center={[nearbyCenter.lat, nearbyCenter.lng]}
          radius={nearbyRadius}
          pathOptions={{
            color: '#3b82f6', // Premium blue stroke
            fillColor: '#3b82f6', // Premium blue fill
            fillOpacity: 0.12,
            weight: 2,
            dashArray: '5, 5',
            className: 'radius-search-circle'
          }}
        />
      )}
      
      <MapEventsHandler 
        onBoundsChange={onBoundsChange} 
        onZoomChange={onZoomChange} 
        minZoomGate={minZoomGate} 
      />

      {(currentZoom >= minZoomGate || isVoyageOnlyView) && sites.map((site) => {
        // Check if site has valid coordinates
        // DRF-GIS GeoJSON output has geometry.coordinates as [lng, lat]
        if (!site.geometry || !site.geometry.coordinates) return null
        
        const isSelected = selectedSite && selectedSite.id === site.id
        
        // We consider a site as having a boundary outline if its osmType is way or relation
        const hasBoundary = site.properties?.osmType === 'way' || site.properties?.osmType === 'relation'

        return (
          <SiteMarker
            key={site.id}
            site={site}
            isSelected={isSelected}
            hasBoundary={hasBoundary}
            onSiteClick={onSiteClick}
          />
        )
      })}
    </>
  )
}
