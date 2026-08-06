import { useState, useEffect } from 'react'
import { backendApi } from '~/services/api'

/**
 * Custom hook to manage inline Wikidata ID editing for a historical site.
 * 
 * @param {Object|null} site - Current site object
 * @param {Function} [onToast] - Toast notification callback
 * @param {Function} [onRefreshDetails] - Callback to refresh site details in UI
 * @returns {Object} { isEditingWikidata, editWikidataVal, setEditWikidataVal, updatingWikidata, handleSaveWikidata, toggleEditing }
 */
export function useWikidataEditor(site, onToast, onRefreshDetails) {
  const [isEditingWikidata, setIsEditingWikidata] = useState(false)
  const [editWikidataVal, setEditWikidataVal] = useState('')
  const [updatingWikidata, setUpdatingWikidata] = useState(false)

  // Sync edit input value when selected site changes
  useEffect(() => {
    if (site) {
      setEditWikidataVal(site.wikidata || '')
    }
    setIsEditingWikidata(false)
  }, [site])

  const toggleEditing = () => {
    setIsEditingWikidata((prev) => !prev)
  }

  const handleSaveWikidata = async () => {
    if (!site) return

    let cleanVal = editWikidataVal.trim()
    if (cleanVal) {
      if (!cleanVal.toUpperCase().startsWith('Q') || !/^\d+$/.test(cleanVal.slice(1))) {
        if (onToast) {
          onToast('Invalid Wikidata ID. Must start with Q followed by numbers.', 'error')
        } else {
          alert('Invalid Wikidata ID. Must start with Q followed by numbers.')
        }
        return
      }
      cleanVal = cleanVal.toUpperCase()
    } else {
      cleanVal = null
    }

    setUpdatingWikidata(true)
    try {
      await backendApi.updateSiteWikidata(site.id, cleanVal)
      if (onToast) {
        onToast('Wikidata ID updated successfully!', 'success')
      }
      setIsEditingWikidata(false)

      if (onRefreshDetails) {
        onRefreshDetails({
          ...site,
          wikidata: cleanVal,
          englishName: null,
          englishDescription: null
        })
      }
    } catch (err) {
      console.error(err)
      if (onToast) {
        onToast(err.message || 'Failed to update Wikidata ID', 'error')
      }
    } finally {
      setUpdatingWikidata(false)
    }
  }

  return {
    isEditingWikidata,
    editWikidataVal,
    setEditWikidataVal,
    updatingWikidata,
    handleSaveWikidata,
    toggleEditing
  }
}
