'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFormaStore } from '../lib/store'
import { PARTS, PART_CATEGORIES, PRESETS, PlacedPart, PresetName } from '../lib/parts'
import PhotoTo3D from './PhotoTo3D'

const PRESET_ICONS: Record<string, string> = {
  chair: '🪑', table: '🪵', stool: '◎', bookshelf: '📚', desk: '💻', bench: '▬',
}

export default function Sidebar() {
  const { addPart, loadPreset, sidebarTab, setSidebarTab, parts, customParts, showPhotoTo3D, setShowPhotoTo3D, loadCustomParts } = useFormaStore()
  
  // Load custom parts on mount
  useState(() => { loadCustomParts() })
  const [search, setSearch] = useState('')

  const tabs = [
    { key: 'parts', label: 'Parts' },
    { key: 'real', label: 'Products' },
    { key: 'presets', label: 'Presets' },
    { key: 'library', label: 'My Library' },
  ] as const

  const allParts = Object.values(PARTS)
  
  const filteredParts = allParts.filter(p => {
    const matchSearch = search === '' || p.label.toLowerCase().includes(search.toLowerCase())
    if (sidebarTab === 'parts') return matchSearch && !p.id.startsWith('prod-')
    if (sidebarTab === 'real') return matchSearch && p.id.startsWith('prod-')
    if (sidebarTab === 'library') return false  // handled separately
    return false
  })

  const handleAddPart = (partId: string) => {
    const def = PARTS[partId]
    if (!def) return
    const newPart: PlacedPart = {
      id: '',
      type: partId,
      x: (Math.random() - 0.5) * 0.4,
      y: def.h / 2 + 0.01,
      z: (Math.random() - 0.5) * 0.4,
      rotationY: 0,
    }
    addPart(newPart)
  }

  return (
    <div style={{
      width: 220,
      height: '100%',
      background: 'var(--panel)',
      borderRight: '1px solid var(--bd)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Tabs */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid var(--bd)',
        padding: '8px 8px 0',
        gap: 2,
      }}>
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setSidebarTab(tab.key)}
            style={{
              flex: 1,
              padding: '6px 4px',
              border: 'none',
              background: 'transparent',
              color: sidebarTab === tab.key ? 'var(--t)' : 'var(--t3)',
              fontSize: 11,
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: sidebarTab === tab.key ? 500 : 400,
              cursor: 'pointer',
              borderBottom: sidebarTab === tab.key ? '2px solid var(--acc)' : '2px solid transparent',
              transition: 'all 200ms',
              marginBottom: -1,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      {sidebarTab !== 'presets' && (
        <div style={{ padding: '8px 10px' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search parts..."
            style={{
              width: '100%',
              padding: '6px 10px',
              background: 'var(--p2)',
              border: '1px solid var(--bd)',
              borderRadius: 6,
              color: 'var(--t)',
              fontSize: 12,
              outline: 'none',
            }}
          />
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 6px' }}>
        <AnimatePresence mode="wait">
          {sidebarTab === 'library' ? (
            <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ padding: '6px 4px', color: 'var(--t3)', fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                My Library ({customParts.length})
              </div>
              {customParts.length === 0 ? (
                <div style={{ padding: '20px 12px', textAlign: 'center', color: 'var(--t3)', fontSize: 12, fontFamily: 'DM Sans, sans-serif', lineHeight: 1.5 }}>
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📸</div>
                  No AI-imported parts yet.<br />
                  <span style={{ color: 'var(--acc)' }}>Click "Photo → 3D Model"</span><br />
                  to import your first part.
                </div>
              ) : (
                customParts.map(part => (
                  <motion.button
                    key={part.id}
                    whileHover={{ x: 2 }}
                    onClick={() => {
                      const newPart: PlacedPart = {
                        id: '',
                        type: '__custom__' + part.id,
                        x: (Math.random() - 0.5) * 0.4,
                        y: part.heightM / 2 + 0.01,
                        z: (Math.random() - 0.5) * 0.4,
                        rotationY: 0,
                      }
                      addPart(newPart)
                    }}
                    style={{
                      width: '100%', padding: '8px 10px', marginBottom: 2,
                      background: 'transparent', border: '1px solid transparent', borderRadius: 6,
                      color: 'var(--t)', fontSize: 12, fontFamily: 'DM Sans, sans-serif',
                      cursor: 'pointer', display: 'flex', alignItems: 'center',
                      justifyContent: 'space-between', transition: 'all 150ms',
                    }}
                    onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--p2)'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--bd)' }}
                    onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'transparent'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {part.previewUrl ? (
                        <img src={part.previewUrl} alt="" style={{ width: 24, height: 24, objectFit: 'contain', borderRadius: 4, border: '1px solid var(--bd)' }} />
                      ) : (
                        <span style={{ fontSize: 14 }}>🧊</span>
                      )}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 110 }}>{part.name}</span>
                    </div>
                    <span style={{ fontSize: 9, padding: '1px 5px', background: 'rgba(212,117,74,.15)', color: 'var(--acc)', borderRadius: 8, fontFamily: 'DM Mono, monospace', flexShrink: 0 }}>AI</span>
                  </motion.button>
                ))
              )}
            </motion.div>
          ) : sidebarTab === 'presets' ? (
            <motion.div key="presets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <div style={{ padding: '6px 4px', color: 'var(--t3)', fontSize: 10, fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                Presets
              </div>
              {(Object.keys(PRESETS) as PresetName[]).map(name => (
                <motion.button
                  key={name}
                  whileHover={{ translateY: -1, boxShadow: '0 4px 12px rgba(0,0,0,.3)' }}
                  onClick={() => loadPreset(name)}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    marginBottom: 4,
                    background: 'var(--p2)',
                    border: '1px solid var(--bd)',
                    borderRadius: 8,
                    color: 'var(--t)',
                    fontSize: 13,
                    fontFamily: 'DM Sans, sans-serif',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    textAlign: 'left',
                    transition: 'background 200ms',
                  }}
                >
                  <span style={{ fontSize: 18 }}>{PRESET_ICONS[name] || '□'}</span>
                  <div>
                    <div style={{ fontWeight: 500, textTransform: 'capitalize' }}>{name}</div>
                    <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 1 }}>
                      {PRESETS[name].length} parts
                    </div>
                  </div>
                </motion.button>
              ))}
            </motion.div>
          ) : (
            <motion.div key={sidebarTab} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {filteredParts.map(part => (
                <motion.button
                  key={part.id}
                  whileHover={{ x: 2 }}
                  onClick={() => handleAddPart(part.id)}
                  style={{
                    width: '100%',
                    padding: '8px 10px',
                    marginBottom: 2,
                    background: 'transparent',
                    border: '1px solid transparent',
                    borderRadius: 6,
                    color: 'var(--t)',
                    fontSize: 12,
                    fontFamily: 'DM Sans, sans-serif',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 150ms',
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'var(--p2)'
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--bd)'
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'transparent'
                    ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', width: 14, textAlign: 'center' }}>
                      {part.icon}
                    </span>
                    <span>{part.label}</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--t3)' }}>
                      {part.kg}kg
                    </span>
                    {part.price > 0 && (
                      <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--acc2)' }}>
                        €{part.price}
                      </span>
                    )}
                  </div>
                </motion.button>
              ))}
              {filteredParts.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--t3)', fontSize: 12 }}>
                  No parts found
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer stats */}
      <div style={{
        borderTop: '1px solid var(--bd)',
        padding: '8px 10px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--t3)' }}>
          {parts.length} placed
        </span>
        <button
          onClick={() => useFormaStore.getState().clearAll()}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'var(--t3)',
            fontSize: 10,
            cursor: 'pointer',
            fontFamily: 'DM Sans, sans-serif',
          }}
        >
          Clear all
        </button>
      </div>
    </div>
  )
}
