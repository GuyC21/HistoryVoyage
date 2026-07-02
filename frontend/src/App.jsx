import React from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from '~/components/Layout'
import Home from '~/pages/Home'
import MapExplorer from '~/pages/MapExplorer'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/explore" element={<MapExplorer />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
