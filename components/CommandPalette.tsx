'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFormaStore } from '../lib/store'
import { PARTS, PRESETS, PlacedPart, PresetName } from '../lib/parts'

type CommandItem = {
  id: string
  label: string
  category: string
  icon: string
  action: () => void
  shortcut?: string
}

export default function CommandPalette() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const store = useFormaStore()

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const close = useCallback(() => {
    store.setShowCommandPalette(false)
  }, [store])

  // Build command list
  const allCommands: CommandItem[] = [
    // Parts
    ...Object.values(PARTS).map(p => ({
      id: 'add-' + p.id,
      label: 'Add ' + p.label,
      category: 'Parts',
      icon: p.icon,
      action: () => {
        store.addPart({
          id: '',
          type: p.id,
          x: (Math.random() - 0.5) * 0.4,
          y: p.h / 2 + 0.01,
          z: (Math.random() - 0.5) * 0.4,
          rotationY: 0,
        })
        close()
      },
    })),
    // Presets
    ...(Object.keys(PRESETS) as PresetName[]).map(name => ({
      id: 'preset-' + name,
      label: 'Load preset: ' + name.charAt(0).toUpperCase() + name.slice(1),
      category: 'Presets',
      icon: '◎',
      action: () => { store.loadPreset(name); close() },
    })),
    // Themes
    { id: 'theme-dark', label: 'Theme: Dark', category: 'Themes', icon: '◐', action: () => { store.setTheme('dark'); close() } },
    { id: 'theme-light', label: 'Theme: Light', category: 'Themes', icon: '◑', action: () => { store.setTheme('light'); close() } },
    { id: 'theme-bw', label: 'Theme: B&W', category: 'Themes', icon: '◕', action: () => { store.setTheme('bw'); close() } },
    // Actions
    { id: 'undo', label: 'Undo', category: 'Actions', icon: '↩', shortcut: '⌘Z', action: () => { store.undo(); close() } },
    { id: 'redo', label: 'Redo', category: 'Actions', icon: '↪', shortcut: '⌘Y', action: () => { store.redo(); close() } },
    { id: 'clear', label: 'Clear all parts', category: 'Actions', icon: '✕', action: () => { store.clearAll(); close() } },
    { id: 'tutorial', label: 'Open tutorial', category: 'Actions', icon: '?', shortcut: '?', action: () => { store.setShowTutorial(true); close() } },
    // Camera views
    { id: 'view-perspective', label: 'Camera: Perspective', category: 'Views', icon: '⊡', action: () => { store.setCameraView('perspective'); close() } },
    { id: 'view-front', label: 'Camera: Front', category: 'Views', icon: '⊟', action: () => { store.setCameraView('front'); close() } },
    { id: 'view-side', label: 'Camera: Side', category: 'Views', icon: '⊡', action: () => { store.setCameraView('side'); close() } },
    { id: 'view-top', label: 'Camera: Top', category: 'Views', icon: '⊞', action: () => { store.setCameraView('top'); close() } },
  ]

  const filtered = query
    ? allCommands.filter(c =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.category.toLowerCase().includes(query.toLowerCase())
      )
    : allCommands

  // Group by category
  const categories = Array.from(new Set(filtered.map(c => c.category)))

  // Flat list for keyboard nav
  const flatList = filtered

  useEffect(() => {
    setSelected(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s + 1, flatList.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s - 1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); flatList[selected]?.action() }
    if (e.key === 'Escape') close()
  }

  let itemIndex = 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.6)',
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          paddingTop: 100,
        }}
      >
        <motion.div
          initial={{ scale: 0.98, opacity: 0, y: -8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.98, opacity: 0 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: 510,
            background: 'var(--panel)',
            border: '1px solid var(--bd2)',
            borderRadius: 14,
            overflow: 'hidden',
            boxShadow: '0 24px 60px rgba(0,0,0,0.5)',
          }}
        >
          {/* Search input */}
          <div style={{
            display: 'flex', alignItems: 'center',
            padding: '0 16px',
            borderBottom: '1px solid var(--bd)',
          }}>
            <span style={{ color: 'var(--t3)', marginRight: 10, fontSize: 16 }}>⌕</span>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search parts, presets, actions..."
              style={{
                flex: 1, background: 'transparent',
                border: 'none', outline: 'none',
                color: 'var(--t)', fontSize: 14,
                padding: '16px 0',
                fontFamily: 'DM Sans, sans-serif',
              }}
            />
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: 10,
              color: 'var(--t3)', background: 'var(--p3)',
              padding: '2px 6px', borderRadius: 4,
            }}>ESC</span>
          </div>

          {/* Results */}
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {categories.map(cat => {
              const catItems = filtered.filter(c => c.category === cat)
              return (
                <div key={cat}>
                  <div style={{
                    padding: '8px 16px 4px',
                    fontSize: 10, fontFamily: 'DM Mono, monospace',
                    color: 'var(--t3)', letterSpacing: 1,
                    textTransform: 'uppercase',
                  }}>
                    {cat}
                  </div>
                  {catItems.map(item => {
                    const idx = itemIndex++
                    const isSelected = idx === selected
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -4 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.015 }}
                        onClick={item.action}
                        onMouseEnter={() => setSelected(idx)}
                        style={{
                          display: 'flex', alignItems: 'center',
                          padding: '9px 16px',
                          background: isSelected ? 'var(--p2)' : 'transparent',
                          cursor: 'pointer',
                          gap: 10,
                          transition: 'background 100ms',
                        }}
                      >
                        <span style={{ fontSize: 14, color: 'var(--t3)', width: 20, textAlign: 'center' }}>{item.icon}</span>
                        <span style={{ flex: 1, fontSize: 13, color: 'var(--t)', fontFamily: 'DM Sans, sans-serif' }}>{item.label}</span>
                        {item.shortcut && (
                          <span style={{
                            fontFamily: 'DM Mono, monospace', fontSize: 10,
                            color: 'var(--t3)', background: 'var(--p3)',
                            padding: '2px 6px', borderRadius: 4,
                          }}>{item.shortcut}</span>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )
            })}
            {filtered.length === 0 && (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--t3)', fontSize: 13 }}>
                No results for "{query}"
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
