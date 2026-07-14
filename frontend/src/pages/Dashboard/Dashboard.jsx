import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '~/context/AuthContext'
import { useVoyage } from '~/context/VoyageContext'
import { backendApi } from '~/services/api'
import { searchCities } from '~/services/nominatim'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { djangoUser, loading: authLoading } = useAuth()
  const { voyages, loading: voyageLoading, createVoyage, deleteVoyage, setActiveVoyage } = useVoyage()
  const navigate = useNavigate()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [countries, setCountries] = useState([])
  const [selectedCountryId, setSelectedCountryId] = useState('')

  // State for city focus selection
  const [focusCityQuery, setFocusCityQuery] = useState('')
  const [citySuggestions, setCitySuggestions] = useState([])
  const [selectedCity, setSelectedCity] = useState(null)
  const [searchingCity, setSearchingCity] = useState(false)
  const [showCityDropdown, setShowCityDropdown] = useState(false)

  useEffect(() => {
    let active = true
    const loadCountries = async () => {
      try {
        const data = await backendApi.fetchCountries()
        if (active) {
          setCountries(data)
          if (data.length > 0) {
            setSelectedCountryId(data[0].id)
          }
        }
      } catch (err) {
        console.error('Failed to fetch countries:', err)
      }
    }
    loadCountries()
    return () => {
      active = false
    }
  }, [])

  // Clear city when country changes
  useEffect(() => {
    setFocusCityQuery('')
    setSelectedCity(null)
    setCitySuggestions([])
    setShowCityDropdown(false)
  }, [selectedCountryId])

  // Debounced search for focus cities restricted to the selected country
  useEffect(() => {
    if (!focusCityQuery.trim()) {
      setCitySuggestions([])
      setShowCityDropdown(false)
      return
    }

    // Skip query if query is exactly the selected city's name
    if (selectedCity && selectedCity.name === focusCityQuery) {
      return
    }

    const selectedCountry = countries.find(c => c.id === parseInt(selectedCountryId))
    const countryCode = selectedCountry?.code || null

    const controller = new AbortController()
    setSearchingCity(true)

    const timer = setTimeout(async () => {
      try {
        const results = await searchCities(focusCityQuery, controller.signal, countryCode)
        setCitySuggestions(results)
        setShowCityDropdown(true)
      } catch (err) {
        if (err.name !== 'AbortError') {
          console.error('Failed to search cities:', err)
        }
      } finally {
        setSearchingCity(false)
      }
    }, 1000)

    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [focusCityQuery, selectedCountryId, countries, selectedCity])

  if (authLoading || voyageLoading) {
    return (
      <div className={styles.dashboardContainer} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div className="spinner" style={{ zIndex: 10 }}></div>
      </div>
    )
  }

  const handleSelectCity = (cityFeature) => {
    setSelectedCity({
      name: cityFeature.properties.name,
      lat: cityFeature.geometry.coordinates[1],
      lng: cityFeature.geometry.coordinates[0],
      bbox: cityFeature.properties.bbox
    })
    setFocusCityQuery(cityFeature.properties.name)
    setCitySuggestions([])
    setShowCityDropdown(false)
  }

  const handleCityInputChange = (val) => {
    setFocusCityQuery(val)
    setCitySuggestions([])
    setShowCityDropdown(false)
    if (!val.trim()) {
      setSelectedCity(null)
    }
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setNewTitle('')
    setFocusCityQuery('')
    setSelectedCity(null)
    setCitySuggestions([])
    setShowCityDropdown(false)
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTitle.trim() || !selectedCountryId) return
    setIsSubmitting(true)
    try {
      const voyage = await createVoyage(
        newTitle,
        selectedCountryId,
        selectedCity ? selectedCity.name : null,
        selectedCity ? selectedCity.lat : null,
        selectedCity ? selectedCity.lng : null,
        selectedCity ? selectedCity.bbox : null
      )
      setActiveVoyage(voyage)
      navigate('/explore')
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
      handleCloseModal()
    }
  }

  const handleSelectVoyage = (voyage) => {
    setActiveVoyage(voyage)
    navigate('/explore')
  }

  const handleDelete = async (e, voyageId) => {
    e.stopPropagation() // Prevent selecting the voyage
    if (window.confirm("Are you sure you want to delete this voyage?")) {
      try {
        await deleteVoyage(voyageId)
      } catch (err) {
        console.error("Delete failed", err)
      }
    }
  }

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.scrollBody}>
        <div className={styles.dashboardContent}>
          <header className={styles.header}>
            <h1>Welcome, {djangoUser?.first_name || djangoUser?.username || 'Traveler'}</h1>
            <p>Select a voyage to continue your journey or start a new one.</p>
          </header>

          <main className={styles.voyageGrid}>
            {/* Create New Card */}
            <div 
              className={`${styles.voyageCard} ${styles.createCard}`} 
              onClick={() => setIsModalOpen(true)}
            >
              <div className={styles.createIcon}>+</div>
              <div className={styles.voyageTitle}>Create New Voyage</div>
              <p className={styles.voyageMeta} style={{ justifyContent: 'center', margin: 0 }}>Start a new adventure</p>
            </div>

            {/* Existing Voyages */}
            {voyages.map(voyage => (
              <div 
                key={voyage.id} 
                className={styles.voyageCard}
                onClick={() => handleSelectVoyage(voyage)}
              >
                <h3 className={styles.voyageTitle}>{voyage.title}</h3>
                <div className={styles.voyageMeta}>
                  <span>📍 {voyage.stops?.length || 0} stops</span>
                  <span>📅 {new Date(voyage.created_at).toLocaleDateString()}</span>
                </div>
                
                <div className={styles.cardActions}>
                  <span className={styles.exploreButton}>
                    Explore →
                  </span>
                  <button 
                    className={styles.actionButton}
                    onClick={(e) => handleDelete(e, voyage.id)}
                    title="Delete Voyage"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))}
          </main>
        </div>
      </div>

      {/* Create Modal */}
      {isModalOpen && (
        <div className={styles.modalOverlay} onClick={() => !isSubmitting && handleCloseModal()}>
          <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
            <h2>Name your Voyage</h2>
            <form onSubmit={handleCreate}>
              <div className={styles.inputGroup}>
                <label htmlFor="voyageTitle">Title</label>
                <input
                  id="voyageTitle"
                  type="text"
                  placeholder="e.g. My Roman Empire Tour"
                  value={newTitle}
                  onChange={e => setNewTitle(e.target.value)}
                  autoFocus
                  required
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor="voyageCountry">Focus Country</label>
                <select
                  id="voyageCountry"
                  value={selectedCountryId}
                  onChange={e => setSelectedCountryId(e.target.value)}
                  required
                >
                  <option value="" disabled>Select a country...</option>
                  {countries.map(country => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedCountryId && (
                <div className={styles.inputGroup} style={{ position: 'relative' }}>
                  <label htmlFor="voyageCity">Focus City (Optional)</label>
                  <input
                    id="voyageCity"
                    type="text"
                    placeholder="e.g. Athens or Lakka"
                    value={focusCityQuery}
                    onChange={e => handleCityInputChange(e.target.value)}
                    autoComplete="off"
                  />
                  {searchingCity && (
                    <div style={{ position: 'absolute', right: '10px', top: '38px', fontSize: '12px', opacity: 0.6 }}>
                      ⏳
                    </div>
                  )}
                  {showCityDropdown && citySuggestions.length > 0 && (
                    <ul className={styles.suggestionsDropdown}>
                      {citySuggestions.map(city => (
                        <li 
                          key={city.id} 
                          onClick={() => handleSelectCity(city)}
                          className={styles.suggestionItem}
                        >
                          🏙️ {city.properties.display_name}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  className={styles.btnCancel} 
                  onClick={handleCloseModal}
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className={styles.btnSubmit}
                  disabled={isSubmitting || !newTitle.trim()}
                >
                  {isSubmitting ? 'Creating...' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
