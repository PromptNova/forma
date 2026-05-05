'use client'

import { useFormaStore } from '../lib/store'
import { getScoreGrade } from '../lib/physics'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState, useCallback } from 'react'
import { generateCertificate, type CertificateDesign } from './StabilityCertificate'

const GRADE_COLOR = { A: '#3ec87a', B: '#8bc34a', C: '#d4754a', D: '#e05252' }

// ── Simple toast ─────────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<string | null>(null)
  const show = useCallback((msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3500)
  }, [])
  return { toast, show }
}

// ── Share Modal ───────────────────────────────────────────────────────────────
interface ShareModalProps {
  open: boolean
  onClose: () => void
  previewUrl: string | null
  design: CertificateDesign
  onDownload: () => void
}

function ShareModal({ open, onClose, previewUrl, design, onDownload }: ShareModalProps) {
  const [copied, setCopied] = useState(false)

  const shareText = `Mijn meubeldesign is physics-validated door Forma! Score: ${design.letter} (${design.score}% stabiel) 🪑 Gebouwd met #Forma3D → forma.app`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`

  function handleCopy() {
    navigator.clipboard.writeText('https://forma.app').then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,.6)',
              zIndex: 1000, backdropFilter: 'blur(4px)',
            }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 20 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 320, background: '#181614',
              border: '1px solid rgba(212,117,74,.3)',
              borderRadius: 16, padding: '20px', zIndex: 1001,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontFamily: 'Syne, sans-serif', fontWeight: 700, color: '#f5ede0' }}>
                🏆 Certificaat aangemaakt!
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#5a5045', fontSize: 18, cursor: 'pointer', padding: 4, lineHeight: 1 }}>×</button>
            </div>

            {previewUrl && (
              <div style={{ width: '100%', height: 187, borderRadius: 8, overflow: 'hidden', background: '#0e0d0b', marginBottom: 16, border: '1px solid rgba(255,243,220,.08)' }}>
                <img src={previewUrl} alt="Certificate preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ fontSize: 11, fontFamily: 'DM Mono, monospace', color: '#5a5045', letterSpacing: '1px', marginBottom: 12, textTransform: 'uppercase' }}>
              Deel jouw stabiele design:
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <button onClick={onDownload} style={{ background: '#d4754a', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 600, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>📸</span> Download PNG
              </button>
              <button onClick={handleCopy} style={{ background: 'rgba(255,243,220,.06)', color: copied ? '#3ec87a' : '#f5ede0', border: '1px solid rgba(255,243,220,.1)', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, transition: 'color .2s' }}>
                <span>🔗</span> {copied ? 'Gekopieerd!' : 'Kopieer link'}
              </button>
              <a href={twitterUrl} target="_blank" rel="noopener noreferrer" style={{ background: '#1a1a2e', color: '#e8e8f0', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '10px 16px', fontSize: 13, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, cursor: 'pointer', textAlign: 'left', display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none' }}>
                <span>📤</span> Deel op Twitter/X
              </a>
            </div>

            <div style={{ marginTop: 16, fontSize: 10, fontFamily: 'DM Mono, monospace', color: '#5a5045', textAlign: 'center' }}>
              "Gebouwd en gevalideerd in Forma"
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// ── Score ring SVG ────────────────────────────────────────────────────────────
function ScoreRing({ score }: { score: number }) {
  const r = 28, circ = 2 * Math.PI * r
  const grade = getScoreGrade(score)
  const color = GRADE_COLOR[grade]
  const dash  = (score / 100) * circ
  return (
    <svg width={70} height={70} viewBox="0 0 70 70">
      <circle cx={35} cy={35} r={r} fill="none" stroke="var(--p3)" strokeWidth={4} />
      <motion.circle
        cx={35} cy={35} r={r} fill="none" stroke={color}
        strokeWidth={4} strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        transform="rotate(-90 35 35)"
      />
      <text x={35} y={38} textAnchor="middle" fill={color} fontSize={18} fontFamily="Syne, sans-serif" fontWeight={800}>{grade}</text>
    </svg>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function trackEvent(event_type: string, data: Record<string, unknown>) {
  try {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://forma-api.onrender.com'
    fetch(`${API_URL}/analytics/event`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type, ...data }),
    }).catch(() => {})
  } catch (_) {}
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 5000)
}

const WEIGHTS: Record<string, number> = {
  seat: 3.2, tabletop: 8.5, shelf: 2.8, 'leg-short': 1.1, 'leg-long': 1.8,
  crossbar: 0.9, backrest: 2.4, armrest: 1.2, panel: 5.5,
  'prod-oak-top': 22, 'prod-walnut-top': 28, 'prod-pine-desk': 10,
  'prod-bamboo-shelf': 3, 'prod-dining-seat': 2.5, 'prod-cushion': 1.2,
  'prod-hairpin': 0.8, 'prod-scandi-leg': 1.1, 'prod-u-leg': 4.5,
  'prod-tall-panel': 6, 'prod-door': 8,
}
const PRICES: Record<string, number> = {
  seat: 12, tabletop: 45, shelf: 18, 'leg-short': 8, 'leg-long': 12,
  crossbar: 9, backrest: 22, armrest: 15, panel: 35,
  'prod-oak-top': 220, 'prod-walnut-top': 310, 'prod-pine-desk': 95,
  'prod-bamboo-shelf': 24, 'prod-dining-seat': 12, 'prod-cushion': 18,
  'prod-hairpin': 14, 'prod-scandi-leg': 9, 'prod-u-leg': 55,
  'prod-tall-panel': 45, 'prod-door': 68,
}

// ── Main PhysicsHUD ───────────────────────────────────────────────────────────
export default function PhysicsHUD() {
  const { physics, parts, currentDesignId } = useFormaStore()
  const prevScore   = useRef<number | null>(null)
  const [reasonKey, setReasonKey]   = useState(0)
  const [generating, setGenerating] = useState(false)
  const [showModal,  setShowModal]  = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [certBlob,   setCertBlob]   = useState<Blob | null>(null)
  const { toast, show: showToast }  = useToast()

  useEffect(() => {
    if (physics && prevScore.current !== physics.score) {
      prevScore.current = physics.score
      setReasonKey(k => k + 1)
    }
  }, [physics?.score])

  if (!physics || parts.length === 0) return null

  const { stable, score, reasons, legCount, surfaceCount, com } = physics
  const grade = getScoreGrade(score)

  const totalWeight = parts.reduce((s, p) => s + (WEIGHTS[p.type] || 2), 0)
  const totalCost   = parts.reduce((s, p) => s + (PRICES[p.type] || 0), 0)
  const maxHeightCm = Math.round(Math.max(...parts.map(p => (p.y || 0) + 0.4)) * 100)

  const certDesign: CertificateDesign = {
    name: 'Mijn design',
    score,
    letter: grade,
    parts: parts.length,
    weightKg: Math.round(totalWeight * 10) / 10,
    heightCm: maxHeightCm,
    costEur:  Math.round(totalCost),
    stableAt: new Date(),
  }

  async function handleDownloadCertificate() {
    if (generating) return
    setGenerating(true)
    try {
      const blob = await generateCertificate(certDesign)
      setCertBlob(blob)
      const url = URL.createObjectURL(blob)
      setPreviewUrl(url)

      const dateStr = new Date().toISOString().split('T')[0]
      downloadBlob(blob, `forma-certificate-${dateStr}.png`)

      trackEvent('certificate_downloaded', { score: grade, score_pct: score, design_id: currentDesignId })

      if (currentDesignId) {
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://forma-api.onrender.com'
        const token   = typeof window !== 'undefined' ? (localStorage.getItem('forma_token') || '') : ''
        fetch(`${API_URL}/designs/${currentDesignId}/certificate`, {
          method: 'POST', headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {})
      }

      setShowModal(true)
      showToast('Certificaat gedownload ✓ Deel het op Instagram!')
    } catch (err) {
      console.error('Certificate generation failed:', err)
      showToast('Fout bij aanmaken certificaat')
    } finally {
      setGenerating(false)
    }
  }

  function handleDownloadFromModal() {
    if (!certBlob) return
    const dateStr = new Date().toISOString().split('T')[0]
    downloadBlob(certBlob, `forma-certificate-${dateStr}.png`)
  }

  return (
    <>
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{
              position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
              background: '#1a1512', border: '1px solid rgba(62,200,122,.3)',
              color: '#3ec87a', padding: '8px 16px', borderRadius: 8,
              fontSize: 13, fontFamily: 'DM Sans, sans-serif', zIndex: 2000, whiteSpace: 'nowrap',
            }}
          >{toast}</motion.div>
        )}
      </AnimatePresence>

      <ShareModal open={showModal} onClose={() => setShowModal(false)} previewUrl={previewUrl} design={certDesign} onDownload={handleDownloadFromModal} />

      {/* HUD Panel */}
      <motion.div
        initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
        style={{
          position: 'absolute', top: 12, right: 12,
          background: 'var(--panel)',
          border: `1px solid ${stable ? 'rgba(62,200,122,.2)' : 'rgba(224,82,82,.15)'}`,
          borderRadius: 12, padding: 14, zIndex: 20, width: 200,
          transition: 'border-color 320ms',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>Physics</div>
            <motion.div key={stable ? 'stable' : 'unstable'} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', fontWeight: 500, color: stable ? 'var(--gr)' : 'var(--rd)' }}>
              {stable ? '✓ Stable' : '⚠ Unstable'}
            </motion.div>
          </div>
          <ScoreRing score={score} />
        </div>

        <AnimatePresence mode="wait">
          {reasons.length > 0 && (
            <motion.div key={reasonKey}
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.2 }}
              style={{ fontSize: 11, fontFamily: 'DM Sans, sans-serif', color: stable ? 'var(--t2)' : 'var(--rd)', padding: '6px 8px', background: stable ? 'rgba(62,200,122,.06)' : 'rgba(224,82,82,.06)', borderRadius: 6, marginBottom: 10, lineHeight: 1.5 }}>
              {reasons[0]}
            </motion.div>
          )}
        </AnimatePresence>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
          {[
            { label: 'Legs',     value: legCount },
            { label: 'Surfaces', value: surfaceCount },
            { label: 'Score',    value: score + '/100' },
            { label: 'Grade',    value: grade, color: GRADE_COLOR[grade] },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--p2)', borderRadius: 6, padding: '5px 8px' }}>
              <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: 0.5 }}>{stat.label}</div>
              <div style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: stat.color || 'var(--t)', marginTop: 1 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        <div style={{ marginTop: 8, fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--t3)', padding: '4px 0' }}>
          CoM: {com.x.toFixed(2)}, {com.y.toFixed(2)}, {com.z.toFixed(2)}
        </div>

        <AnimatePresence>
          {stable && (
            <motion.button
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }}
              transition={{ duration: 0.25 }}
              onClick={handleDownloadCertificate}
              disabled={generating}
              style={{
                marginTop: 10, width: '100%',
                background: generating ? 'rgba(212,117,74,.5)' : '#d4754a',
                color: '#fff', border: 'none', borderRadius: 8,
                padding: '8px 0', fontSize: 12,
                fontFamily: 'DM Sans, sans-serif', fontWeight: 600,
                cursor: generating ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'background .2s',
              }}
            >
              {generating ? '⏳ Genereren...' : '🏆 Certificaat downloaden'}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
