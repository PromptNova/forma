'use client'
import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useFormaStore } from '../lib/store'
import { PARTS, PART_CATEGORIES, PRESETS, PlacedPart, PresetName } from '../lib/parts'

const PRESET_ICONS: Record<string, string> = {
  chair: '🪑', table: '🪵', stool: '⊙', bookshelf: '📚', desk: '💻', bench: '▬',
}

type Tab = 'parts' | 'presets' | 'library'

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: '14px 16px 6px',
      fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600,
      color: 'var(--t3)', letterSpacing: '0.08em', textTransform: 'uppercase',
    }}>{children}</div>
  )
}

function PartRow({ partId, delay = 0 }: { partId: string; delay?: number }) {
  const { addPart } = useFormaStore()
  const part = PARTS[partId]
  if (!part) return null

  const handleAdd = () => {
    addPart({
      id: '', type: partId,
      x: (Math.random() - 0.5) * 0.4, y: part.h / 2 + 0.01,
      z: (Math.random() - 0.5) * 0.4, rotationY: 0,
    })
  }

  return (
    <motion.button
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.22, ease: [0.4, 0, 0.2, 1] }}
      whileHover={{ backgroundColor: 'var(--p2)' }}
      whileTap={{ scale: 0.98 }}
      onClick={handleAdd}
      style={{
        width: '100%', padding: '9px 16px',
        border: 'none', background: 'transparent',
        color: 'var(--t)', fontSize: 13, fontFamily: 'Inter, sans-serif',
        cursor: 'pointer', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', gap: 10, borderRadius: 0,
        transition: 'background 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, background: 'var(--p2)',
          border: '0.5px solid var(--bd)', display: 'flex', alignItems: 'center',
          justifyContent: 'center', flexShrink: 0,
        }}>
          <span style={{ fontSize: 14, color: 'var(--t2)' }}>{part.icon}</span>
        </div>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t)', letterSpacing: '-0.01em' }}>
            {part.label}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>
            {part.kg}kg · €{part.price}
          </div>
        </div>
      </div>
      <div style={{
        fontSize: 18, color: 'var(--t3)', opacity: 0,
        transition: 'opacity 0.15s',
      }} className="add-icon">+</div>
    </motion.button>
  )
}

function PresetCard({ name, delay = 0 }: { name: PresetName; delay?: number }) {
  const { loadPreset } = useFormaStore()
  const preset = PRESETS[name]

  return (
    <motion.button
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.25 }}
      whileHover={{ y: -2, boxShadow: 'var(--sh2)' }}
      whileTap={{ scale: 0.98 }}
      onClick={() => loadPreset(name)}
      style={{
        width: '100%', padding: '14px 16px', margin: '0 0 6px',
        background: 'var(--p2)', border: '0.5px solid var(--bd)',
        borderRadius: 12, color: 'var(--t)',
        fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500,
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
        textAlign: 'left', transition: 'all 0.2s cubic-bezier(0.4,0,0.2,1)',
        boxShadow: 'var(--sh)',
      }}
    >
      <span style={{ fontSize: 20 }}>{PRESET_ICONS[name] || '□'}</span>
      <div>
        <div style={{ fontWeight: 500, textTransform: 'capitalize', letterSpacing: '-0.01em' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2, fontFamily: 'DM Mono, monospace' }}>
          {preset.length} parts
        </div>
      </div>
    </motion.button>
  )
}

export default function Sidebar() {
  const { addPart, parts, customParts, showPhotoTo3D, setShowPhotoTo3D, loadCustomParts } = useFormaStore()
  const [tab, setTab] = useState<Tab>('parts')
  const [search, setSearch] = useState('')

  useEffect(() => { loadCustomParts() }, [])

  const allParts = Object.values(PARTS)
  const filtered = allParts.filter(p => {
    const matchSearch = !search || p.label.toLowerCase().includes(search.toLowerCase())
    if (tab === 'parts') return matchSearch && !p.id.startsWith('prod-')
    if (tab === 'presets') return false
    return false
  })

  const tabs: { id: Tab; label: string }[] = [
    { id: 'parts', label: 'Parts' },
    { id: 'presets', label: 'Presets' },
    { id: 'library', label: 'Library' },
  ]

  return (
    <div style={{
      width: 232, height: '100%',
      background: 'var(--panel)',
      borderRight: '0.5px solid var(--bd)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      {/* Tab pills */}
      <div style={{ padding: '10px 12px 8px' }}>
        <div className="pill-tabs">
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`pill-tab ${tab === t.id ? 'active' : ''}`}
              style={{ fontSize: 12, fontFamily: 'Inter, sans-serif' }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search */}
      {tab !== 'presets' && tab !== 'library' && (
        <div style={{ padding: '0 12px 8px' }}>
          <div style={{ position: 'relative' }}>
            <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--t3)' }}
              width="13" height="13" viewBox="0 0 13 13" fill="none">
              <circle cx="5.5" cy="5.5" r="3.8" stroke="currentColor" strokeWidth="1.2"/>
              <path d="M8.2 8.2L10.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
            </svg>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search parts..."
              style={{
                width: '100%', height: 34, padding: '0 10px 0 30px',
                background: 'var(--p2)', border: '0.5px solid var(--bd)',
                borderRadius: 8, color: 'var(--t)', fontSize: 12,
                fontFamily: 'Inter, sans-serif',
              }}
            />
          </div>
        </div>
      )}

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 12 }}>
        <AnimatePresence mode="wait">
          {tab === 'parts' && (
            <motion.div key="parts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* Basic parts by category */}
              {Object.entries(PART_CATEGORIES).map(([cat, ids]) => {
                const catParts = (ids as string[])
                const visibleCatParts = catParts.filter(id => {
                  const p = PARTS[id]
                  return p && (!search || p.label.toLowerCase().includes(search.toLowerCase()))
                })
                if (!visibleCatParts.length) return null
                return (
                  <div key={cat}>
                    <SectionHeader>{cat}</SectionHeader>
                    {visibleCatParts.map((id, i) => (
                      <PartRow key={id} partId={id} delay={i * 0.04} />
                    ))}
                  </div>
                )
              })}
            </motion.div>
          )}

          {tab === 'presets' && (
            <motion.div key="presets" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SectionHeader>Preset Designs</SectionHeader>
              <div style={{ padding: '4px 12px' }}>
                {(Object.keys(PRESETS) as PresetName[]).map((name, i) => (
                  <PresetCard key={name} name={name} delay={i * 0.06} />
                ))}
              </div>
            </motion.div>
          )}

          {tab === 'library' && (
            <motion.div key="library" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SectionHeader>My Library ({customParts.length})</SectionHeader>
              {customParts.length === 0 ? (
                <div style={{ padding: '32px 20px', textAlign: 'center' }}>
                  {/* SVG illustration */}
                  <svg width="48" height="48" viewBox="0 0 48 48" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
                    <rect x="8" y="12" width="32" height="24" rx="4" stroke="var(--t3)" strokeWidth="1.5"/>
                    <path d="M16 12V8M32 12V8" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round"/>
                    <circle cx="24" cy="24" r="5" stroke="var(--t3)" strokeWidth="1.5"/>
                    <path d="M24 21V24L26 26" stroke="var(--t3)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t2)', marginBottom: 6 }}>No parts yet</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5, marginBottom: 14 }}>
                    Upload a photo to generate a 3D part with AI
                  </div>
                  <button
                    onClick={() => setShowPhotoTo3D(true)}
                    style={{
                      background: 'var(--acc)', color: '#fff',
                      border: 'none', borderRadius: 8, padding: '8px 16px',
                      fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    Upload Photo → 3D
                  </button>
                </div>
              ) : (
                <div style={{ padding: '0 12px' }}>
                  {customParts.map((part, i) => (
                    <motion.button
                      key={part.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      whileHover={{ backgroundColor: 'var(--p2)' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        addPart({ id: '', type: '__custom__' + part.id, x: 0, y: part.heightM / 2, z: 0, rotationY: 0 })
                      }}
                      style={{
                        width: '100%', padding: '10px 12px', marginBottom: 4,
                        background: 'var(--p2)', border: '0.5px solid var(--bd)',
                        borderRadius: 10, color: 'var(--t)',
                        fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                        transition: 'all 0.15s',
                      }}
                    >
                      {part.previewUrl ? (
                        <img src={part.previewUrl} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 6 }} />
                      ) : (
                        <div style={{ width: 32, height: 32, borderRadius: 6, background: 'var(--p3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          🧊
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{part.name}</div>
                        <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', marginTop: 1 }}>AI</div>
                      </div>
                    </motion.button>
                  ))}
                  <button
                    onClick={() => setShowPhotoTo3D(true)}
                    style={{
                      width: '100%', padding: '10px 16px', marginTop: 8,
                      background: 'transparent', color: 'var(--acc)',
                      border: '0.5px solid var(--acc)', borderRadius: 10,
                      fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                      cursor: 'pointer',
                    }}
                  >
                    + Upload Photo → 3D
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div style={{
        borderTop: '0.5px solid var(--bd)', padding: '10px 16px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--t3)' }}>
          {parts.length} placed
        </span>
        <button
          onClick={() => useFormaStore.getState().clearAll()}
          style={{
            background: 'transparent', border: 'none', color: 'var(--t3)',
            fontSize: 11, cursor: 'pointer', fontFamily: 'Inter, sans-serif',
            padding: '2px 6px', borderRadius: 4,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--rd)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t3)')}
        >
          Clear all
        </button>
      </div>
    </div>
  )
}
