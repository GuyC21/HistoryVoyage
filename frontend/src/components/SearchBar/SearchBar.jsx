import React, { useState, useEffect, useRef } from 'react'
import styles from './SearchBar.module.css'

/**
 * SearchBar Component
 * Renders an autocomplete search bar for historical sites.
 * Fetches suggestions from the backend API, debounces input, and manages keyboard accessibility.
 *
 * @param {Object} props
 * @param {Function} props.onSelectSite - Callback when a site is selected: (siteFeature) => void
 */
export default function SearchBar({ onSelectSite }) {
  /** @type {string} Binding value for the input field. */
  const [query, setQuery] = useState('')

  /** @type {Array<Object>} List of matched suggestions returned by the API. */
  const [suggestions, setSuggestions] = useState([])

  /** @type {boolean} Visual load indicator. */
  const [loading, setLoading] = useState(false)

  /** @type {boolean} Dropdown overlay open status. */
  const [isOpen, setIsOpen] = useState(false)

  /** @type {number} The current keyboard highlighted active index in the dropdown list. */
  const [activeIndex, setActiveIndex] = useState(-1)
  
  /** @type {React.RefObject} Ref pointing to the autocomplete container elements. */
  const containerRef = useRef(null)

  /** @type {React.MutableRefObject<number|null>} Ref caching the debounce timer handle. */
  const debounceRef = useRef(null)

  /** @type {React.MutableRefObject<AbortController|null>} Ref tracking active AJAX requests. */
  const abortControllerRef = useRef(null)

  const API_BASE = window.location.hostname === '127.0.0.1'
    ? 'http://127.0.0.1:8000'
    : 'http://localhost:8000'

  /**
   * Helper utility returning matching emojis for category ID strings.
   * 
   * @param {string} siteType - Category code.
   * @returns {string} The representative emoji.
   */
  const getCategoryEmoji = (siteType) => {
    switch (siteType) {
      case 'castle': return '🏰'
      case 'ruins': return '🏚️'
      case 'holy_site': return '⛪'
      case 'monument': return '🗽'
      case 'archaeological': return '🏺'
      default: return '📍'
    }
  }

  // Handle outside clicks to close the dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  // Clean up timers & fetches on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortControllerRef.current) abortControllerRef.current.abort()
    }
  }, [])

  /**
   * Queries autocomplete terms from the server, aborting pending operations.
   * 
   * @param {string} searchVal - The search text query input.
   */
  const fetchSuggestions = (searchVal) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }

    if (!searchVal.trim()) {
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    const controller = new AbortController()
    abortControllerRef.current = controller

    fetch(`${API_BASE}/api/sites/?search=${encodeURIComponent(searchVal)}`, {
      signal: controller.signal
    })
      .then((res) => {
        if (!res.ok) throw new Error('Search request failed')
        return res.json()
      })
      .then((data) => {
        setSuggestions(data.features || [])
        setIsOpen(true)
        setActiveIndex(-1)
      })
      .catch((err) => {
        if (err.name !== 'AbortError') {
          console.error('Error fetching suggestions:', err)
          setSuggestions([])
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      })
  }

  const handleInputChange = (e) => {
    const value = e.target.value
    setQuery(value)

    if (debounceRef.current) {
      clearTimeout(debounceRef.current)
    }

    if (!value.trim()) {
      setSuggestions([])
      setIsOpen(false)
      setLoading(false)
      return
    }

    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value)
    }, 300)
  }

  const handleSelect = (site) => {
    onSelectSite(site)
    setQuery('')
    setSuggestions([])
    setIsOpen(false)
    setActiveIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1 >= suggestions.length ? 0 : prev + 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 < 0 ? suggestions.length - 1 : prev - 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        handleSelect(suggestions[activeIndex])
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
    }
  }

  // Scroll active suggestion into view automatically
  const dropdownRef = useRef(null)
  useEffect(() => {
    if (activeIndex >= 0 && dropdownRef.current) {
      const activeEl = dropdownRef.current.children[activeIndex]
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' })
      }
    }
  }, [activeIndex])

  return (
    <div className={styles.searchContainer} ref={containerRef}>
      <div className={styles.searchInputWrapper}>
        <span className={styles.searchIcon}>🔍</span>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search historical sites..."
          value={query}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true)
          }}
        />
        {loading && <div className={styles.searchSpinner}></div>}
        {!loading && query && (
          <button
            className={styles.searchClearBtn}
            onClick={() => {
              setQuery('')
              setSuggestions([])
              setIsOpen(false)
              setActiveIndex(-1)
            }}
            aria-label="Clear search"
          >
            ✖
          </button>
        )}
      </div>

      {isOpen && (
        <ul className={styles.searchSuggestions} ref={dropdownRef}>
          {suggestions.length > 0 ? (
            suggestions.map((site, index) => {
              const name = site.properties.englishName || site.properties.name
              const country = site.properties.country
              const type = site.properties.site_type
              const emoji = getCategoryEmoji(type)
              const hasBoundary = site.properties.osmType === 'way' || site.properties.osmType === 'relation'

              return (
                <li
                  key={site.id}
                  className={`${styles.searchSuggestionItem} ${
                    index === activeIndex ? styles.active : ''
                  }`}
                  onClick={() => handleSelect(site)}
                >
                  <span className={styles.suggestionEmoji}>{emoji}</span>
                  <div className={styles.suggestionDetails}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%' }}>
                      <span className={styles.suggestionName}>{name}</span>
                      {hasBoundary && (
                        <span className={styles.suggestionBoundaryBadge} title="Has boundary layout">
                          Layout
                        </span>
                      )}
                    </div>
                    <span className={styles.suggestionCountry}>{country}</span>
                  </div>
                </li>
              )
            })
          ) : (
            <li className={styles.searchNoSuggestions}>No sites found</li>
          )}
        </ul>
      )}
    </div>
  )
}
