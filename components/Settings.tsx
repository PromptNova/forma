'use client'

import { motion } from 'framer-motion'
import { useFormaStore } from '../lib/store'
import { Theme } from '../lib/store'

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
      <span style={{ fontSize: 13, color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif' }}>{label}</span>
      <div
        onClick={onChange}
        style={{
          width: 34, height: 18, borderRadius: 9,
          background: checked ? 'var(--acc)' : 'var(--p3)',
          cursor: 'pointer', position: 'relative',
          transition: 'background 200ms',
        }}
      >
        <div style={{
          position: 'absolute',
          top: 2, left: checked ? 18 : 2,
          width: 14, height: 14, borderRadius: 7,
          background: '#fff',
          transition: 'left 200ms',
        }} />
      </div>
    </div>
  )
}

const THEMES: { id: Theme; label: string; bg: string; accent: string }[] = [
  { id: 'dark', label: 'Dark', bg: '#0e0d0b', accent: '#d4754a' },
  { id: 'light', label: 'Light', bg: '#f5f1ea', accent: '#d4754a' },
  { id: 'bw', label: 'B&W', bg: '#0a0a0a', accent: '#888' },
]

export default function Settings() {
  const {
    theme, setTheme,
    showGrid, setShowGrid,
    showCoM, setShowCoM,
    showShadows, setShowShadows,
    showFog, setShowFog,
    snapEnabled, setSnapEnabled,
    symmetryEnabled, setSymmetryEnabled,
    cameraSpeed, setCameraSpeed,
    setShowSettings,
    setShowTutorial,
    clearAll,
    loadPreset,
  } = useFormaStore()

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={() => setShowSettings(false)}
        style={{
          position: 'fixed', inset: 0,
          background: 'transparent',
          zIndex: 900,
        }}
      />

      {/* Panel */}
      <motion.div
        initial={{ x: 292 }}
        animate={{ x: 0 }}
        exit={{ x: 292 }}
        transition={{ type: 'tween', duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'fixed',
          top: 50, right: 0, bottom: 0,
          width: 292,
          background: 'var(--panel)',
          borderLeft: '1px solid var(--bd)',
          zIndex: 901,
          overflowY: 'auto',
        }}
      >
        <div style={{ padding: '16px 20px' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <span style={{ fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: 'var(--t)', fontSize: 15 }}>Settings</span>
            <button
              onClick={() => setShowSettings(false)}
              style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
            >✕</button>
          </div>

          {/* Theme section */}
          <Section label="Theme">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
              {THEMES.map(t => (
                <motion.button
                  key={t.id}
                  whileHover={{ translateY: -1 }}
                  onClick={() => setTheme(t.id)}
                  style={{
                    padding: '12px 8px',
                    background: t.bg,
                    border: theme === t.id ? '2px solid var(--acc)' : '2px solid var(--bd)',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 200ms',
                  }}
                >
                  <div style={{
                    width: 20, height: 20, borderRadius: 4,
                    background: t.accent,
                  }} />
                  <span style={{
                    fontSize: 10, fontFamily: 'DM Sans, sans-serif',
                    color: t.id === 'light' ? '#6b5e4e' : '#9e9182',
                  }}>{t.label}</span>
                </motion.button>
              ))}
            </div>
          </Section>

          {/* Viewport section */}
          <Section label="Viewport">
            <Toggle checked={showGrid} onChange={() => setShowGrid(!showGrid)} label="Grid" />
            <Toggle checked={showCoM} onChange={() => setShowCoM(!showCoM)} label="Center of Mass" />
            <Toggle checked={showShadows} onChange={() => setShowShadows(!showShadows)} label="Shadows" />
            <Toggle checked={showFog} onChange={() => setShowFog(!showFog)} label="Fog" />
          </Section>

          {/* Controls section */}
          <Section label="Controls">
            <Toggle checked={snapEnabled} onChange={() => setSnapEnabled(!snapEnabled)} label="Snap to Grid" />
            <Toggle checked={symmetryEnabled} onChange={() => setSymmetryEnabled(!symmetryEnabled)} label="Symmetry" />
            <div style={{ padding: '8px 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 13, color: 'var(--t2)', fontFamily: 'DM Sans, sans-serif' }}>Camera Speed</span>
                <span style={{ fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--t3)' }}>{cameraSpeed.toFixed(1)}x</span>
              </div>
              <input
                type="range" min={0.1} max={3} step={0.1}
                value={cameraSpeed}
                onChange={e => setCameraSpeed(parseFloat(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </Section>

          {/* Actions section */}
          <Section label="Quick Actions">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {(['chair', 'table', 'desk'] as const).map(preset => (
                <button
                  key={preset}
                  onClick={() => { loadPreset(preset); setShowSettings(false) }}
                  style={{
                    padding: '8px 12px',
                    background: 'var(--p2)', border: '1px solid var(--bd)',
                    borderRadius: 7, color: 'var(--t2)',
                    fontSize: 12, cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                    textAlign: 'left',
                    textTransform: 'capitalize',
                    transition: 'background 200ms',
                  }}
                >
                  Load {preset} preset
                </button>
              ))}
              <button
                onClick={() => { setShowTutorial(true); setShowSettings(false) }}
                style={{
                  padding: '8px 12px',
                  background: 'var(--p2)', border: '1px solid var(--bd)',
                  borderRadius: 7, color: 'var(--t2)',
                  fontSize: 12, cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  textAlign: 'left',
                }}
              >
                Open Tutorial
              </button>
              <button
                onClick={() => { clearAll(); setShowSettings(false) }}
                style={{
                  padding: '8px 12px',
                  background: 'rgba(224,82,82,.08)', border: '1px solid rgba(224,82,82,.2)',
                  borderRadius: 7, color: 'var(--rd)',
                  fontSize: 12, cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  textAlign: 'left',
                }}
              >
                Clear All Parts
              </button>
            </div>
          </Section>

          {/* Shortcuts */}
          <Section label="Keyboard Shortcuts">
            {[
              ['⌘K', 'Command palette'],
              ['⌘Z', 'Undo'],
              ['⌘Y', 'Redo'],
              ['D', 'Duplicate part'],
              ['Del', 'Delete part'],
              ['R', 'Reset camera'],
              ['F', 'Fullscreen'],
              ['?', 'Tutorial'],
              ['Esc', 'Deselect'],
            ].map(([key, desc]) => (
              <div key={key} style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '5px 0',
              }}>
                <span style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif' }}>{desc}</span>
                <kbd style={{
                  fontFamily: 'DM Mono, monospace', fontSize: 10,
                  color: 'var(--t2)', background: 'var(--p3)',
                  padding: '2px 6px', borderRadius: 4,
                  border: '1px solid var(--bd2)',
                }}>{key}</kbd>
              </div>
            ))}
          </Section>
        </div>
      </motion.div>
    </>
  )
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: 10, fontFamily: 'DM Mono, monospace',
        color: 'var(--t3)', letterSpacing: 1,
        textTransform: 'uppercase', marginBottom: 10,
        paddingBottom: 6, borderBottom: '1px solid var(--bd)',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}
