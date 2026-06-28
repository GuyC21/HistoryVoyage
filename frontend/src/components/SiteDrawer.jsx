import React from 'react'

export default function SiteDrawer({ 
  site, 
  isOpen, 
  onClose, 
  isLoading, 
  languageMode, 
  setLanguageMode 
}) {
  if (!isOpen) return null

  // Helper to get category emojis and colors
  const getCategoryMeta = (type) => {
    switch (type) {
      case 'castle':
        return { label: 'Castle', emoji: '🏰', color: 'var(--color-castle)' }
      case 'ruins':
        return { label: 'Ruins', emoji: '🏚️', color: 'var(--color-ruins)' }
      case 'holy_site':
        return { label: 'Holy Site', emoji: '⛪', color: 'var(--color-holy)' }
      case 'monument':
        return { label: 'Monument', emoji: '🗽', color: 'var(--color-monument)' }
      case 'archaeological':
        return { label: 'Archaeological Site', emoji: '🏺', color: 'var(--color-archaeological)' }
      default:
        return { label: 'Historical Site', emoji: '🗺️', color: 'var(--color-other)' }
    }
  }

  const category = site ? getCategoryMeta(site.site_type) : null

  // Determine title and description to show based on languageMode
  let displayName = ''
  let displayDescription = ''
  let showNativeSubLabel = false
  let isFallback = false

  if (site) {
    if (languageMode === 'en') {
      displayName = site.englishName || site.name
      displayDescription = site.englishDescription || site.description
      
      // If we are showing English but it fell back to the native name
      if (!site.englishName) {
        isFallback = true
      }
      
      // If we are showing the translated name, and it is different from native name, show native sub-label
      if (site.englishName && site.englishName.toLowerCase() !== site.name.toLowerCase()) {
        showNativeSubLabel = true
      }
    } else {
      displayName = site.name
      displayDescription = site.description
    }
  }

  return (
    <div 
      className={`site-drawer ${isOpen ? 'open' : ''}`}
      style={{ '--marker-color': category?.color }}
    >
      <button className="drawer-close-btn" onClick={onClose} aria-label="Close details">
        &times;
      </button>

      {isLoading ? (
        <div className="drawer-content-loading">
          <div className="skeleton skeleton-tag"></div>
          <div className="skeleton skeleton-title"></div>
          <div className="skeleton skeleton-text" style={{ width: '90%' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '95%' }}></div>
          <div className="skeleton skeleton-text" style={{ width: '80%' }}></div>
          <div className="drawer-divider"></div>
          <div className="skeleton skeleton-text" style={{ width: '50%' }}></div>
        </div>
      ) : site ? (
        <>
          <div className="drawer-header">
            <span className="drawer-tag">
              {category.emoji} {category.label}
            </span>
            
            <h2 className="drawer-title">
              {displayName}
              {isFallback && languageMode === 'en' && (
                <span className="fallback-indicator" title="No English translation available, showing local name">
                  Local Name
                </span>
              )}
            </h2>

            {showNativeSubLabel && (
              <div className="drawer-native-name" title="Native local name">
                Native: {site.name}
              </div>
            )}

            <div className="drawer-language-row">
              <div className="drawer-meta">
                <span>📍 {site.country}</span>
                {site.wikidata && <span>🆔 {site.wikidata}</span>}
              </div>

              {/* Inline Language Selector */}
              {site.wikidata && (
                <div className="drawer-language-selector">
                  <button
                    className={`drawer-lang-btn ${languageMode === 'en' ? 'active' : ''}`}
                    onClick={() => setLanguageMode('en')}
                  >
                    EN
                  </button>
                  <button
                    className={`drawer-lang-btn ${languageMode === 'local' ? 'active' : ''}`}
                    onClick={() => setLanguageMode('local')}
                  >
                    Local
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="drawer-divider"></div>

          <div className="drawer-body">
            {displayDescription ? (
              <p>{displayDescription}</p>
            ) : (
              <p>
                {languageMode === 'en' 
                  ? 'No English description available for this historical site. You can explore more about it on Wikidata or search for its historical context in the region.'
                  : 'אין תיאור זמין או non è disponibile alcuna descrizione per questo sito storico.'}
              </p>
            )}
          </div>

          {site.wikidata && (
            <a 
              href={`https://www.wikidata.org/wiki/${site.wikidata}`} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="wikipedia-btn"
            >
              📚 Explore on Wikidata
            </a>
          )}
        </>
      ) : (
        <p>Select a historical site to view details.</p>
      )}
    </div>
  )
}
