import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from '~/context/AuthContext'
import Layout from '~/components/Layout'
import Home from '~/pages/Home'
import MapExplorer from '~/pages/MapExplorer'
import Login from '~/pages/Auth/Login'
import Signup from '~/pages/Auth/Signup'

/**
 * Root application component.
 * 
 * Provides global contexts (AuthProvider) and sets up the application's
 * routing configuration using React Router. Defines both the main app
 * layout routes and fullscreen authentication routes.
 * 
 * @returns {JSX.Element} The rendered application component.
 */
function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Main App Routes with navbar Layout */}
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/explore" element={<MapExplorer />} />
          </Route>

          {/* Fullscreen Auth Routes (no global navbar) */}
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
