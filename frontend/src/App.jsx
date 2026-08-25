import React, { Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '~/context/AuthContext'
import { VoyageProvider } from '~/context/VoyageContext'
import Layout from '~/components/Layout'
import ProtectedRoute from '~/components/ProtectedRoute'
import ReloadPrompt from '~/components/ReloadPrompt/ReloadPrompt'

// Lazy load page components
const Home = lazy(() => import('~/pages/Home'))
const MapExplorer = lazy(() => import('~/pages/MapExplorer'))
const Dashboard = lazy(() => import('~/pages/Dashboard/Dashboard'))
const Login = lazy(() => import('~/pages/Auth/Login'))
const Signup = lazy(() => import('~/pages/Auth/Signup'))
const Settings = lazy(() => import('~/pages/Settings/Settings'))

/**
 * Loading fallback component
 */
const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', width: '100vw' }}>
    <div style={{ fontFamily: 'Outfit, sans-serif', fontSize: '24px', color: 'var(--text-h)' }}>Loading...</div>
  </div>
)

/**
 * Root application component.
 * 
 * Provides global contexts and sets up routing.
 */
function App() {
  return (
    <AuthProvider>
      <VoyageProvider>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Main App Routes with navbar Layout */}
              <Route element={<Layout />}>
                <Route path="/" element={<Home />} />
                
                {/* Protected Routes */}
                <Route element={<ProtectedRoute />}>
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/explore" element={<MapExplorer />} />
                  <Route path="/settings" element={<Settings />} />
                </Route>
              </Route>

              {/* Fullscreen Auth Routes (no global navbar) */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
            </Routes>
          </Suspense>
          <ReloadPrompt />
        </BrowserRouter>
      </VoyageProvider>
    </AuthProvider>
  )
}

export default App
