import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '~/context/AuthContext'
import heroBg from '~/assets/hero_bg.png'

/**
 * ProtectedRoute Component
 * 
 * Guards private routes. If the user authentication is in progress, it renders a
 * premium full-screen loading screen. If the user is unauthenticated, it redirects
 * them to the login page. Otherwise, it renders the child components (via Outlet).
 * 
 * @returns {JSX.Element} The rendered route or redirect.
 */
export default function ProtectedRoute() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#0a0d14',
        position: 'relative',
        color: '#ffffff',
        fontFamily: 'system-ui, -apple-system, sans-serif'
      }}>
        {/* Underlay Starry Background */}
        <img 
          src={heroBg} 
          alt="Starry background loading" 
          style={{
            position: 'absolute',
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: 0.15,
            zIndex: 1
          }} 
        />
        {/* Dark Vignette Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'radial-gradient(circle, transparent 20%, #0a0d14 90%)',
          zIndex: 2
        }}></div>

        {/* Loading Content */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '24px',
          zIndex: 3,
          textAlign: 'center',
          animation: 'fadeIn 0.5s ease-out'
        }}>
          {/* Custom Large Spinning Ring */}
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: '#9d4edd', /* matching general purple accent */
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}></div>
          <div style={{
            fontSize: '1.1rem',
            letterSpacing: '0.05em',
            color: 'rgba(255, 255, 255, 0.8)',
            fontWeight: 500
          }}>
            Loading your Voyage...
          </div>
        </div>

        {/* Local Keyframe Styles */}
        <style dangerouslySetInnerHTML={{ __html: `
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
          @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}} />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
