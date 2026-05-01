'use client'

import { useFormaStore } from '../lib/store'
import { getScoreGrade } from '../lib/physics'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const GRADE_COLOR = { A: '#3ec87a', B: '#8bc34a', C: '#d4754a', D: '#e05252' }
const GRADE_BG = { A: 'rgba(62,200,122,.1)', B: 'rgba(139,195,74,.1)', C: 'rgba(212,117,74,.1)', D: 'rgba(224,82,82,.1)' }

// SVG Score ring
function ScoreRing({ score }: { score: number }) {
  const r = 28
  const circ = 2 * Math.PI * r
  const grade = getScoreGrade(score)
  const color = GRADE_COLOR[grade]
  const dash = (score / 100) * circ

  return (
    <svg width={70} height={70} viewBox="0 0 70 70">
      {/* Background ring */}
      <circle cx={35} cy={35} r={r} fill="none" stroke="var(--p3)" strokeWidth={4} />
      {/* Score ring */}
      <motion.circle
        cx={35} cy={35} r={r}
        fill="none"
        stroke={color}
        strokeWidth={4}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: circ - dash }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        transform="rotate(-90 35 35)"
      />
      {/* Grade label */}
      <text x={35} y={38} textAnchor="middle" fill={color} fontSize={18} fontFamily="Syne, sans-serif" fontWeight={800}>
        {grade}
      </text>
    </svg>
  )
}

export default function PhysicsHUD() {
  const { physics, parts } = useFormaStore()
  const prevScore = useRef<number | null>(null)
  const [reasonKey, setReasonKey] = useState(0)

  useEffect(() => {
    if (physics && prevScore.current !== physics.score) {
      prevScore.current = physics.score
      setReasonKey(k => k + 1)
    }
  }, [physics?.score])

  if (!physics || parts.length === 0) return null

  const { stable, score, reasons, legCount, surfaceCount, com } = physics
  const grade = getScoreGrade(score)

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      style={{
        position: 'absolute',
        top: 12,
        right: 12,
        background: 'var(--panel)',
        border: `1px solid ${stable ? 'rgba(62,200,122,.2)' : 'rgba(224,82,82,.15)'}`,
        borderRadius: 12,
        padding: 14,
        zIndex: 20,
        width: 200,
        transition: 'border-color 320ms',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontSize: 10, fontFamily: 'DM Mono, monospace', color: 'var(--t3)', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 2 }}>
            Physics
          </div>
          <motion.div
            key={stable ? 'stable' : 'unstable'}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            style={{
              fontSize: 12,
              fontFamily: 'DM Sans, sans-serif',
              fontWeight: 500,
              color: stable ? 'var(--gr)' : 'var(--rd)',
            }}
          >
            {stable ? '✓ Stable' : '⚠ Unstable'}
          </motion.div>
        </div>
        <ScoreRing score={score} />
      </div>

      {/* Reason */}
      <AnimatePresence mode="wait">
        {reasons.length > 0 && (
          <motion.div
            key={reasonKey}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            style={{
              fontSize: 11,
              fontFamily: 'DM Sans, sans-serif',
              color: stable ? 'var(--t2)' : 'var(--rd)',
              padding: '6px 8px',
              background: stable ? 'rgba(62,200,122,.06)' : 'rgba(224,82,82,.06)',
              borderRadius: 6,
              marginBottom: 10,
              lineHeight: 1.5,
            }}
          >
            {reasons[0]}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          { label: 'Legs', value: legCount },
          { label: 'Surfaces', value: surfaceCount },
          { label: 'Score', value: score + '/100' },
          { label: 'Grade', value: grade, color: GRADE_COLOR[grade] },
        ].map(stat => (
          <div key={stat.label} style={{
            background: 'var(--p2)',
            borderRadius: 6,
            padding: '5px 8px',
          }}>
            <div style={{ fontSize: 9, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {stat.label}
            </div>
            <div style={{ fontSize: 13, fontFamily: 'DM Mono, monospace', color: stat.color || 'var(--t)', marginTop: 1 }}>
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* CoM indicator */}
      <div style={{
        marginTop: 8,
        fontSize: 10,
        fontFamily: 'DM Mono, monospace',
        color: 'var(--t3)',
        padding: '4px 0',
      }}>
        CoM: {com.x.toFixed(2)}, {com.y.toFixed(2)}, {com.z.toFixed(2)}
      </div>
    </motion.div>
  )
}
