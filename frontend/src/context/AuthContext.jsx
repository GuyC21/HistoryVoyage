import React, { createContext, useContext, useState, useEffect } from 'react'
import { supabase } from '~/services/supabase'
import { backendApi } from '~/services/api'

const AuthContext = createContext(null)

/**
 * Provider component that manages global authentication state.
 * 
 * Listens for Supabase auth state changes, manages the active session,
 * and automatically fetches the synchronized Django user profile when authenticated.
 * 
 * @param {Object} props - Component properties.
 * @param {React.ReactNode} props.children - Child components that require access to auth state.
 * @returns {JSX.Element} The context provider wrapping its children.
 */
export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [session, setSession] = useState(null)
  const [djangoUser, setDjangoUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch the synced Django user profile using the active token
  const fetchDjangoProfile = async () => {
    try {
      const profile = await backendApi.fetchCurrentUser()
      setDjangoUser(profile)
      return profile
    } catch (err) {
      console.error('Failed to sync/fetch Django user profile:', err)
      setDjangoUser(null)
      return null
    }
  }

  useEffect(() => {
    let mounted = true

    // 1. Get initial session
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      if (!mounted) return
      
      setSession(initialSession)
      setUser(initialSession?.user ?? null)
      
      if (initialSession) {
        await fetchDjangoProfile()
      }
      setLoading(false)
    })

    // 2. Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, currentSession) => {
      if (!mounted) return

      setSession(currentSession)
      setUser(currentSession?.user ?? null)
      
      if (currentSession) {
        await fetchDjangoProfile()
      } else {
        setDjangoUser(null)
      }
      setLoading(false)
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    })
    if (error) throw error
    return data
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    if (error) throw error
    return data
  }

  const signOut = async () => {
    const { error } = await supabase.auth.signOut()
    if (error) throw error
  }

  const value = {
    user,
    session,
    djangoUser,
    loading,
    signUp,
    signIn,
    signOut,
    refreshProfile: fetchDjangoProfile
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/**
 * Custom hook to access the authentication context.
 * 
 * @returns {Object} Authentication state and methods.
 * @property {Object|null} user - The active Supabase user object.
 * @property {Object|null} session - The active Supabase session.
 * @property {Object|null} djangoUser - The synchronized Django user profile.
 * @property {boolean} loading - True if auth state is still initializing.
 * @property {Function} signUp - Method to register a new user.
 * @property {Function} signIn - Method to log in an existing user.
 * @property {Function} signOut - Method to log out the current user.
 * @property {Function} refreshProfile - Method to manually re-fetch the Django user profile.
 * @throws {Error} If called outside of an AuthProvider.
 */
export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
