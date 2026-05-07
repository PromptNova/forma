'use client'
import dynamic from 'next/dynamic'
import { useEffect, useCallback, useState } from 'react'
import { useFormaStore } from '../lib/store'

const Topbar = dynamic(() => import('../components/Topbar'), { ssr: false })
const Sidebar = dynamic(() => import('../components/Sidebar'), { ssr: false })
const PropsPanel = dynamic(() => import('../components/PropsPanel'), { ssr: false })
const CommandPalette = dynamic(() => import('../components/CommandPalette'), { ssr: false })
const Settings = dynamic(() => import('../components/Settings'), { ssr: false })
const Tutorial = dynamic(() => import('../components/Tutorial'), { ssr: false })
const Forma3D = dynamic(() => import('../components/Forma3D'), { ssr: false })
const PhotoTo3D = dynamic(() => import('../components/PhotoTo3D'), { ssr: false })

export default function Home() {
    const {
          showCommandPalette, setShowCommandPalette,
          showSettings, setShowSettings,
          showTutorial, setShowTutorial,
          showPhotoTo3D, setShowPhotoTo3D,
          undo, redo,
          selectedId, removePart, duplicatePart,
          theme, setTheme,
          setShowGrid, showGrid,
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
                                                    parts: state.parts, theme: state.theme,
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
                          if (useFormaStore.getState().parts.length === 0 && savedParts?.length > 0) {
                                      // Could auto-restore but we let user choose
                          }
                }
        } catch (_) {}
  }, [])

  // Global keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
        const meta = e.metaKey || e.ctrlKey
        const target = e.target as HTMLElement
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

                                        if (meta && e.key === 'k') { e.preventDefault(); setShowCommandPalette(true); return }
        if (meta && !e.shiftKey && e.key === 'z') { e.preventDefault(); undo(); return }
        if (meta && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return }
        if (meta && e.key === 'a') { e.preventDefault(); return }
        if (meta && e.key === 'd') { e.preventDefault(); if (selectedId) duplicatePart(selectedId); return }
        if (meta && e.key === 'c') { e.preventDefault(); return }
        if (meta && e.key === 'v') { e.preventDefault(); return }
        if (meta && e.shiftKey && e.key === 'D') {
                e.preventDefault()
                setTheme(theme === 'dark' ? 'light' : 'dark')
                return
        }
        if (e.key === '1') { setCameraView('perspective'); return }
        if (e.key === '2') { setCameraView('front'); return }
        if (e.key === '3') { setCameraView('side'); return }
        if (e.key === '4') { setCameraView('top'); return }
        if (e.key === 'g' || e.key === 'G') { setShowGrid(!showGrid); return }
        if (e.key === '?') { setShowTutorial(true); return }
        if (e.key === ',') { setShowSettings(true); return }
        if (e.key === 'Escape') {
                setShowCommandPalette(false)
                setShowSettings(false)
                setShowTutorial(false)
                setShowPhotoTo3D(false)
                selectPart(null)
                return
        }
        if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId) { removePart(selectedId); return }
        if (e.key === 'd' && selectedId && !meta) { duplicatePart(selectedId); return }
        if (e.key === 'f' || e.key === 'F') { window.dispatchEvent(new CustomEvent('forma:fitscreen')); return }
        if (e.key === 'r' || e.key === 'R') { window.dispatchEvent(new CustomEvent('forma:resetcamera')); return }
        if (e.key === 'w' || e.key === 'W') { window.dispatchEvent(new CustomEvent('forma:wireframe')); return }
        if (e.key === 'h' || e.key === 'H') { window.dispatchEvent(new CustomEvent('forma:hide')); return }
        if (e.key === 'l' || e.key === 'L') { window.dispatchEvent(new CustomEvent('forma:lock')); return }
        if (e.key === 'p' || e.key === 'P') { setShowPhotoTo3D(true); return }
  }, [selectedId, undo, redo, setShowCommandPalette, setShowSettings, setShowTutorial,
            setShowPhotoTo3D, duplicatePart, removePart, theme, setTheme, showGrid,
            setShowGrid, setCameraView, selectPart])

  useEffect(() => {
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleKeyDown])

  return (
        <div style={{
                display: 'flex', flexDirection: 'column', height: '100vh',
                background: 'var(--bg)', overflow: 'hidden',
        }}>
                <Topbar />
                <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>
                          <Sidebar />
                          <div style={{ flex: 1, position: 'relative', background: 'var(--bg2)' }}>
                                      <Forma3D />
                          </div>div>
                          <PropsPanel />
                </div>div>
          {showCommandPalette && <CommandPalette />}
          {showSettings && <Settings />}
          {showTutorial && <Tutorial />}
          {showPhotoTo3D && <PhotoTo3D onClose={() => setShowPhotoTo3D(false)} />}
        </div>div>
      )
}
