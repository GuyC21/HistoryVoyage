import React from 'react'

export default function ZoomPrompt({
  title = "Explore Historical Regions",
  message = "We have loaded 29,795 sites across Italy, Greece, and Israel. Zoom in to start exploring markers.",
  buttonText = "🔍 Zoom in to Explore",
  onZoomClick
}) {
  return (
    <div className="zoom-warning-overlay">
      <div className="zoom-warning-card">
        <h3>{title}</h3>
        <p>{message}</p>
        <button className="zoom-btn" onClick={onZoomClick}>
          {buttonText}
        </button>
      </div>
    </div>
  )
}
