import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { backendApi } from '~/services/api'
import { useAuth } from '~/context/AuthContext'

const VoyageContext = createContext(null)

/**
 * Provider component that manages global voyage state.
 * 
 * Handles fetching the user's voyages, maintaining the active voyage context,
 * and toggling the map view between "All Sites" and "Voyage Only".
 */
export function VoyageProvider({ children }) {
  const { session } = useAuth()
  
  const [voyages, setVoyages] = useState([])
  const [activeVoyage, setActiveVoyageState] = useState(null)
  const [isVoyageOnlyView, setIsVoyageOnlyView] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Fetch all voyages for the current user
  const fetchVoyages = useCallback(async () => {
    if (!session) return
    setLoading(true)
    setError(null)
    try {
      const data = await backendApi.fetchVoyages()
      setVoyages(data)
      
      // If we have an active voyage set in state, let's update it with the latest data
      setActiveVoyageState(prev => {
        if (!prev) return null
        return data.find(v => v.id === prev.id) || null
      })
    } catch (err) {
      console.error('Failed to fetch voyages:', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [session])

  // Initial fetch when session is available
  useEffect(() => {
    if (session) {
      fetchVoyages()
    } else {
      setVoyages([])
      setActiveVoyageState(null)
      setIsVoyageOnlyView(false)
    }
  }, [session, fetchVoyages])

  // Try to restore active voyage from session storage on mount
  useEffect(() => {
    const savedVoyageId = sessionStorage.getItem('activeVoyageId')
    if (savedVoyageId && voyages.length > 0 && !activeVoyage) {
      const voyage = voyages.find(v => v.id === parseInt(savedVoyageId))
      if (voyage) {
        setActiveVoyageState(voyage)
      }
    }
  }, [voyages, activeVoyage])

  const createVoyage = async (title, focusCountryId) => {
    try {
      const newVoyage = await backendApi.createVoyage(title, focusCountryId)
      setVoyages(prev => [...prev, newVoyage])
      return newVoyage
    } catch (err) {
      console.error('Failed to create voyage:', err)
      throw err
    }
  }

  const deleteVoyage = async (voyageId) => {
    try {
      await backendApi.deleteVoyage(voyageId)
      setVoyages(prev => prev.filter(v => v.id !== voyageId))
      if (activeVoyage?.id === voyageId) {
        setActiveVoyageState(null)
        setIsVoyageOnlyView(false)
        sessionStorage.removeItem('activeVoyageId')
      }
    } catch (err) {
      console.error('Failed to delete voyage:', err)
      throw err
    }
  }

  const setActiveVoyage = (voyage) => {
    setActiveVoyageState(voyage)
    if (voyage) {
      sessionStorage.setItem('activeVoyageId', voyage.id.toString())
    } else {
      sessionStorage.removeItem('activeVoyageId')
      setIsVoyageOnlyView(false) // Reset filter if deselecting
    }
  }

  const toggleVoyageView = () => {
    setIsVoyageOnlyView(prev => !prev)
  }

  const addSiteToVoyage = async (voyageId, siteId) => {
    try {
      const updatedVoyage = await backendApi.addSiteToVoyage(voyageId, siteId)
      
      // Update voyages array
      setVoyages(prev => prev.map(v => v.id === voyageId ? updatedVoyage : v))
      
      // Update active voyage if it's the current one
      if (activeVoyage && activeVoyage.id === voyageId) {
        setActiveVoyageState(updatedVoyage)
      }
      return updatedVoyage
    } catch (err) {
      console.error('Failed to add site to voyage:', err)
      throw err
    }
  }

  const removeSiteFromVoyage = async (voyageId, siteId) => {
    try {
      const updatedVoyage = await backendApi.removeSiteFromVoyage(voyageId, siteId)
      
      // Update voyages array
      setVoyages(prev => prev.map(v => v.id === voyageId ? updatedVoyage : v))
      
      // Update active voyage if it's the current one
      if (activeVoyage && activeVoyage.id === voyageId) {
        setActiveVoyageState(updatedVoyage)
      }
      return updatedVoyage
    } catch (err) {
      console.error('Failed to remove site from voyage:', err)
      throw err
    }
  }

  const reorderStops = async (voyageId, stopIds) => {
    try {
      const updatedVoyage = await backendApi.reorderVoyageStops(voyageId, stopIds)
      
      // Update voyages array
      setVoyages(prev => prev.map(v => v.id === voyageId ? updatedVoyage : v))
      
      // Update active voyage if it's the current one
      if (activeVoyage && activeVoyage.id === voyageId) {
        setActiveVoyageState(updatedVoyage)
      }
      return updatedVoyage
    } catch (err) {
      console.error('Failed to reorder stops in voyage:', err)
      throw err
    }
  }

  const value = {
    voyages,
    activeVoyage,
    isVoyageOnlyView,
    loading,
    error,
    fetchVoyages,
    createVoyage,
    deleteVoyage,
    setActiveVoyage,
    toggleVoyageView,
    addSiteToVoyage,
    removeSiteFromVoyage,
    reorderStops
  }

  return (
    <VoyageContext.Provider value={value}>
      {children}
    </VoyageContext.Provider>
  )
}

/**
 * Custom hook to access the voyage context.
 * 
 * @returns {Object} Voyage state and methods.
 */
export function useVoyage() {
  const context = useContext(VoyageContext)
  if (!context) {
    throw new Error('useVoyage must be used within a VoyageProvider')
  }
  return context
}
