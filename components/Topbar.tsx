'use client'
import { useFormaStore } from '../lib/store'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect, useRef, useCallback } from 'react'
import { getRenderer } from './Forma3D'

const btn: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px',
    borderRadius: 8, border: 'none', background: 'transparent',
    color: 'var(--t2)', fontSize: 12, cursor: 'pointer',
    fontFamily: 'Inter, sans-serif', fontWeight: 500,
    transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
}

export default function Topbar() {
    const {
          undo, redo, history, historyIndex, snapEnabled, setSnapEnabled,
          physics, parts, theme, setTheme, showSettings, setShowSettings,
          setShowCommandPalette, setShowTutorial, currentDesignId,
    } = useFormaStore()

  const [shakeUndo, setShakeUndo] = useState(false)
    const [shakeRedo, setShakeRedo] = useState(false)
    const [logoStable, setLogoStable] = useState(false)
    const [copied, setCopied] = useState(false)
    const [designName, setDesignName] = useState('Untitled Design')
    const [editingName, setEditingName] = useState(false)
    const nameRef = useRef<HTMLInputElement>(null)

  const canUndo = historyIndex > 0
    const canRedo = historyIndex < history.length - 1

  useEffect(() => { setLogoStable(!!physics?.stable) }, [physics?.stable])
    useEffect(() => { if (editingName) nameRef.current?.select() }, [editingName])
    useEffect(() => {
          const saved = localStorage.getItem('forma_design_name')
          if (saved) setDesignName(saved)
    }, [])

  const handleUndo = () => {
        if (!canUndo) { setShakeUndo(true); setTimeout(() => setShakeUndo(false), 300) }
        else undo()
  }
    const handleRedo = () => {
          if (!canRedo) { setShakeRedo(true); setTimeout(() => setShakeRedo(false), 300) }
          else redo()
    }

  const handleExport = () => {
        const renderer = getRenderer()
        if (renderer) {
                try {
                          const url = renderer.domElement.toDataURL('image/png')
                          const a = document.createElement('a'); a.href = url
                          a.download = `${designName.replace(/\s+/g, '-').toLowerCase()}.png`; a.click()
                          return
                } catch (_) {}
        }
        const data = JSON.stringify({ parts, theme, name: designName, exportedAt: new Date().toISOString() }, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a'); a.href = url
        a.download = `${designName.replace(/\s+/g, '-').toLowerCase()}.json`; a.click()
        URL.revokeObjectURL(url)
  }

  const handleShare = async () => {
        try {
                const state = useFormaStore.getState()
                const data = btoa(JSON.stringify({ parts: state.parts, name: designName }))
                const url = `${window.location.origin}?design=${data}`
                await navigator.clipboard.writeText(url)
                setCopied(true); setTimeout(() => setCopied(false), 2000)
        } catch {
                setCopied(true); setTimeout(() => setCopied(false), 2000)
        }
  }

  const saveName = () => {
        setEditingName(false)
        localStorage.setItem('forma_design_name', designName)
  }

  const stableColor = physics?.stable ? 'var(--gr)' : (physics ? 'var(--rd)' : 'var(--t3)')
    const isDark = theme === 'dark'

  return (
        <div style={{
                height: 52, background: 'var(--panel)', borderBottom: '0.5px solid var(--bd)',
                display: 'flex', alignItems: 'center', padding: '0 16px', gap: 6,
                flexShrink: 0, zIndex: 100, boxShadow: 'var(--sh)',
        }}>
          {/* Logo — Syne 800 per CLAUDE.md */}
                <motion.div
                          animate={logoStable ? { scale: [1, 1.04, 1] } : { scale: 1 }}
                          transition={{ repeat: logoStable ? Infinity : 0, duration: 2.5 }}
                          className={logoStable ? 'logo-stable' : ''}
                          style={{
                                      fontFamily: 'Syne, sans-serif',
                                      fontWeight: 800,
                                      fontSize: 17,
                                      color: 'var(--t)',
                                      letterSpacing: '-0.5px',
                                      marginRight: 4,
                                      userSelect: 'none',
                                      cursor: 'default',
                                      display: 'flex', alignItems: 'center', gap: 5,
                          }}
                        >
                        Forma
                        <div style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--acc)' }} />
                </motion.div>motion.div>
        
              <div style={{ width: 1, height: 18, background: 'var(--bd2)', marginRight: 2 }} />
        
          {/* Design name (editable) */}
          {editingName ? (
                  <input
                              ref={nameRef}
                              value={designName}
                              onChange={e => setDesignName(e.target.value)}
                              onBlur={saveName}
                              onKeyDown={e => { if (e.key === 'Enter') saveName(); if (e.key === 'Escape') setEditingName(false) }}
                              style={{
                                            fontSize: 13, fontWeight: 500, color: 'var(--t)',
                                            background: 'var(--p2)', border: '0.5px solid var(--acc)',
                                            borderRadius: 6, padding: '3px 8px', outline: 'none',
                                            width: 160, fontFamily: 'Inter, sans-serif',
                                            boxShadow: '0 0 0 3px var(--acc-glow)',
                              }}
                            />
                ) : (
                  <div
                              onClick={() => setEditingName(true)}
                              title="Click to rename"
                              style={{
                                            fontSize: 13, fontWeight: 500, color: 'var(--t)',
                                            cursor: 'text', padding: '3px 8px', borderRadius: 6,
                                            maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                                            transition: 'background 0.15s',
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'var(--p2)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                            >
                    {designName}
                  </div>div>
              )}
        
              <div style={{ width: 1, height: 18, background: 'var(--bd2)', marginLeft: 2 }} />
        
          {/* Search / Command Palette */}
              <button
                        onClick={() => setShowCommandPalette(true)}
                        style={{
                                    ...btn, background: 'var(--p2)', border: '0.5px solid var(--bd)',
                                    borderRadius: 8, gap: 8, width: 170, justifyContent: 'space-between', color: 'var(--t3)',
                        }}
                      >
                      <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                                            <circle cx="5" cy="5" r="3.5" stroke="currentColor" strokeWidth="1.2"/>
                                            <path d="M7.5 7.5L10 10" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                </svg>svg>
                                Search or add...
                      </span>span>
                      <span style={{
                                  fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--t3)',
                                  background: 'var(--p3)', padding: '1px 5px', borderRadius: 4,
                      }}>⌘K</span>span>
              </button>button>
        
          {/* Undo / Redo */}
              <motion.button
                        animate={shakeUndo ? { x: [-3, 3, -3, 3, 0] } : {}}
                        transition={{ duration: 0.2 }}
                        onClick={handleUndo} title="Undo (⌘Z)"
                        style={{ ...btn, opacity: canUndo ? 1 : 0.3, padding: '5px 8px' }}
                      >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M2 5H8.5C10.5 5 12 6.5 12 8.5C12 10.5 10.5 12 8.5 12H5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                                <path d="M4.5 2.5L2 5L4.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>svg>
              </motion.button>motion.button>
              <motion.button
                        animate={shakeRedo ? { x: [-3, 3, -3, 3, 0] } : {}}
                        transition={{ duration: 0.2 }}
                        onClick={handleRedo} title="Redo (⌘Y)"
                        style={{ ...btn, opacity: canRedo ? 1 : 0.3, padding: '5px 8px' }}
                      >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                                <path d="M12 5H5.5C3.5 5 2 6.5 2 8.5C2 10.5 3.5 12 5.5 12H9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                                <path d="M9.5 2.5L12 5L9.5 7.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>svg>
              </motion.button>motion.button>
        
              <div style={{ width: 1, height: 18, background: 'var(--bd2)' }} />
        
          {/* Snap toggle */}
              <button
                        onClick={() => setSnapEnabled(!snapEnabled)}
                        title="Toggle grid snap"
                        style={{
                                    ...btn,
                                    color: snapEnabled ? 'var(--acc)' : 'var(--t3)',
                                    background: snapEnabled ? 'var(--acc-glow)' : 'transparent',
                        }}
                      >
                      <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                <rect x="1" y="1" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                                <rect x="5" y="1" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                                <rect x="9" y="1" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                                <rect x="1" y="5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                                <rect x="5" y="5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2" fill={snapEnabled ? 'var(--acc)' : 'none'}/>
                                <rect x="9" y="5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                                <rect x="1" y="9" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                                <rect x="5" y="9" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                                <rect x="9" y="9" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2"/>
                      </svg>svg>
                      Snap
              </button>button>
        
              <div style={{ flex: 1 }} />
        
          {/* Parts chip */}
          {parts.length > 0 && (
                  <motion.div
                              initial={{ opacity: 0, scale: 0.8 }}
                              animate={{ opacity: 1, scale: 1 }}
                              style={{
                                            display: 'flex', alignItems: 'center', gap: 5,
                                            padding: '3px 10px', borderRadius: 20,
                                            background: physics?.stable ? 'rgba(62,200,122,0.10)' : (physics ? 'rgba(224,82,82,0.08)' : 'var(--p2)'),
                                            border: `0.5px solid ${physics?.stable ? 'rgba(62,200,122,0.25)' : (physics ? 'rgba(224,82,82,0.2)' : 'var(--bd)')}`,
                              }}
                            >
                            <div style={{ width: 6, height: 6, borderRadius: 3, background: stableColor, transition: 'background 0.3s' }} />
                            <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: stableColor }}>
                              {parts.length} part{parts.length !== 1 ? 's' : ''}
                            </span>span>
                  </motion.div>motion.div>
                )}
        
          {/* Dark mode toggle */}
              <button
                        onClick={() => setTheme(isDark ? 'light' : 'dark')}
                        title={`Switch to ${isDark ? 'light' : 'dark'} mode (⌘⇧D)`}
                        style={{ ...btn, padding: '5px 8px' }}
                      >
                {isDark ? (
                                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                                              <circle cx="7.5" cy="7.5" r="3" stroke="currentColor" strokeWidth="1.2"/>
                                              <line x1="7.5" y1="1" x2="7.5" y2="2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                              <line x1="7.5" y1="12.5" x2="7.5" y2="14" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                              <line x1="1" y1="7.5" x2="2.5" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                              <line x1="12.5" y1="7.5" x2="14" y2="7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                  </svg>svg>
                                ) : (
                                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                                              <path d="M7.5 2C4.46 2 2 4.46 2 7.5C2 10.54 4.46 13 7.5 13C9.88 13 11.9 11.56 12.76 9.5C12.26 9.66 11.73 9.75 11.19 9.75C8.56 9.75 6.43 7.62 6.43 4.99C6.43 3.85 6.84 2.81 7.5 2Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/>
                                  </svg>svg>
                      )}
              </button>button>
        
          {/* Tutorial */}
              <button onClick={() => setShowTutorial(true)} title="Tutorial (?)" style={{ ...btn, padding: '5px 8px' }}>
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                                <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.2"/>
                                <text x="7.5" y="11" textAnchor="middle" fill="currentColor" fontSize="8" fontWeight="600" fontFamily="Inter">?</text>text>
                      </svg>svg>
              </button>button>
        
          {/* Settings */}
              <button
                        onClick={() => setShowSettings(!showSettings)}
                        title="Settings (,)"
                        style={{ ...btn, padding: '5px 8px', color: showSettings ? 'var(--acc)' : 'var(--t2)' }}
                      >
                      <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
                                <circle cx="7.5" cy="7.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
                                <path d="M7.5 1.5V3M7.5 12V13.5M1.5 7.5H3M12 7.5H13.5M3.22 3.22L4.28 4.28M10.72 10.72L11.78 11.78M3.22 11.78L4.28 10.72M10.72 4.28L11.78 3.22" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                      </svg>svg>
              </button>button>
        
          {/* Share */}
              <button
                        onClick={handleShare}
                        title="Share design"
                        style={{ ...btn, padding: '5px 10px', color: copied ? 'var(--gr)' : 'var(--t2)' }}
                      >
                {copied ? '✓ Copied' : (
                                  <>
                                              <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                                                            <path d="M5.5 7.5L10 3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                                            <path d="M10 6.5V3H6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                                                            <path d="M6 3H3C2 3 1.5 3.5 1.5 4.5V10C1.5 11 2 11.5 3 11.5H8.5C9.5 11.5 10 11 10 10V7.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                                              </svg>svg>
                                              Share
                                  </>>
                                )}
              </button>button>
        
          {/* Export */}
              <button
                        onClick={handleExport}
                        title="Export design"
                        style={{
                                    ...btn, background: 'var(--acc)', color: '#fff',
                                    padding: '6px 14px', borderRadius: 8, fontWeight: 500, fontSize: 12,
                                    boxShadow: '0 1px 3px rgba(212,117,74,0.4)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'var(--acc2)')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'var(--acc)')}
                      >
                      Export
              </button>button>
        </div>div>
      )
}</></motion.div>
