'use client'
import dynamic from 'next/dynamic'
import { useEffect, useCallback, useRef } from 'react'
import { useFormaStore } from '../lib/store'

const Topbar = dynamic(() => import('../components/Topbar'), { ssr: false })
const Sidebar = dynamic(() => import('../components/Sidebar'), { ssr: false })
const PropsPanel = dynamic(() => import('../components/PropsPanel'), { ssr: false })
const CommandPalette = dynamic(() => import('../components/CommandPalette'), { ssr: false })
const Settings = dynamic(() => import('../components/Settings'), { ssr: false })
const Tutorial = dynamic(() => import('../components/Tutorial'), { ssr: false })
const Forma3D = dynamic(() => import('../components/Forma3D'), { ssr: false })

export default function Home() {
  const {
    showCommandPalette, setShowCommandPalette,
    showSettings, setShowSettings,
    showTutorial, setShowTutorial,
    undo, redo,
    selectedId, removePart, duplicatePart,
    theme, setTheme,
    setShowGrid,
    showGrid,
    setCameraView,
    parts, selectPart,
  } = useFormaStore()

  // Apply theme class to html element
  useEffect(() => {
    const html = document.documentElement
    html.className = ''
    if (theme === 'dark') html.classList.add('dark')
    else if (theme === 'light') html.classList.add('light')
    else if (theme === 'bw') html.classList.add('bw')
  }, [theme])

  // Auto-save to localStorage every 30s
  useEffect(() => {
    const interval = setInterval(() => {
      const state = useFormaStore.getState()
      if (state.parts.length > 0) {
        try {
          localStorage.setItem('forma_autosave', JSON.stringify({
            parts: state.parts,
            theme: state.theme,
            savedAt: new Date().toISOString()
          }))
        } catch (_) {}
      }
    }, 30000)
    return () => clearInterval(interval)
  }, [])

  // Restore auto-save on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem('forma_autosave')
      if (saved) {
        const { parts: savedParts } = JSON.parse(saved)
        // Only restore if no current parts
        if (useFormaStore.getState().parts.length === 0 && savedParts?.length > 0) {
          // Don't auto-restore, let user choose
        }
      }
    } catch (_) {}
  }, [])

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    const meta = e.metaKey || e.ctrlKey
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

    // Command palette
    if (meta && e.key === 'k') { e.preventDefault(); setShowCommandPalette(true); return }

    // Undo / Redo
    if (meta && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); return }
    if (meta && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return }

    // Select all
    if (meta && e.key === 'a') { e.preventDefault(); /* select all handled in Forma3D */ return }

    // Duplicate
    if (meta && e.key === 'd') { e.preventDefault(); if (selectedId) duplicatePart(selectedId); return }

    // Copy / Paste placeholder
    if (meta && e.key === 'c') { e.preventDefault(); return }
    if (meta && e.key === 'v') { e.preventDefault(); return }

    // Dark mode toggle
    if (meta && e.shiftKey && e.key === 'D') {
      e.preventDefault()
      setTheme(theme === 'dark' ? 'light' : 'dark')
      return
    }

    // Camera presets
    if (e.key === '1') { setCameraView('perspective'); return }
    if (e.key === '2') { setCameraView('front'); return }
    if (e.key === '3') { setCameraView('side'); return }
    if (e.key === '4') { setCameraView('top'); return }

    // Grid toggle
    if (e.key === 'g' || e.key === 'G') { setShowGrid(!showGrid); return }

    // Wireframe — handled in Forma3D via event

    // Zoom to fit
    if (meta && e.shiftKey && e.key === 'F') { e.preventDefault(); return }

    // Tutorial
    if (e.key === '?') { setShowTutorial(true); return }

    // Settings
    if (e.key === ',') { setShowSettings(true); return }

    // Escape — close modals / deselect
    if (e.key === 'Escape') {
      setShowCommandPalette(false)
      setShowSettings(false)
      setShowTutorial(false)
      selectPart(null)
      return
    }

    // Delete selected
    if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) {
      removePart(selectedId)
      return
    }

    // D key — duplicate (no meta)
    if (e.key === 'd' && selectedId && !meta) { duplicatePart(selectedId); return }

    // F key — fit to screen (dispatched to Forma3D)
    if (e.key === 'f' || e.key === 'F') {
      window.dispatchEvent(new CustomEvent('forma:fitscreen'))
      return
    }

    // R key — reset camera
    if (e.key === 'r' || e.key === 'R') {
      window.dispatchEvent(new CustomEvent('forma:resetcamera'))
      return
    }

    // W key — wireframe
    if (e.key === 'w' || e.key === 'W') {
      window.dispatchEvent(new CustomEvent('forma:wireframe'))
      return
    }

    // H key — hide/show
    if (e.key === 'h' || e.key === 'H') {
      window.dispatchEvent(new CustomEvent('forma:hide'))
      return
    }

    // L key — lock
    if (e.key === 'l' || e.key === 'L') {
      window.dispatchEvent(new CustomEvent('forma:lock'))
      return
    }
  }, [selectedId, undo, redo, setShowCommandPalette, setShowSettings, setShowTutorial,
      duplicatePart, removePart, theme, setTheme, showGrid, setShowGrid, setCameraView, selectPart])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      background: 'var(--bg)',
      overflow: 'hidden',
    }}>
      <Topbar />
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <div style={{ flex: 1, position: 'relative', background: 'var(--bg2)' }}>
          <Forma3D />
        </div>
        <PropsPanel />
      </div>
      {showCommandPalette && <CommandPalette />}
      {showSettings && <Settings />}
      {showTutorial && <Tutorial />}
    </div>
  )
}
