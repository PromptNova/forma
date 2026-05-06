'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFormaStore } from '../lib/store'
import { PARTS, PRESETS, PlacedPart, PresetName } from '../lib/parts'

type Cmd = {
  id: string; label: string; category: string
  icon: React.ReactNode; action: () => void; shortcut?: string
}

const SHORTCUTS: Record<string, string> = {
  undo: '⌘Z', redo: '⌘Y', clear: '⌃⌫', tutorial: '?',
  'view-perspective': '1', 'view-front': '2', 'view-side': '3', 'view-top': '4',
  'toggle-grid': 'G', 'toggle-dark': '⌘⇧D', 'zoom-fit': '⌘⇧F',
}

function CategoryIcon({ cat }: { cat: string }) {
  const icons: Record<string, string> = {
    Parts: '⬛', Presets: '⊙', Views: '⊡', Actions: '◎', Themes: '◑',
  }
  return <span>{icons[cat] || '◈'}</span>
}

export default function CommandPalette() {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const store = useFormaStore()

  useEffect(() => { inputRef.current?.focus() }, [])

  const close = useCallback(() => store.setShowCommandPalette(false), [store])

  const allCommands: Cmd[] = [
    ...Object.values(PARTS).map(p => ({
      id: 'add-' + p.id, label: 'Add ' + p.label, category: 'Parts',
      icon: <span style={{ fontSize: 12 }}>{p.icon}</span>,
      action: () => {
        store.addPart({ id: '', type: p.id, x: (Math.random()-0.5)*0.4, y: p.h/2+0.01, z: (Math.random()-0.5)*0.4, rotationY: 0 })
        close()
      },
    })),
    ...(Object.keys(PRESETS) as PresetName[]).map(name => ({
      id: 'preset-' + name, label: 'Load: ' + name.charAt(0).toUpperCase() + name.slice(1),
      category: 'Presets', icon: <span>⊙</span>,
      action: () => { store.loadPreset(name); close() },
    })),
    { id: 'theme-light', label: 'Switch to Light mode', category: 'Themes', icon: <span>☀</span>,
      action: () => { store.setTheme('light'); close() } },
    { id: 'theme-dark', label: 'Switch to Dark mode', category: 'Themes', icon: <span>◑</span>,
      action: () => { store.setTheme('dark'); close() } },
    { id: 'theme-bw', label: 'Black & White mode', category: 'Themes', icon: <span>◕</span>,
      action: () => { store.setTheme('bw'); close() } },
    { id: 'undo', label: 'Undo', category: 'Actions', icon: <span>↩</span>, shortcut: '⌘Z',
      action: () => { store.undo(); close() } },
    { id: 'redo', label: 'Redo', category: 'Actions', icon: <span>↪</span>, shortcut: '⌘Y',
      action: () => { store.redo(); close() } },
    { id: 'clear', label: 'Clear all parts', category: 'Actions', icon: <span>🗑</span>,
      action: () => { store.clearAll(); close() } },
    { id: 'tutorial', label: 'Open tutorial', category: 'Actions', icon: <span>?</span>, shortcut: '?',
      action: () => { store.setShowTutorial(true); close() } },
    { id: 'toggle-grid', label: 'Toggle grid', category: 'Actions', icon: <span>⊞</span>, shortcut: 'G',
      action: () => { store.setShowGrid(!store.showGrid); close() } },
    { id: 'zoom-fit', label: 'Zoom to fit', category: 'Actions', icon: <span>⊡</span>, shortcut: 'F',
      action: () => { window.dispatchEvent(new CustomEvent('forma:fitscreen')); close() } },
    { id: 'wireframe', label: 'Toggle wireframe', category: 'Actions', icon: <span>⬡</span>, shortcut: 'W',
      action: () => { window.dispatchEvent(new CustomEvent('forma:wireframe')); close() } },
    { id: 'view-perspective', label: 'Camera: Perspective', category: 'Views', icon: <span>⊡</span>, shortcut: '1',
      action: () => { store.setCameraView('perspective'); close() } },
    { id: 'view-front', label: 'Camera: Front', category: 'Views', icon: <span>⬒</span>, shortcut: '2',
      action: () => { store.setCameraView('front'); close() } },
    { id: 'view-side', label: 'Camera: Side', category: 'Views', icon: <span>⬓</span>, shortcut: '3',
      action: () => { store.setCameraView('side'); close() } },
    { id: 'view-top', label: 'Camera: Top', category: 'Views', icon: <span>⊠</span>, shortcut: '4',
      action: () => { store.setCameraView('top'); close() } },
  ]

  const filtered = query
    ? allCommands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()) || c.category.toLowerCase().includes(query.toLowerCase()))
    : allCommands

  const categories = Array.from(new Set(filtered.map(c => c.category)))
  useEffect(() => setSelected(0), [query])

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, filtered.length-1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s-1, 0)) }
    if (e.key === 'Enter') { e.preventDefault(); filtered[selected]?.action() }
    if (e.key === 'Escape') close()
  }

  let idx = 0

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={close}
        style={{
          position: 'fixed', inset: 0, zIndex: 1000,
          background: 'rgba(0,0,0,0.2)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          paddingTop: 80,
          backdropFilter: 'blur(8px)',
        }}
      >
        <motion.div
          initial={{ scale: 0.97, opacity: 0, y: -8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.97, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 500, damping: 35 }}
          onClick={e => e.stopPropagation()}
          style={{
            width: 560, background: 'var(--panel)',
            border: '0.5px solid var(--bd2)',
            borderRadius: 20, overflow: 'hidden',
            boxShadow: 'var(--sh3)',
          }}
        >
          {/* Search input */}
          <div style={{ display: 'flex', alignItems: 'center', padding: '0 18px', borderBottom: '0.5px solid var(--bd)' }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ color: 'var(--t3)', flexShrink: 0 }}>
              <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/>
              <path d="M10 10L14 14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
            </svg>
            <input
              ref={inputRef}
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKey}
              placeholder="Search parts, presets, actions..."
              style={{
                flex: 1, background: 'transparent', border: 'none', outline: 'none',
                color: 'var(--t)', fontSize: 16, padding: '16px 12px',
                fontFamily: 'Inter, sans-serif', letterSpacing: '-0.01em',
              }}
            />
            <span style={{
              fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--t3)',
              background: 'var(--p2)', padding: '3px 7px', borderRadius: 6,
              border: '0.5px solid var(--bd)',
            }}>ESC</span>
          </div>

          {/* Results */}
          <div style={{ maxHeight: 440, overflowY: 'auto' }}>
            {categories.map(cat => {
              const catItems = filtered.filter(c => c.category === cat)
              return (
                <div key={cat}>
                  <div style={{
                    padding: '10px 18px 4px', fontSize: 10, fontFamily: 'Inter, sans-serif',
                    fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.07em', textTransform: 'uppercase',
                  }}>{cat}</div>
                  {catItems.map(item => {
                    const i = idx++
                    const isSel = i === selected
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0, x: -6 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.01 }}
                        onClick={item.action}
                        onMouseEnter={() => setSelected(i)}
                        style={{
                          display: 'flex', alignItems: 'center', padding: '9px 18px',
                          background: isSel ? 'var(--p2)' : 'transparent',
                          cursor: 'pointer', gap: 12,
                          borderRadius: isSel ? 0 : 0,
                          transition: 'background 0.08s',
                        }}
                      >
                        <div style={{
                          width: 28, height: 28, borderRadius: 7,
                          background: isSel ? 'var(--acc)' : 'var(--p3)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 13, flexShrink: 0, color: isSel ? '#fff' : 'var(--t2)',
                          transition: 'all 0.15s',
                        }}>
                          {item.icon}
                        </div>
                        <span style={{
                          flex: 1, fontSize: 14, fontFamily: 'Inter, sans-serif',
                          fontWeight: 500, color: 'var(--t)', letterSpacing: '-0.01em',
                        }}>{item.label}</span>
                        {item.shortcut && (
                          <span style={{
                            fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--t3)',
                            background: 'var(--p3)', padding: '3px 8px', borderRadius: 6,
                            border: '0.5px solid var(--bd)',
                          }}>{item.shortcut}</span>
                        )}
                      </motion.div>
                    )
                  })}
                </div>
              )
            })}

            {filtered.length === 0 && (
              <div style={{ padding: '40px 18px', textAlign: 'center', color: 'var(--t3)', fontSize: 14, fontFamily: 'Inter, sans-serif' }}>
                No results for "<strong>{query}</strong>"
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{
            borderTop: '0.5px solid var(--bd)', padding: '8px 18px',
            display: 'flex', gap: 16, fontSize: 11, color: 'var(--t3)', fontFamily: 'Inter, sans-serif',
          }}>
            <span>↵ Select</span>
            <span>↑↓ Navigate</span>
            <span>ESC Close</span>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
