import React from 'react'

export default function SiteDrawer({ site, isOpen, onClose, isLoading }) {
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
            <h2 className="drawer-title">{site.name}</h2>
            <div className="drawer-meta">
              <span>📍 {site.country}</span>
              {site.wikidata && (
                <span>🆔 {site.wikidata}</span>
              )}
            </div>
          </div>

          <div className="drawer-divider"></div>

          <div className="drawer-body">
            {site.description ? (
              <p>{site.description}</p>
            ) : (
              <p>No description available for this historical site. You can explore more about it on Wikidata or search for its historical context in the region.</p>
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
