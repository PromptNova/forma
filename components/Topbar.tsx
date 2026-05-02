'use client'
import { useFormaStore } from '../lib/store'
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { getRenderer } from './Forma3D'

const iconBtn = {
  display: 'flex',
  alignItems: 'center',
  gap: 4,
  padding: '4px 8px',
  borderRadius: 6,
  border: 'none',
  background: 'transparent',
  color: 'var(--t2)',
  fontSize: 12,
  cursor: 'pointer',
  transition: 'all 200ms',
  fontFamily: 'DM Sans, sans-serif',
}

export default function Topbar() {
  const {
    undo, redo, history, historyIndex,
    snapEnabled, setSnapEnabled,
    symmetryEnabled, setSymmetryEnabled,
    physics, parts,
    showSettings, setShowSettings,
    setShowCommandPalette, setShowTutorial,
    theme,
  } = useFormaStore()

  const [shakeUndo, setShakeUndo] = useState(false)
  const [shakeRedo, setShakeRedo] = useState(false)
  const [logoStable, setLogoStable] = useState(false)
  const [copied, setCopied] = useState(false)

  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  useEffect(() => {
    setLogoStable(!!physics?.stable)
  }, [physics?.stable])

  const handleUndo = () => {
    if (!canUndo) { setShakeUndo(true); setTimeout(() => setShakeUndo(false), 300) }
    else undo()
  }

  const handleRedo = () => {
    if (!canRedo) { setShakeRedo(true); setTimeout(() => setShakeRedo(false), 300) }
    else redo()
  }

  const handleExportPNG = () => {
    // Try to export PNG from Three.js canvas
    const renderer = getRenderer()
    if (renderer) {
      const canvas = renderer.domElement
      try {
        const url = canvas.toDataURL('image/png')
        const a = document.createElement('a')
        a.href = url
        a.download = 'forma-design.png'
        a.click()
        return
      } catch {
        // Fallback to JSON if canvas export fails
      }
    }
    // JSON fallback
    const data = JSON.stringify({ parts, theme, exportedAt: new Date().toISOString() }, null, 2)
    const blob = new Blob([data], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = 'forma-design.json'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        // Fallback
        const el = document.createElement('textarea')
        el.value = url
        document.body.appendChild(el)
        el.select()
        document.execCommand('copy')
        document.body.removeChild(el)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Silent fail
    }
  }

  return (
    <div style={{
      height: 50,
      background: 'var(--panel)',
      borderBottom: '1px solid var(--bd)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 16px',
      gap: 8,
      flexShrink: 0,
      zIndex: 100,
    }}>
      {/* Logo */}
      <motion.div
        animate={logoStable ? {
          filter: [
            'drop-shadow(0 0 0px #3ec87a)',
            'drop-shadow(0 0 8px #3ec87a)',
            'drop-shadow(0 0 0px #3ec87a)',
          ],
          scale: [1, 1.04, 1],
        } : {
          filter: 'drop-shadow(0 0 0px transparent)',
          scale: 1,
        }}
        transition={{ repeat: logoStable ? Infinity : 0, duration: 2 }}
        style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: 18,
          color: 'var(--t)',
          letterSpacing: -0.5,
          marginRight: 8,
          userSelect: 'none',
          cursor: 'default',
        }}
      >
        Forma
      </motion.div>

      {/* Divider */}
      <div style={{ width: 1, height: 18, background: 'var(--bd2)', marginRight: 4 }} />

      {/* Search / Command Palette trigger */}
      <button
        onClick={() => setShowCommandPalette(true)}
        style={{
          ...iconBtn,
          background: 'var(--p2)',
          border: '1px solid var(--bd)',
          color: 'var(--t3)',
          padding: '4px 12px',
          borderRadius: 8,
          gap: 8,
          width: 180,
          justifyContent: 'space-between',
        }}
        title="Open command palette"
      >
        <span>Search or add...</span>
        <span style={{
          fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--t3)',
          background: 'var(--p3)', padding: '1px 5px', borderRadius: 4
        }}>⌘K</span>
      </button>

      {/* Undo/Redo */}
      <motion.button
        animate={shakeUndo ? { x: [-3, 3, -3, 3, 0] } : {}}
        transition={{ duration: 0.2 }}
        onClick={handleUndo}
        style={{ ...iconBtn, opacity: canUndo ? 1 : 0.35 }}
        title="Undo (⌘Z)"
      >
        <span style={{ fontSize: 14 }}>↩</span>
      </motion.button>
      <motion.button
        animate={shakeRedo ? { x: [-3, 3, -3, 3, 0] } : {}}
        transition={{ duration: 0.2 }}
        onClick={handleRedo}
        style={{ ...iconBtn, opacity: canRedo ? 1 : 0.35 }}
        title="Redo (⌘Y)"
      >
        <span style={{ fontSize: 14 }}>↪</span>
      </motion.button>

      {/* Divider */}
      <div style={{ width: 1, height: 18, background: 'var(--bd2)' }} />

      {/* Snap */}
      <button
        onClick={() => setSnapEnabled(!snapEnabled)}
        style={{
          ...iconBtn,
          color: snapEnabled ? 'var(--acc)' : 'var(--t3)',
          background: snapEnabled ? 'rgba(212,117,74,.1)' : 'transparent',
        }}
        title="Toggle snap to grid"
      >
        <span>⊞</span>
        <span>Snap</span>
      </button>

      {/* Symmetry */}
      <button
        onClick={() => setSymmetryEnabled(!symmetryEnabled)}
        style={{
          ...iconBtn,
          color: symmetryEnabled ? 'var(--acc)' : 'var(--t3)',
          background: symmetryEnabled ? 'rgba(212,117,74,.1)' : 'transparent',
        }}
        title="Toggle symmetry"
      >
        <span>⇔</span>
        <span>Sym</span>
      </button>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* Part count / physics chip */}
      {parts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '3px 10px', borderRadius: 20,
            background: physics?.stable ? 'rgba(62,200,122,.1)' : 'rgba(224,82,82,.08)',
            border: `1px solid ${physics?.stable ? 'rgba(62,200,122,.2)' : 'rgba(224,82,82,.15)'}`,
            transition: 'all 320ms ease',
          }}
        >
          <div style={{
            width: 6, height: 6, borderRadius: 3,
            background: physics?.stable ? 'var(--gr)' : physics ? 'var(--rd)' : 'var(--t3)',
            transition: 'background 320ms',
          }} />
          <span style={{
            fontFamily: 'DM Mono, monospace', fontSize: 11,
            color: physics?.stable ? 'var(--gr)' : physics ? 'var(--rd)' : 'var(--t2)',
          }}>
            {parts.length} part{parts.length !== 1 ? 's' : ''}
          </span>
        </motion.div>
      )}

      {/* Tutorial */}
      <button
        onClick={() => setShowTutorial(true)}
        style={iconBtn}
        title="Tutorial (?)"
      >
        <span>?</span>
      </button>

      {/* Settings */}
      <button
        onClick={() => setShowSettings(!showSettings)}
        style={{
          ...iconBtn,
          color: showSettings ? 'var(--t)' : 'var(--t2)',
        }}
        title="Settings (,)"
      >
        <span style={{ fontSize: 14 }}>⚙</span>
        <span>Settings</span>
      </button>

      {/* Share */}
      <button
        onClick={handleShare}
        style={iconBtn}
        title="Copy link to share"
      >
        <span style={{ fontSize: 12 }}>{copied ? '✓' : '⎘'}</span>
        <span>{copied ? 'Copied!' : 'Share'}</span>
      </button>

      {/* Export */}
      <button
        onClick={handleExportPNG}
        style={{
          ...iconBtn,
          background: 'var(--acc)',
          color: '#fff',
          padding: '5px 14px',
          borderRadius: 8,
          fontWeight: 500,
          fontSize: 12,
        }}
        title="Export design as PNG"
      >
        Export
      </button>
    </div>
  )
}
