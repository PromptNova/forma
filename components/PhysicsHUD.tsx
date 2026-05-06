'use client'
import { useFormaStore } from '../lib/store'
import { getScoreGrade } from '../lib/physics'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState, useCallback } from 'react'
import { generateCertificate, type CertificateDesign } from './StabilityCertificate'

const GRADE_COLOR: Record<string, string> = {
  A: '#34c759', B: '#30d158', C: '#ff9f0a', D: '#ff3b30',
}

// Toast hook
function useToast() {
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null)
  const show = useCallback((msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 3000)
  }, [])
  return { toast, show }
}

// Share Modal
function ShareModal({ open, onClose, previewUrl, design, onDownload }: {
  open: boolean; onClose: () => void; previewUrl: string | null
  design: CertificateDesign; onDownload: () => void
}) {
  const [copied, setCopied] = useState(false)
  const shareText = `My furniture design is physics-validated by Forma! Score: ${design.letter} (${design.score}% stable) 🪑 Built with #Forma3D → forma.app`
  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`

  const handleCopy = () => {
    navigator.clipboard.writeText('https://forma.app').then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={onClose}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 1000, backdropFilter: 'blur(8px)' }}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
            style={{
              position: 'fixed', top: '50%', left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 320, background: 'var(--panel)',
              border: '0.5px solid var(--bd)',
              borderRadius: 20, padding: 20, zIndex: 1001,
              boxShadow: 'var(--sh3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ fontSize: 15, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: 'var(--t)', letterSpacing: '-0.3px' }}>
                🏆 Certificate ready!
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 18, cursor: 'pointer', borderRadius: 6 }}>×</button>
            </div>

            {previewUrl && (
              <div style={{ width: '100%', height: 180, borderRadius: 10, overflow: 'hidden', background: 'var(--p2)', marginBottom: 14, border: '0.5px solid var(--bd)' }}>
                <img src={previewUrl} alt="Certificate preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}

            <div style={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fontWeight: 500, color: 'var(--t3)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: 10 }}>
              Share your stable design
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button onClick={onDownload} style={{
                background: 'var(--acc)', color: '#fff', border: 'none',
                borderRadius: 10, padding: '10px 16px', fontSize: 13,
                fontFamily: 'Inter, sans-serif', fontWeight: 500, cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: 8,
              }}>📸 Download PNG</button>

              <button onClick={handleCopy} style={{
                background: 'var(--p2)', color: copied ? 'var(--gr)' : 'var(--t)',
                border: '0.5px solid var(--bd)', borderRadius: 10, padding: '10px 16px',
                fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                transition: 'color 0.2s',
              }}>🔗 {copied ? 'Copied!' : 'Copy link'}</button>

              <a href={twitterUrl} target="_blank" rel="noopener noreferrer" style={{
                background: 'var(--p2)', color: 'var(--t)',
                border: '0.5px solid var(--bd)', borderRadius: 10, padding: '10px 16px',
                fontSize: 13, fontFamily: 'Inter, sans-serif', fontWeight: 500,
                cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                textDecoration: 'none',
              }}>📤 Share on Twitter/X</a>
            </div>

            <div style={{ marginTop: 14, fontSize: 11, fontFamily: 'Inter, sans-serif', color: 'var(--t3)', textAlign: 'center' }}>
              Built & validated in Forma
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Score Ring
function ScoreRing({ score }: { score: number }) {
  const r = 22, circ = 2 * Math.PI * r
  const grade = getScoreGrade(score)
  const color = GRADE_COLOR[grade]
  const dash = (score / 100) * circ

  return (
    <svg width="56" height="56" viewBox="0 0 56 56">
      <circle cx={28} cy={28} r={r} fill="none" stroke="var(--p3)" strokeWidth={3.5} />
      <motion.circle cx={28} cy={28} r={r} fill="none" stroke={color} strokeWidth={3.5}
        strokeLinecap="round" strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        transform="rotate(-90 28 28)"
      />
      <text x={28} y={32} textAnchor="middle" fill={color} fontSize={15} fontFamily="Inter, sans-serif" fontWeight={700}>{grade}</text>
    </svg>
  )
}

// Analytics tracker
function trackEvent(type: string, data: Record<string, unknown>) {
  try {
    const API = process.env.NEXT_PUBLIC_API_URL || 'https://forma-api.onrender.com'
    fetch(`${API}/analytics/event`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_type: type, ...data }),
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

export default function PhysicsHUD() {
  const { physics, parts, currentDesignId } = useFormaStore()
  const prevScore = useRef<number | null>(null)
  const [generating, setGenerating] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [certBlob, setCertBlob] = useState<Blob | null>(null)
  const { toast, show: showToast } = useToast()

  useEffect(() => {
    if (physics && prevScore.current !== physics.score) {
      prevScore.current = physics.score
    }
  }, [physics?.score])

  if (!physics || parts.length === 0) return null

  const { stable, score, reasons, legCount, surfaceCount, com } = physics
  const grade = getScoreGrade(score)
  const totalWeight = parts.reduce((s, p) => s + (WEIGHTS[p.type] || 2), 0)
  const totalCost = parts.reduce((s, p) => s + (PRICES[p.type] || 0), 0)
  const maxHeightCm = Math.round(Math.max(...parts.map(p => (p.y || 0) + 0.4)) * 100)

  const certDesign: CertificateDesign = {
    name: localStorage.getItem('forma_design_name') || 'My Design',
    score, letter: grade,
    parts: parts.length, weightKg: Math.round(totalWeight * 10) / 10,
    heightCm: maxHeightCm, costEur: Math.round(totalCost),
    stableAt: new Date(),
  }

  const gradeColor = GRADE_COLOR[grade]

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
      trackEvent('certificate_downloaded', { score: grade, score_pct: score })
      setShowModal(true)
      showToast('Certificate downloaded ✓')
    } catch (err) {
      showToast('Failed to generate certificate', 'error')
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
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            style={{
              position: 'fixed', bottom: 80, left: '50%',
              transform: 'translateX(-50%)',
              background: toast.type === 'error' ? 'var(--rd)' : 'var(--t)',
              color: toast.type === 'error' ? '#fff' : 'var(--bg)',
              padding: '8px 16px', borderRadius: 20, fontSize: 12,
              fontFamily: 'Inter, sans-serif', fontWeight: 500,
              zIndex: 2000, boxShadow: 'var(--sh2)', whiteSpace: 'nowrap',
            }}
          >{toast.msg}</motion.div>
        )}
      </AnimatePresence>

      <ShareModal
        open={showModal} onClose={() => setShowModal(false)}
        previewUrl={previewUrl} design={certDesign}
        onDownload={handleDownloadFromModal}
      />

      {/* HUD Card */}
      <motion.div
        initial={{ opacity: 0, x: 16 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
        style={{
          position: 'absolute', top: 14, right: 14,
          background: 'var(--panel)',
          border: `0.5px solid ${stable ? 'rgba(52,199,89,0.25)' : 'rgba(255,59,48,0.2)'}`,
          borderRadius: 16, padding: '14px 16px',
          zIndex: 20, width: 196,
          boxShadow: 'var(--sh2)',
          backdropFilter: 'blur(20px)',
          transition: 'border-color 0.3s',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: 'var(--t3)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
              Physics
            </div>
            <motion.div
              key={stable ? 'stable' : 'unstable'}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600, color: stable ? 'var(--gr)' : 'var(--rd)' }}
            >
              {stable ? '✓ Stable' : '⚠ Unstable'}
            </motion.div>
          </div>
          <ScoreRing score={score} />
        </div>

        {/* Reason */}
        <AnimatePresence mode="wait">
          {reasons.length > 0 && reasons[0] !== 'Structure is stable' && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              style={{
                fontSize: 11, fontFamily: 'Inter, sans-serif', color: stable ? 'var(--t2)' : 'var(--rd)',
                padding: '6px 8px', background: stable ? 'rgba(52,199,89,0.07)' : 'rgba(255,59,48,0.07)',
                borderRadius: 7, marginBottom: 10, lineHeight: 1.5,
              }}
            >{reasons[0]}</motion.div>
          )}
        </AnimatePresence>

        {/* Stats grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 5 }}>
          {[
            { label: 'Legs', value: legCount },
            { label: 'Surfaces', value: surfaceCount },
            { label: 'Score', value: score + '/100', mono: true },
            { label: 'Grade', value: grade, color: gradeColor },
          ].map(stat => (
            <div key={stat.label} style={{ background: 'var(--p2)', borderRadius: 8, padding: '6px 8px' }}>
              <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'Inter, sans-serif', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{stat.label}</div>
              <div style={{ fontSize: 13, fontFamily: stat.mono ? 'DM Mono, monospace' : 'Inter, sans-serif', fontWeight: 600, color: stat.color || 'var(--t)', marginTop: 1 }}>{stat.value}</div>
            </div>
          ))}
        </div>

        {/* CoM */}
        <div style={{ marginTop: 8, fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--t3)' }}>
          CoM: {com.x.toFixed(2)}, {com.y.toFixed(2)}, {com.z.toFixed(2)}
        </div>

        {/* Certificate button */}
        <AnimatePresence>
          {stable && (
            <motion.button
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 6 }}
              onClick={handleDownloadCertificate}
              disabled={generating}
              style={{
                marginTop: 10, width: '100%',
                background: generating ? 'var(--p3)' : 'var(--acc)',
                color: generating ? 'var(--t3)' : '#fff',
                border: 'none', borderRadius: 10, padding: '8px 0',
                fontSize: 12, fontFamily: 'Inter, sans-serif', fontWeight: 600,
                cursor: generating ? 'wait' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s', boxShadow: generating ? 'none' : '0 1px 3px rgba(0,113,227,0.3)',
              }}
            >
              {generating ? '⏳ Generating...' : '🏆 Certificate'}
            </motion.button>
          )}
        </AnimatePresence>
      </motion.div>
    </>
  )
}
