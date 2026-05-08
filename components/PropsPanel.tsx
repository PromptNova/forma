'use client'
import { useFormaStore } from '../lib/store'
import { PARTS } from '../lib/parts'
import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600,
      color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase',
      marginBottom: 8,
    }}>{children}</div>
  )
}

function Row({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '0.5px solid var(--bd)' }}>
      <span style={{ fontSize: 12, color: 'var(--t2)', fontFamily: 'Inter, sans-serif' }}>{label}</span>
      <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: color || 'var(--t)', fontWeight: 500 }}>{value}</span>
    </div>
  )
}

function NumberInput({ label, value, onChange, step = 0.01, unit = '' }: {
  label: string; value: number; onChange: (v: number) => void; step?: number; unit?: string
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
      <span style={{ width: 12, fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--t3)', fontWeight: 600 }}>{label}</span>
      <input
        type="number" step={step} value={parseFloat(value.toFixed(3))}
        onChange={e => onChange(parseFloat(e.target.value))}
        style={{
          flex: 1, padding: '4px 8px', height: 30,
          background: 'var(--p2)', border: '0.5px solid var(--bd)',
          borderRadius: 7, color: 'var(--t)', fontSize: 11,
          fontFamily: 'DM Mono, monospace', outline: 'none',
          transition: 'border-color 0.15s, box-shadow 0.15s',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--acc)'; e.target.style.boxShadow = '0 0 0 3px var(--acc-glow)' }}
        onBlur={e => { e.target.style.borderColor = 'var(--bd)'; e.target.style.boxShadow = 'none' }}
      />
      {unit && <span style={{ fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono, monospace' }}>{unit}</span>}
    </div>
  )
}

const PHYSICS_COLORS: Record<string, string> = {
  stable: 'var(--gr)', unstable: 'var(--rd)', neutral: 'var(--t3)'
}

export default function PropsPanel() {
  const { parts, selectedId, selectPart, removePart, duplicatePart, updatePart, physics } = useFormaStore()
  const selectedPart = selectedId ? parts.find(p => p.id === selectedId) : null
  const selectedDef = selectedPart ? PARTS[selectedPart.type] : null

  const totalKg = parts.reduce((a, p) => a + (PARTS[p.type]?.kg || 0), 0)
  const totalCost = parts.reduce((a, p) => a + (PARTS[p.type]?.price || 0), 0)
  const maxH = parts.length > 0 ? Math.max(...parts.map(p => {
    const d = PARTS[p.type]; return d ? (p.y + d.h / 2) : 0
  })) : 0

  return (
    <div style={{
      width: 220, height: '100%',
      background: 'var(--panel)',
      borderLeft: '0.5px solid var(--bd)',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
    }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
        <AnimatePresence mode="wait">
          {selectedPart && selectedDef ? (
            <motion.div
              key={selectedPart.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.2 }}
            >
              {/* Part header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t)', letterSpacing: '-0.3px', fontFamily: 'Inter, sans-serif' }}>
                    {selectedDef.label}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                    {selectedDef.kind} · {Math.round(selectedDef.w*100)}×{Math.round(selectedDef.h*100)}×{Math.round(selectedDef.d*100)}cm
                  </div>
                </div>
                <button
                  onClick={() => selectPart(null)}
                  style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 16, padding: 2, borderRadius: 4, lineHeight: 1 }}
                >×</button>
              </div>

              {/* Physics status */}
              {physics && (
                <div style={{
                  padding: '8px 10px', borderRadius: 8, marginBottom: 14,
                  background: physics.perPartStatus[selectedPart.id] === 'stable' ? 'rgba(52,199,89,0.08)' :
                              physics.perPartStatus[selectedPart.id] === 'unstable' ? 'rgba(255,59,48,0.08)' : 'var(--p2)',
                  border: '0.5px solid ' + (
                    physics.perPartStatus[selectedPart.id] === 'stable' ? 'rgba(52,199,89,0.2)' :
                    physics.perPartStatus[selectedPart.id] === 'unstable' ? 'rgba(255,59,48,0.2)' : 'var(--bd)'
                  ),
                  fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                  color: PHYSICS_COLORS[physics.perPartStatus[selectedPart.id]] || 'var(--t3)',
                }}>
                  {physics.perPartStatus[selectedPart.id] === 'stable' ? '✓ Stable' :
                   physics.perPartStatus[selectedPart.id] === 'unstable' ? '⚠ Unstable' : '◦ Neutral'}
                </div>
              )}

              {/* Position */}
              <div style={{ marginBottom: 16 }}>
                <Label>Position</Label>
                {(['x', 'y', 'z'] as const).map(axis => (
                  <NumberInput key={axis} label={axis.toUpperCase()} value={selectedPart[axis]}
                    onChange={v => updatePart(selectedPart.id, { [axis]: v })} step={0.01} unit="m" />
                ))}
              </div>

              {/* Rotation */}
              <div style={{ marginBottom: 16 }}>
                <Label>Rotation Y</Label>
                <input
                  type="range" min={0} max={Math.PI * 2} step={Math.PI / 8}
                  value={selectedPart.rotationY || 0}
                  onChange={e => updatePart(selectedPart.id, { rotationY: parseFloat(e.target.value) })}
                  style={{ width: '100%', accentColor: 'var(--acc)', height: 4, cursor: 'pointer' }}
                />
                <div style={{ textAlign: 'right', fontSize: 10, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', marginTop: 3 }}>
                  {Math.round((selectedPart.rotationY || 0) * 180 / Math.PI)}°
                </div>
              </div>

              {/* Properties */}
              <div style={{ marginBottom: 16 }}>
                <Label>Properties</Label>
                <div style={{ background: 'var(--p2)', borderRadius: 10, padding: '2px 10px', border: '0.5px solid var(--bd)' }}>
                  <Row label="Weight" value={selectedDef.kg + ' kg'} />
                  <Row label="Price" value={'€' + selectedDef.price} color="var(--acc)" />
                  <Row label="ID" value={selectedPart.id} />
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={() => duplicatePart(selectedPart.id)}
                  style={{
                    flex: 1, padding: '8px 0', background: 'var(--p2)',
                    border: '0.5px solid var(--bd)', borderRadius: 8,
                    color: 'var(--t2)', fontSize: 12, cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif', fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--p3)'; e.currentTarget.style.color = 'var(--t)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'var(--p2)'; e.currentTarget.style.color = 'var(--t2)' }}
                >
                  Duplicate
                </button>
                <button
                  onClick={() => removePart(selectedPart.id)}
                  style={{
                    flex: 1, padding: '8px 0', background: 'rgba(255,59,48,0.07)',
                    border: '0.5px solid rgba(255,59,48,0.2)', borderRadius: 8,
                    color: 'var(--rd)', fontSize: 12, cursor: 'pointer',
                    fontFamily: 'Inter, sans-serif', fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.12)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,59,48,0.07)' }}
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
              style={{ textAlign: 'center', padding: '40px 0' }}
            >
              {/* SVG illustration */}
              <svg width="52" height="52" viewBox="0 0 52 52" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
                <rect x="10" y="26" width="32" height="4" rx="2" stroke="var(--t3)" strokeWidth="1.5"/>
                <rect x="13" y="12" width="4" height="14" rx="1" stroke="var(--t3)" strokeWidth="1.5"/>
                <rect x="35" y="12" width="4" height="14" rx="1" stroke="var(--t3)" strokeWidth="1.5"/>
                <path d="M26 36V44" stroke="var(--t3)" strokeWidth="1.5" strokeDasharray="2 2"/>
                <circle cx="26" cy="8" r="4" stroke="var(--t3)" strokeWidth="1.5"/>
                <path d="M26 4V2M26 14V12M22 8H20M32 8H30M22.8 5.2L21.4 3.8M30 12.2L31.4 13.6" stroke="var(--t3)" strokeWidth="1"/>
              </svg>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t2)', marginBottom: 6, fontFamily: 'Inter, sans-serif' }}>
                No part selected
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)', lineHeight: 1.5, fontFamily: 'Inter, sans-serif' }}>
                Click a part in the canvas to edit its properties
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* BOM table */}
        {parts.length > 0 && (
          <div style={{ marginTop: 16 }}>
            <Label>Bill of Materials</Label>
            <div style={{ background: 'var(--p2)', borderRadius: 10, padding: '2px 10px', border: '0.5px solid var(--bd)', maxHeight: 160, overflowY: 'auto' }}>
              {parts.map(p => {
                const def = PARTS[p.type]; if (!def) return null
                return (
                  <div
                    key={p.id}
                    onClick={() => selectPart(p.id)}
                    style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '5px 0', borderBottom: '0.5px solid var(--bd)',
                      cursor: 'pointer', borderRadius: 4,
                      background: selectedId === p.id ? 'transparent' : 'transparent',
                    }}
                  >
                    <span style={{ fontSize: 11, color: selectedId === p.id ? 'var(--acc)' : 'var(--t2)', fontFamily: 'Inter, sans-serif' }}>
                      {def.label}
                    </span>
                    <span style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono, monospace' }}>€{def.price}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Stats footer */}
      <div style={{
        borderTop: '0.5px solid var(--bd)', padding: '10px 16px',
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8,
      }}>
        {[
          { label: 'Parts', value: parts.length },
          { label: 'Weight', value: totalKg.toFixed(1) + 'kg' },
          { label: 'Height', value: Math.round(maxH * 100) + 'cm' },
          { label: 'Cost', value: '€' + totalCost.toFixed(0) },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'Inter, sans-serif', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 2 }}>{s.label}</div>
            <div style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', fontWeight: 600, color: 'var(--t)' }}>{s.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
