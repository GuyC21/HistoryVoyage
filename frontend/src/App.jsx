import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '~/context/AuthContext'
import { VoyageProvider } from '~/context/VoyageContext'
import Layout from '~/components/Layout'
import Home from '~/pages/Home'
import MapExplorer from '~/pages/MapExplorer'
import Dashboard from '~/pages/Dashboard/Dashboard'
import Login from '~/pages/Auth/Login'
import Signup from '~/pages/Auth/Signup'
import Settings from '~/pages/Settings/Settings'
import ProtectedRoute from '~/components/ProtectedRoute'

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
        </BrowserRouter>
      </VoyageProvider>
    </AuthProvider>
  )
}

export default App
