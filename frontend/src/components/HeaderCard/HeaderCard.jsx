import React, { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import SearchBar from '~/components/SearchBar'
import { useAuth } from '~/context/AuthContext'
import styles from './HeaderCard.module.css'

/**
 * HeaderCard Component (Refactored Integrated Filter Bar)
 * Displays a single, ultra-sleek command bar containing:
 * - Brand logo pill
 * - Search autocomplete bar
 * - Category Filter Dropdown button ("Category ▾") with popover grid
 * - Interface language toggle (EN / Local)
 * - Sub-row containing compact Active Voyage badge & User Profile menu pill
 */
export default function HeaderCard({
  languageMode,
  setLanguageMode,
  zoom,
  minZoomGate,
  visibleSitesCount,
  activeFilter,
  setActiveFilter,
  categories,
  onSelectSite,
  activeVoyage,
  isVoyageOnlyView,
  toggleVoyageView,
  isItineraryOpen,
  onToggleItinerary
}) {
  const { user, djangoUser, signOut } = useAuth()
  const navigate = useNavigate()

  const [isCategoryMenuOpen, setIsCategoryMenuOpen] = useState(false)
  const [isVoyageMenuOpen, setIsVoyageMenuOpen] = useState(false)
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false)

  const filterRef = useRef(null)
  const voyageRef = useRef(null)
  const userRef = useRef(null)

  const activeCategoryObj = categories.find(c => c.id === activeFilter) || { label: 'All', emoji: '🌍' }

  const getUserDisplayName = () => {
    if (djangoUser && djangoUser.first_name) {
      return djangoUser.first_name
    }
    return user?.email?.split('@')[0] || 'User'
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      navigate('/')
    } catch (err) {
      console.error('Error logging out:', err)
    }
  }

  // Close filter & user popovers on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (filterRef.current && !filterRef.current.contains(e.target)) {
        setIsCategoryMenuOpen(false)
      }
      if (voyageRef.current && !voyageRef.current.contains(e.target)) {
        setIsVoyageMenuOpen(false)
      }
      if (userRef.current && !userRef.current.contains(e.target)) {
        setIsUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [])

  return (
    <header className={`${styles.nativeHeaderWrapper} ${isItineraryOpen ? styles.shifted : ''}`}>
      {/* 1. Integrated Single Command Pill Search Bar */}
      <div className={styles.commandBar}>
        {/* Brand Logo Pill */}
        <div className={styles.brandPill} title="HistoryVoyage Map Explorer">
          <span className={styles.brandEmoji}>🗺️</span>
          <span className={styles.brandTitle}>HistoryVoyage</span>
        </div>

        {/* Embedded SearchBar */}
        <div className={styles.searchFlexWrapper}>
          <SearchBar onSelectSite={onSelectSite} />
        </div>

        {/* Integrated Category Filter Button & Popover */}
        <div className={styles.filterDropdownWrapper} ref={filterRef}>
          <button
            type="button"
            className={`${styles.filterBtnPill} ${activeFilter !== 'all' ? styles.active : ''}`}
            onClick={() => setIsCategoryMenuOpen(prev => !prev)}
            title="Filter by category"
          >
            <span>{activeCategoryObj.emoji}</span>
            <span className={styles.filterBtnLabel}>
              {activeFilter === 'all' ? 'Category' : activeCategoryObj.label}
            </span>
            <span className={styles.chevron}>{isCategoryMenuOpen ? '▲' : '▼'}</span>
          </button>

          {/* Category Popover Grid */}
          {isCategoryMenuOpen && (
            <div className={styles.categoryPopoverMenu}>
              <div className={styles.popoverHeader}>
                <span>Filter Sites</span>
                <span className={styles.popoverCountBadge}>
                  {zoom < minZoomGate ? 'Zoom In' : `${visibleSitesCount} visible`}
                </span>
              </div>

              <div className={styles.categoryGrid}>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`${styles.categoryGridChip} ${activeFilter === cat.id ? styles.active : ''}`}
                    onClick={() => {
                      setActiveFilter(cat.id)
                      setIsCategoryMenuOpen(false)
                    }}
                  >
                    <span className={styles.chipEmoji}>{cat.emoji}</span>
                    <span className={styles.chipLabel}>{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Language Toggle Pill */}
        <div className={`${styles.languagePill} ${styles.desktopOnly}`}>
          <button
            type="button"
            className={`${styles.langBtn} ${languageMode === 'en' ? styles.active : ''}`}
            onClick={() => setLanguageMode('en')}
            title="English Mode"
          >
            EN
          </button>
          <button
            type="button"
            className={`${styles.langBtn} ${languageMode === 'local' ? styles.active : ''}`}
            onClick={() => setLanguageMode('local')}
            title="Local Language Mode"
          >
            Local
          </button>
        </div>
      </div>

      {/* 2. Secondary Sub-Row for Mobile Language, Active Voyage & User Profile */}
      <div className={styles.subRow}>
        {/* Mobile Language Toggle Pill */}
        <div className={`${styles.languagePill} ${styles.mobileOnly}`}>
          <button
            type="button"
            className={`${styles.langBtn} ${languageMode === 'en' ? styles.active : ''}`}
            onClick={() => setLanguageMode('en')}
            title="English Mode"
          >
            EN
          </button>
          <button
            type="button"
            className={`${styles.langBtn} ${languageMode === 'local' ? styles.active : ''}`}
            onClick={() => setLanguageMode('local')}
            title="Local Language Mode"
          >
            Local
          </button>
        </div>

        {/* Compact Active Voyage Context Badge */}
        {activeVoyage && (
          <div className={styles.voyageBadgeWrapper} ref={voyageRef}>
            <button
              type="button"
              className={styles.voyageBadgePill}
              onClick={() => setIsVoyageMenuOpen(prev => !prev)}
              title="Active Voyage Controls"
            >
              <span className={styles.voyageIcon}>📍</span>
              <span className={styles.voyageTitleText}>
                Voyage: <strong>{activeVoyage.title}</strong> ({activeVoyage.stops?.length || 0} stops)
              </span>
              <span className={styles.voyageChevron}>{isVoyageMenuOpen ? '▲' : '▼'}</span>
            </button>

            {/* Expanded Popover Menu for Voyage Actions */}
            {isVoyageMenuOpen && (
              <div className={styles.voyagePopoverMenu}>
                <div className={styles.voyagePopoverHeader}>
                  Voyage Mode
                </div>
                <div className={styles.voyageSegmentGrid}>
                  <button
                    type="button"
                    onClick={() => {
                      if (isVoyageOnlyView) toggleVoyageView()
                    }}
                    className={`${styles.voyageSegmentBtn} ${!isVoyageOnlyView ? styles.active : ''}`}
                  >
                    🌍 Show All
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isVoyageOnlyView) toggleVoyageView()
                    }}
                    className={`${styles.voyageSegmentBtn} ${isVoyageOnlyView ? styles.active : ''}`}
                  >
                    🎯 Voyage Only
                  </button>
                </div>

                <button
                  type="button"
                  className={styles.itineraryActionBtn}
                  onClick={() => {
                    onToggleItinerary()
                    setIsVoyageMenuOpen(false)
                  }}
                >
                  📋 {isItineraryOpen ? 'Hide Itinerary' : 'View Itinerary Stops'}
                </button>
              </div>
            )}
          </div>
        )}

        {/* Compact User Profile Menu Pill next to Voyage (Mobile Only) */}
        {user ? (
          <div className={`${styles.userBadgeWrapper} ${styles.mobileOnly}`} ref={userRef}>
            <button
              type="button"
              className={styles.userBadgePill}
              onClick={() => setIsUserMenuOpen(prev => !prev)}
              title={user.email}
            >
              <span className={styles.userIcon}>👤</span>
              <span className={styles.userNameText}>{getUserDisplayName()}</span>
              <span className={styles.userChevron}>{isUserMenuOpen ? '▲' : '▼'}</span>
            </button>

            {isUserMenuOpen && (
              <div className={styles.userPopoverMenu}>
                <Link
                  to="/dashboard"
                  className={styles.userPopoverItem}
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  🗺️ Voyages
                </Link>
                <Link
                  to="/settings"
                  className={styles.userPopoverItem}
                  onClick={() => setIsUserMenuOpen(false)}
                >
                  ⚙️ Settings
                </Link>
                <div className={styles.userPopoverDivider}></div>
                <button
                  type="button"
                  className={`${styles.userPopoverItem} ${styles.btnSignout}`}
                  onClick={() => {
                    setIsUserMenuOpen(false)
                    handleSignOut()
                  }}
                >
                  🚪 Log Out
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={`${styles.authLinksGroup} ${styles.mobileOnly}`}>
            <Link to="/login" className={styles.authLinkBtn}>Log In</Link>
            <Link to="/signup" className={`${styles.authLinkBtn} ${styles.primary}`}>Sign Up</Link>
          </div>
        )}
      </div>
    </header>
  )
}
