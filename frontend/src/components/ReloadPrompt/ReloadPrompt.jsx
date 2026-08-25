import React from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

function ReloadPrompt() {
  const {
    offlineReady: [offlineReady, setOfflineReady],
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log('SW Registered: ' + r)
    },
    onRegisterError(error) {
      console.log('SW registration error', error)
    },
  })

  const close = () => {
    setOfflineReady(false)
    setNeedRefresh(false)
  }

  if (!offlineReady && !needRefresh) return null

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      right: '20px',
      margin: '16px',
      padding: '16px',
      borderRadius: '8px',
      zIndex: 9999,
      backgroundColor: 'var(--bg-translucent)',
      backdropFilter: 'blur(12px)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-lg)',
      color: 'var(--text-h)',
      display: 'flex',
      flexDirection: 'column',
      gap: '12px'
    }}>
      <div>
        {offlineReady
          ? <span>App ready to work offline</span>
          : <span>New update available! Refresh to get the latest features.</span>}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {needRefresh && (
          <button 
            onClick={() => updateServiceWorker(true)}
            style={{
              padding: '6px 12px',
              backgroundColor: 'var(--accent)',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Reload
          </button>
        )}
        <button 
          onClick={close}
          style={{
            padding: '6px 12px',
            backgroundColor: 'transparent',
            color: 'var(--text-h)',
            border: '1px solid var(--border)',
            borderRadius: '4px',
            cursor: 'pointer'
          }}
        >
          Close
        </button>
      </div>
    </div>
  )
}

export default ReloadPrompt
