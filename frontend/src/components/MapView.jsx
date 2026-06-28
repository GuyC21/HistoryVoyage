import React, { useEffect, useState, useRef, useCallback } from 'react'
import { TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'

/**
 * getMarkerIcon Helper
 * Generates custom Leaflet DivIcons containing category-specific SVGs, colors, and pulsing selection glow effects.
 *
 * @param {string} siteType - Category name (e.g. 'castle', 'ruins', 'holy_site', 'monument', 'archaeological').
 * @param {boolean} isSelected - Whether the marker pin is currently selected.
 * @returns {L.DivIcon} Leaflet DivIcon instance.
 */
const getMarkerIcon = (siteType, isSelected) => {
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
    <div class="custom-pin ${isSelected ? 'selected' : ''}" style="--marker-color: ${color}">
      ${iconSvg}
    </div>
  `

  return L.divIcon({
    html: html,
    className: 'custom-pin-wrapper',
    iconSize: [32, 32],
    iconAnchor: [16, 32]
  })
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
 */
export default function MapView({ 
  sites, 
  selectedSite, 
  onSiteClick, 
  onBoundsChange, 
  onZoomChange, 
  currentZoom, 
  minZoomGate 
}) {
  const [isDarkMode, setIsDarkMode] = useState(
    window.matchMedia('(prefers-color-scheme: dark)').matches
  )

  // Listen to OS theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = (e) => setIsDarkMode(e.matches)
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // CartoDB Tile Providers
  const darkTiles = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
  const lightTiles = 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
  const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'

  return (
    <>
      <TileLayer
        url={isDarkMode ? darkTiles : lightTiles}
        attribution={attribution}
      />
      
      <MapEventsHandler 
        onBoundsChange={onBoundsChange} 
        onZoomChange={onZoomChange} 
        minZoomGate={minZoomGate} 
      />

      {currentZoom >= minZoomGate && sites.map((site) => {
        // Check if site has valid coordinates
        // DRF-GIS GeoJSON output has geometry.coordinates as [lng, lat]
        if (!site.geometry || !site.geometry.coordinates) return null
        const [lng, lat] = site.geometry.coordinates
        const isSelected = selectedSite && selectedSite.id === site.id

        return (
          <Marker
            key={site.id}
            position={[lat, lng]}
            icon={getMarkerIcon(site.properties.site_type, isSelected)}
            eventHandlers={{
              click: () => {
                // Return details as flat properties + geometry structure
                onSiteClick({
                  id: site.id,
                  ...site.properties,
                  coordinates: [lat, lng]
                })
              }
            }}
          />
        )
      })}
    </>
  )
}
