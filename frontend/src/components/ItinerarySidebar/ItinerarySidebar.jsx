import React, { useState, useEffect } from 'react'
import { useVoyage } from '~/context/VoyageContext'
import styles from './ItinerarySidebar.module.css'

export default function ItinerarySidebar({ isOpen, onClose, onToast, mapInstance, onSelectSite }) {
  const { activeVoyage, removeSiteFromVoyage, reorderStops } = useVoyage()
  const [localStops, setLocalStops] = useState([])
  const [draggedIndex, setDraggedIndex] = useState(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // Sync local stops state when activeVoyage stops change
  useEffect(() => {
    if (activeVoyage?.stops) {
      setLocalStops([...activeVoyage.stops].sort((a, b) => a.orderIndex - b.orderIndex))
    } else {
      setLocalStops([])
    }
  }, [activeVoyage])

  if (!activeVoyage) return null

  // Handle Drag Start
  const handleDragStart = (e, index) => {
    e.dataTransfer.effectAllowed = 'move'
    setDraggedIndex(index)
  }

  // Handle Drag Enter (shuffling in real-time)
  const handleDragEnter = (index) => {
    if (draggedIndex === null || draggedIndex === index) return
    const listCopy = [...localStops]
    const draggedItem = listCopy[draggedIndex]
    listCopy.splice(draggedIndex, 1)
    listCopy.splice(index, 0, draggedItem)
    setLocalStops(listCopy)
    setDraggedIndex(index)
  }

  // Handle Drag End and trigger persistence API
  const handleDragEnd = async () => {
    setDraggedIndex(null)
    await persistOrder()
  }

  // Swap stops using buttons (arrows fallback for mobile)
  const handleMoveStop = async (index, direction) => {
    if (isUpdating) return
    const targetIndex = index + direction
    if (targetIndex < 0 || targetIndex >= localStops.length) return

    const listCopy = [...localStops]
    const temp = listCopy[index]
    listCopy[index] = listCopy[targetIndex]
    listCopy[targetIndex] = temp

    setLocalStops(listCopy)
    await persistOrder(listCopy)
  }

  // Sync local order back to the API
  const persistOrder = async (listToPersist = localStops) => {
    try {
      setIsUpdating(true)
      const stopIds = listToPersist.map(s => s.id)
      await reorderStops(activeVoyage.id, stopIds)
      onToast?.('Itinerary reordered successfully')
    } catch (err) {
      console.error('Failed to save order:', err)
      onToast?.('Failed to save stop order')
      // Revert local order to backend state
      if (activeVoyage?.stops) {
        setLocalStops([...activeVoyage.stops].sort((a, b) => a.orderIndex - b.orderIndex))
      }
    } finally {
      setIsUpdating(false)
    }
  }

  const handleStopClick = (stop) => {
    const details = stop.siteDetails
    if (details && details.coordinates && mapInstance) {
      const [lat, lng] = details.coordinates
      // Open Site Drawer
      onSelectSite({
        id: details.id,
        name: details.name,
        englishName: details.englishName,
        site_type: details.siteType,
        osmType: details.osmType,
        wikidata: details.wikidata,
        country: details.country,
        coordinates: [lat, lng]
      })
    }
  }

  const handleDeleteStop = async (e, stop) => {
    e.stopPropagation()
    if (window.confirm(`Remove ${stop.siteDetails?.name || 'stop'} from itinerary?`)) {
      try {
        await removeSiteFromVoyage(activeVoyage.id, stop.siteId)
        onToast?.('Stop removed from itinerary')
      } catch (err) {
        console.error('Delete stop failed', err)
      }
    }
  }

  return (
    <div className={`${styles.sidebarContainer} ${isOpen ? styles.open : ''}`}>
      <div className={styles.sidebarHeader}>
        <h2>Voyage Stops</h2>
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close itinerary">
          &times;
        </button>
      </div>

      <div className={styles.sidebarContent}>
        {localStops.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No stops added yet.</p>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              Search and select historical sites on the map, then add them to plan your journey!
            </p>
          </div>
        ) : (
          <ul className={styles.stopsList}>
            {localStops.map((stop, index) => {
              const details = stop.siteDetails
              if (!details) return null

              return (
                <li
                  key={stop.id}
                  draggable="true"
                  onDragStart={(e) => handleDragStart(e, index)}
                  onDragOver={(e) => e.preventDefault()}
                  onDragEnter={() => handleDragEnter(index)}
                  onDragEnd={handleDragEnd}
                  className={`${styles.stopItem} ${draggedIndex === index ? styles.dragging : ''}`}
                  onClick={() => handleStopClick(stop)}
                >
                  {/* Drag Handle */}
                  <div className={styles.dragHandle} title="Drag to reorder">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="4" y1="9" x2="20" y2="9" />
                      <line x1="4" y1="15" x2="20" y2="15" />
                    </svg>
                  </div>

                  {/* Stop Information */}
                  <div className={styles.stopInfo}>
                    <span className={styles.stopIndex}>{index + 1}</span>
                    <span className={styles.stopName}>{details.englishName || details.name}</span>
                  </div>

                  {/* Reorder & Action Controls */}
                  <div className={styles.actionControls}>
                    {/* Mobile Reordering Arrows */}
                    <div className={styles.arrowControls}>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveStop(index, -1) }}
                        disabled={index === 0 || isUpdating}
                        className={styles.arrowBtn}
                        title="Move Up"
                        aria-label="Move stop up"
                      >
                        ▲
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMoveStop(index, 1) }}
                        disabled={index === localStops.length - 1 || isUpdating}
                        className={styles.arrowBtn}
                        title="Move Down"
                        aria-label="Move stop down"
                      >
                        ▼
                      </button>
                    </div>

                    {/* Trash Button */}
                    <button
                      onClick={(e) => handleDeleteStop(e, stop)}
                      className={styles.deleteBtn}
                      title="Remove Stop"
                      aria-label="Remove stop from itinerary"
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
