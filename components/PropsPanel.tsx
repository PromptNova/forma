'use client'

import { useFormaStore } from '../lib/store'
import { PARTS } from '../lib/parts'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

function StatNumber({ value, unit = '' }: { value: string | number; unit?: string }) {
  const [flash, setFlash] = useState(false)
  const [prev, setPrev] = useState(value)
  useEffect(() => {
    if (value !== prev) { setFlash(true); setPrev(value); setTimeout(() => setFlash(false), 400) }
  }, [value, prev])
  return (
    <span style={{
      fontFamily: 'DM Mono, monospace',
      color: flash ? 'var(--acc)' : 'var(--t)',
      transform: flash ? 'translateY(-3px)' : 'translateY(0)',
      display: 'inline-block',
      transition: 'all 400ms',
    }}>
      {value}{unit}
    </span>
  )
}

export default function PropsPanel() {
  const { parts, selectedId, selectPart, removePart, duplicatePart, updatePart, physics } = useFormaStore()

  const selectedPart = selectedId ? parts.find(p => p.id === selectedId) : null
  const selectedDef = selectedPart ? PARTS[selectedPart.type] : null

  // BOM stats
  const totalKg = parts.reduce((acc, p) => acc + (PARTS[p.type]?.kg || 0), 0)
  const totalCost = parts.reduce((acc, p) => acc + (PARTS[p.type]?.price || 0), 0)
  const maxH = parts.length > 0 ? Math.max(...parts.map(p => {
    const def = PARTS[p.type]; return def ? (p.y + def.h / 2) : 0
  })) : 0

  return (
    <div style={{
      width: 216,
      height: '100%',
      background: 'var(--panel)',
      borderLeft: '1px solid var(--bd)',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      {/* Props area */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
        <AnimatePresence mode="wait">
          {selectedPart && selectedDef ? (
            <motion.div
              key={selectedPart.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
            >
              {/* Part header */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 4 }}>
                  Selected Part
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 14, fontWeight: 500, color: 'var(--t)' }}>{selectedDef.label}</span>
                  <button
                    onClick={() => selectPart(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 14, padding: 2 }}
                  >✕</button>
                </div>
                <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                  {selectedDef.kind} · {selectedDef.w*100}×{selectedDef.h*100}×{selectedDef.d*100}cm
                </div>
              </div>

              {/* Status */}
              {physics && (
                <div style={{
                  padding: '6px 10px',
                  borderRadius: 6,
                  background: physics.perPartStatus[selectedPart.id] === 'stable' ? 'rgba(62,200,122,.08)' :
                               physics.perPartStatus[selectedPart.id] === 'unstable' ? 'rgba(224,82,82,.08)' : 'var(--p2)',
                  border: '1px solid ' + (physics.perPartStatus[selectedPart.id] === 'stable' ? 'rgba(62,200,122,.2)' :
                               physics.perPartStatus[selectedPart.id] === 'unstable' ? 'rgba(224,82,82,.15)' : 'var(--bd)'),
                  marginBottom: 12,
                  fontSize: 11,
                  color: physics.perPartStatus[selectedPart.id] === 'stable' ? 'var(--gr)' :
                          physics.perPartStatus[selectedPart.id] === 'unstable' ? 'var(--rd)' : 'var(--t3)',
                  fontFamily: 'DM Sans, sans-serif',
                }}>
                  {physics.perPartStatus[selectedPart.id] === 'stable' ? '✓ Stable' :
                   physics.perPartStatus[selectedPart.id] === 'unstable' ? '⚠ Unstable' : '◦ Neutral'}
                </div>
              )}

              {/* Position controls */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                  Position
                </div>
                {(['x', 'y', 'z'] as const).map(axis => (
                  <div key={axis} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 10, color: 'var(--t3)', width: 12 }}>{axis.toUpperCase()}</span>
                    <input
                      type="number"
                      step={0.01}
                      value={parseFloat(selectedPart[axis].toFixed(3))}
                      onChange={e => updatePart(selectedPart.id, { [axis]: parseFloat(e.target.value) })}
                      style={{
                        flex: 1, padding: '4px 8px',
                        background: 'var(--p2)', border: '1px solid var(--bd)',
                        borderRadius: 5, color: 'var(--t)', fontSize: 11,
                        fontFamily: 'DM Mono, monospace', outline: 'none',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Rotation */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
                  Rotation Y
                </div>
                <input
                  type="range"
                  min={0} max={Math.PI * 2} step={Math.PI / 8}
                  value={selectedPart.rotationY || 0}
                  onChange={e => updatePart(selectedPart.id, { rotationY: parseFloat(e.target.value) })}
                  style={{ width: '100%' }}
                />
              </div>

              {/* Material info */}
              <div style={{
                background: 'var(--p2)', borderRadius: 8, padding: '10px 12px', marginBottom: 12,
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif' }}>Weight</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--t)' }}>{selectedDef.kg} kg</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif' }}>Price</span>
                  <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--acc2)' }}>€{selectedDef.price}</span>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => duplicatePart(selectedPart.id)}
                  style={{
                    flex: 1, padding: '7px 0',
                    background: 'var(--p2)', border: '1px solid var(--bd)',
                    borderRadius: 7, color: 'var(--t2)',
                    fontSize: 12, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Duplicate
                </button>
                <button
                  onClick={() => removePart(selectedPart.id)}
                  style={{
                    flex: 1, padding: '7px 0',
                    background: 'rgba(224,82,82,.08)', border: '1px solid rgba(224,82,82,.2)',
                    borderRadius: 7, color: 'var(--rd)',
                    fontSize: 12, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  Delete
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ color: 'var(--t3)', fontSize: 12, fontFamily: 'DM Sans, sans-serif', padding: '20px 0', textAlign: 'center' }}
            >
              <div style={{ fontSize: 24, marginBottom: 8 }}>◻</div>
              <div>Select a part to see its properties</div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOM */}
        {parts.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8 }}>
              Bill of Materials
            </div>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {parts.map(part => {
                const def = PARTS[part.type]
                if (!def) return null
                return (
                  <div
                    key={part.id}
                    onClick={() => selectPart(part.id)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '5px 8px', borderRadius: 5,
                      background: selectedId === part.id ? 'var(--p3)' : 'transparent',
                      cursor: 'pointer',
                      marginBottom: 2,
                      transition: 'background 150ms',
                    }}
                  >
                    <span style={{ fontSize: 11, color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif' }}>{def.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono, monospace' }}>€{def.price}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div style={{
        borderTop: '1px solid var(--bd)',
        padding: '10px 12px',
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 8,
      }}>
        {[
          { label: 'Parts', value: parts.length },
          { label: 'Weight', value: totalKg.toFixed(1), unit: 'kg' },
          { label: 'Height', value: Math.round(maxH * 100), unit: 'cm' },
          { label: 'Cost', value: '€' + totalCost.toFixed(0) },
        ].map(stat => (
          <div key={stat.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>
              {stat.label}
            </div>
            <StatNumber value={stat.value} />
          </div>
        ))}
      </div>
    </div>
  )
}
