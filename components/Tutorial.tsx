'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { useFormaStore } from '../lib/store'

const STEPS = [
  {
    title: 'Welcome to Forma',
    desc: 'Forma is a 3D furniture physics studio. Build furniture designs and validate them with real-time physics simulation.',
    icon: '◻',
    position: 'center' as const,
    tip: 'Press ? at any time to open this tutorial',
  },
  {
    title: 'Add Parts',
    desc: 'Use the left sidebar to browse and add parts. Click any part to place it on the canvas. Or press ⌘K to open the command palette.',
    icon: '⊞',
    position: 'left' as const,
    tip: 'Try loading a preset from the Presets tab',
  },
  {
    title: 'Physics Validation',
    desc: 'The physics engine validates your design in real-time. Stable structures glow green, unstable ones pulse red. Watch the Physics HUD in the top-right.',
    icon: '⚡',
    position: 'right' as const,
    tip: 'A score of A means excellent structural integrity',
  },
  {
    title: 'Controls & Export',
    desc: 'Drag parts to reposition them. Drag empty space to orbit the camera. Scroll to zoom. Select a part and press D to duplicate, Del to remove.',
    icon: '⌘',
    position: 'center' as const,
    tip: 'Use the Export button to save your design as JSON',
  },
]

const POSITION_STYLES = {
  center: { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
  left: { top: '50%', left: 260, transform: 'translateY(-50%)' },
  right: { top: '50%', right: 232, transform: 'translateY(-50%)' },
}

export default function Tutorial() {
  const { tutorialStep, setTutorialStep, setShowTutorial } = useFormaStore()
  const step = STEPS[tutorialStep]

  const handlePrev = () => setTutorialStep(Math.max(0, tutorialStep - 1))
  const handleNext = () => {
    if (tutorialStep < STEPS.length - 1) setTutorialStep(tutorialStep + 1)
    else setShowTutorial(false)
  }

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.4)',
          zIndex: 800,
        }}
        onClick={() => setShowTutorial(false)}
      />

      {/* Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={tutorialStep}
          initial={{ opacity: 0, scale: 0.95, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -8 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          style={{
            position: 'fixed',
            ...POSITION_STYLES[step.position],
            width: 340,
            background: 'var(--panel)',
            border: '1px solid var(--bd2)',
            borderRadius: 14,
            padding: 24,
            zIndex: 801,
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: 'var(--p3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, marginBottom: 14,
          }}>
            {step.icon}
          </div>

          {/* Title */}
          <h3 style={{
            fontFamily: 'Syne, sans-serif',
            fontWeight: 800,
            fontSize: 18,
            color: 'var(--t)',
            marginBottom: 8,
          }}>
            {step.title}
          </h3>

          {/* Description */}
          <p style={{
            fontSize: 13,
            color: 'var(--t2)',
            lineHeight: 1.6,
            fontFamily: 'DM Sans, sans-serif',
            marginBottom: 14,
          }}>
            {step.desc}
          </p>

          {/* Tip */}
          <div style={{
            padding: '8px 12px',
            background: 'rgba(212,117,74,.08)',
            border: '1px solid rgba(212,117,74,.15)',
            borderRadius: 7,
            fontSize: 11,
            color: 'var(--acc2)',
            fontFamily: 'DM Sans, sans-serif',
            marginBottom: 20,
          }}>
            💡 {step.tip}
          </div>

          {/* Progress dots + nav */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {/* Dots */}
            <div style={{ display: 'flex', gap: 5 }}>
              {STEPS.map((_, i) => (
                <div
                  key={i}
                  onClick={() => setTutorialStep(i)}
                  style={{
                    width: i === tutorialStep ? 16 : 6,
                    height: 6,
                    borderRadius: 3,
                    background: i === tutorialStep ? 'var(--acc)' : 'var(--p3)',
                    cursor: 'pointer',
                    transition: 'all 200ms',
                  }}
                />
              ))}
            </div>

            {/* Buttons */}
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                onClick={() => setShowTutorial(false)}
                style={{
                  padding: '6px 12px',
                  background: 'transparent',
                  border: '1px solid var(--bd)',
                  borderRadius: 7,
                  color: 'var(--t3)',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Skip
              </button>
              {tutorialStep > 0 && (
                <button
                  onClick={handlePrev}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--p2)',
                    border: '1px solid var(--bd)',
                    borderRadius: 7,
                    color: 'var(--t2)',
                    fontSize: 12,
                    cursor: 'pointer',
                    fontFamily: 'DM Sans, sans-serif',
                  }}
                >
                  ← Back
                </button>
              )}
              <button
                onClick={handleNext}
                style={{
                  padding: '6px 14px',
                  background: 'var(--acc)',
                  border: 'none',
                  borderRadius: 7,
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                  fontWeight: 500,
                }}
              >
                {tutorialStep === STEPS.length - 1 ? 'Done ✓' : 'Next →'}
              </button>
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </>
  )
}
