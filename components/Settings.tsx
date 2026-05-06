'use client'
import { motion, AnimatePresence } from 'framer-motion'
import { useFormaStore } from '../lib/store'

function Toggle({ on, onToggle, label }: { on: boolean; onToggle: () => void; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '0.5px solid var(--bd)' }}>
      <span style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', color: 'var(--t)', fontWeight: 500 }}>{label}</span>
      <div
        className={`toggle-track ${on ? 'on' : ''}`}
        onClick={onToggle}
      >
        <div className="toggle-thumb" />
      </div>
    </div>
  )
}

function SettingRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ padding: '10px 0', borderBottom: '0.5px solid var(--bd)' }}>
      <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
        {label}
      </div>
      {children}
    </div>
  )
}

const SHORTCUT_MAP = [
  ['⌘K', 'Command palette'],
  ['⌘Z / ⌘Y', 'Undo / Redo'],
  ['⌘D', 'Duplicate selected'],
  ['⌘A', 'Select all'],
  ['⌘⇧D', 'Toggle dark mode'],
  ['⌘⇧F', 'Zoom to fit'],
  ['Delete', 'Delete selected'],
  ['1–4', 'Camera presets'],
  ['G', 'Toggle grid'],
  ['W', 'Wireframe mode'],
  ['F', 'Fit to screen'],
  ['R', 'Reset camera'],
  ['?', 'Open tutorial'],
  [',', 'Open settings'],
  ['Esc', 'Deselect / close'],
]

export default function Settings() {
  const {
    setShowSettings, theme, setTheme,
    showGrid, setShowGrid, showCoM, setShowCoM,
    showShadows, setShowShadows, showFog, setShowFog,
    snapEnabled, setSnapEnabled, symmetryEnabled, setSymmetryEnabled,
    autoRotate, setAutoRotate,
    cameraSpeed, setCameraSpeed,
  } = useFormaStore()

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={() => setShowSettings(false)}
        style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.15)', backdropFilter: 'blur(4px)' }}
      />
      <motion.div
        initial={{ x: 380, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        exit={{ x: 380, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 400, damping: 32 }}
        style={{
          position: 'fixed', right: 0, top: 0, bottom: 0, zIndex: 901,
          width: 340, background: 'var(--panel)',
          borderLeft: '0.5px solid var(--bd)',
          boxShadow: 'var(--sh3)',
          overflowY: 'auto',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px', borderBottom: '0.5px solid var(--bd)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, background: 'var(--panel)',
          backdropFilter: 'blur(20px)', zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--t)', fontFamily: 'Inter, sans-serif', letterSpacing: '-0.4px' }}>Settings</div>
            <div style={{ fontSize: 12, color: 'var(--t3)', fontFamily: 'Inter, sans-serif', marginTop: 2 }}>Forma 3D Physics Studio</div>
          </div>
          <button
            onClick={() => setShowSettings(false)}
            style={{ background: 'var(--p2)', border: '0.5px solid var(--bd)', borderRadius: 20, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--t2)', fontSize: 14, fontWeight: 500 }}
          >×</button>
        </div>

        <div style={{ padding: '8px 24px' }}>
          {/* Appearance */}
          <div style={{ paddingTop: 16, marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>
              Appearance
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
              {(['light', 'dark', 'bw'] as const).map(t => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  style={{
                    padding: '10px 0', borderRadius: 10, cursor: 'pointer',
                    background: theme === t ? 'var(--acc)' : 'var(--p2)',
                    color: theme === t ? '#fff' : 'var(--t2)',
                    border: theme === t ? 'none' : '0.5px solid var(--bd)',
                    fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                    textTransform: 'capitalize', transition: 'all 0.15s',
                  }}
                >
                  {t === 'light' ? '☀ Light' : t === 'dark' ? '◑ Dark' : '◕ B&W'}
                </button>
              ))}
            </div>
          </div>

          {/* Scene */}
          <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>Scene</div>
          <Toggle on={showGrid} onToggle={() => setShowGrid(!showGrid)} label="Show grid" />
          <Toggle on={showShadows} onToggle={() => setShowShadows(!showShadows)} label="Shadows" />
          <Toggle on={showCoM} onToggle={() => setShowCoM(!showCoM)} label="Center of mass" />
          <Toggle on={showFog} onToggle={() => setShowFog(!showFog)} label="Fog effect" />

          {/* Physics */}
          <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, marginTop: 16 }}>Physics</div>
          <Toggle on={snapEnabled} onToggle={() => setSnapEnabled(!snapEnabled)} label="Snap to grid" />
          <Toggle on={symmetryEnabled} onToggle={() => setSymmetryEnabled(!symmetryEnabled)} label="Mirror symmetry" />

          {/* Camera */}
          <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6, marginTop: 16 }}>Camera</div>
          <Toggle on={autoRotate} onToggle={() => setAutoRotate(!autoRotate)} label="Auto-rotate" />
          <div style={{ padding: '10px 0', borderBottom: '0.5px solid var(--bd)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontFamily: 'Inter, sans-serif', color: 'var(--t)', fontWeight: 500 }}>Camera speed</span>
              <span style={{ fontSize: 12, fontFamily: 'DM Mono, monospace', color: 'var(--t3)' }}>{cameraSpeed.toFixed(1)}×</span>
            </div>
            <input
              type="range" min={0.2} max={3} step={0.1} value={cameraSpeed}
              onChange={e => setCameraSpeed(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--acc)', cursor: 'pointer' }}
            />
          </div>

          {/* Keyboard shortcuts */}
          <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: 'var(--t3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8, marginTop: 20 }}>
            Keyboard Shortcuts
          </div>
          <div style={{ background: 'var(--p2)', borderRadius: 12, padding: '2px 12px', border: '0.5px solid var(--bd)' }}>
            {SHORTCUT_MAP.map(([key, desc]) => (
              <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '0.5px solid var(--bd)' }}>
                <span style={{ fontSize: 12, color: 'var(--t2)', fontFamily: 'Inter, sans-serif' }}>{desc}</span>
                <kbd style={{
                  fontFamily: 'DM Mono, monospace', fontSize: 11, color: 'var(--t)',
                  background: 'var(--panel)', padding: '2px 7px', borderRadius: 5,
                  border: '0.5px solid var(--bd2)', boxShadow: '0 1px 0 var(--bd2)',
                }}>{key}</kbd>
              </div>
            ))}
          </div>

          {/* About */}
          <div style={{ textAlign: 'center', padding: '24px 0 16px', color: 'var(--t3)', fontSize: 11, fontFamily: 'Inter, sans-serif' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t2)', marginBottom: 4 }}>Forma 3D</div>
            <div>3D Furniture Physics Studio</div>
            <div style={{ marginTop: 4 }}>Build · Validate · Ship</div>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
