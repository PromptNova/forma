'use client'

import dynamic from 'next/dynamic'
import { useEffect, useCallback } from 'react'
import { useFormaStore } from '../lib/store'
import Sidebar from '../components/Sidebar'
import PropsPanel from '../components/PropsPanel'
import CommandPalette from '../components/CommandPalette'
import Settings from '../components/Settings'
import Tutorial from '../components/Tutorial'
import Topbar from '../components/Topbar'

// Dynamic import to avoid SSR issues with Three.js
const Forma3D = dynamic(() => import('../components/Forma3D'), { ssr: false })

export default function Home() {
  const {
    showCommandPalette, setShowCommandPalette,
    showSettings, setShowSettings,
    showTutorial, setShowTutorial,
    undo, redo,
    selectedId, removePart, duplicatePart,
    theme,
  } = useFormaStore()

  // Apply theme
  useEffect(() => {
    const html = document.documentElement
    html.className = theme === 'dark' ? '' : theme
  }, [theme])

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey
    
    // Ignore when in input
    if ((e.target as HTMLElement).tagName === 'INPUT' || (e.target as HTMLElement).tagName === 'TEXTAREA') return

    if (meta && e.key === 'k') { e.preventDefault(); setShowCommandPalette(true) }
    if (meta && e.key === 'z') { e.preventDefault(); undo() }
    if (meta && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo() }
    if (e.key === '?') { setShowTutorial(true) }
    if (e.key === ',') { setShowSettings(true) }
    if (e.key === 'Escape') {
      setShowCommandPalette(false)
      setShowSettings(false)
      setShowTutorial(false)
    }
    if (e.key === 'd' && selectedId) { e.preventDefault(); duplicatePart(selectedId) }
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { 
      removePart(selectedId)
    }
  }, [selectedId, undo, redo, setShowCommandPalette, setShowSettings, setShowTutorial, duplicatePart, removePart])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: 'var(--bg)',
        overflow: 'hidden',
      }}
    >
      {/* Topbar */}
      <Topbar />

      {/* Main layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        {/* Left sidebar */}
        <Sidebar />

        {/* 3D Canvas */}
        <div style={{ flex: 1, position: 'relative' }}>
          <Forma3D />
        </div>

        {/* Right props panel */}
        <PropsPanel />
      </div>

      {/* Overlays */}
      {showCommandPalette && <CommandPalette />}
      {showSettings && <Settings />}
      {showTutorial && <Tutorial />}
    </div>
  )
}
