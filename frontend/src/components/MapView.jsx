import React, { useEffect, useState, useRef, useCallback } from 'react'
import { TileLayer, Marker, Polygon, useMapEvents } from 'react-leaflet'
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
const CATEGORY_MAP = {
  castle: { emoji: '🏰', color: 'var(--color-castle)' },
  ruins: { emoji: '🏛️', color: 'var(--color-ruins)' },
  holy_site: { emoji: '⛪', color: 'var(--color-holy)' },
  monument: { emoji: '🗽', color: 'var(--color-monument)' },
  archaeological: { emoji: '🏺', color: 'var(--color-archaeological)' },
  relation: { emoji: '🗺️', color: 'var(--color-other)' },
  complex: { emoji: '🗺️', color: 'var(--color-other)' }
}

const getMarkerIcon = (siteType, isSelected, hasBoundary) => {
  const cacheKey = `${siteType}-${isSelected}-${hasBoundary}`
  if (iconCache[cacheKey]) {
    return iconCache[cacheKey]
  }

  const category = CATEGORY_MAP[siteType] || { emoji: '📍', color: 'var(--color-other)' }

  const html = `
    <div class="custom-pin ${isSelected ? 'selected' : ''} ${hasBoundary ? 'has-boundary' : ''}" style="--marker-color: ${category.color}">
      <span class="pin-icon">${category.emoji}</span>
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

  const lightTiles = isDarkMode 
    ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png'
  
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
