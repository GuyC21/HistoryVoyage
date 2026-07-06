import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '~/context/AuthContext'
import { useVoyage } from '~/context/VoyageContext'
import heroBg from '~/assets/hero_bg.png'
import styles from './Dashboard.module.css'

export default function Dashboard() {
  const { djangoUser, loading: authLoading } = useAuth()
  const { voyages, loading: voyageLoading, createVoyage, deleteVoyage, setActiveVoyage } = useVoyage()
  const navigate = useNavigate()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (authLoading || voyageLoading) {
    return (
      <div className={styles.dashboardContainer} style={{ justifyContent: 'center', alignItems: 'center' }}>
        <img src={heroBg} alt="Ancient ruins under starry night" className={styles.heroBg} />
        <div className={styles.heroOverlay}></div>
        <div className="spinner" style={{ zIndex: 10 }}></div>
      </div>
    )
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!newTitle.trim()) return
    setIsSubmitting(true)
    try {
      const voyage = await createVoyage(newTitle)
      setActiveVoyage(voyage)
      navigate('/explore')
    } catch (err) {
      console.error(err)
    } finally {
      setIsSubmitting(false)
      setIsModalOpen(false)
      setNewTitle('')
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
      <img src={heroBg} alt="Ancient ruins under starry night" className={styles.heroBg} />
      <div className={styles.heroOverlay}></div>

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
        <div className={styles.modalOverlay} onClick={() => !isSubmitting && setIsModalOpen(false)}>
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
              <div className={styles.modalActions}>
                <button 
                  type="button" 
                  className={styles.btnCancel} 
                  onClick={() => setIsModalOpen(false)}
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
