'use client'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { useFormaStore } from '../lib/store'
import type { CustomPart } from '../lib/parts'

// ── Types ────────────────────────────────────────────────────
type Step = 1 | 2 | 3
type PartKindOption = { value: string; label: string }

const PART_KIND_OPTIONS: PartKindOption[] = [
  { value: 'surface', label: 'Tabletop / Seat' },
  { value: 'leg',     label: 'Leg' },
  { value: 'back',    label: 'Backrest' },
  { value: 'panel',   label: 'Side Panel' },
  { value: 'support', label: 'Support / Crossbar' },
]

const PROGRESS_STEPS = [
  { label: 'Removing background',   icon: '✂️', durationMs: 8000  },
  { label: 'Reconstructing 3D',      icon: '🧊', durationMs: 12000 },
  { label: 'Generating textures',    icon: '🎨', durationMs: 8000  },
  { label: 'Optimizing model',       icon: '⚡', durationMs: 4000  },
]

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://forma-api.onrender.com'

// ── Mini 3D Viewer ───────────────────────────────────────────
function GLBViewer({ url }: { url: string }) {
  const mountRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !url) return

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(200, 200)
    renderer.shadowMap.enabled = true
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    const camera = new THREE.PerspectiveCamera(45, 1, 0.01, 100)
    camera.position.set(1.5, 1.5, 1.5)
    camera.lookAt(0, 0, 0)

    // Studio lighting — same as main Forma scene
    const ambient = new THREE.AmbientLight(0xfff3dc, 0.6)
    scene.add(ambient)
    const sun = new THREE.DirectionalLight(0xfff3dc, 1.2)
    sun.position.set(3, 5, 4)
    sun.castShadow = true
    scene.add(sun)
    const fill = new THREE.DirectionalLight(0x8090ff, 0.3)
    fill.position.set(-2, 2, -2)
    scene.add(fill)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.dampingFactor = 0.08
    controls.autoRotate = true
    controls.autoRotateSpeed = 2.5
    controls.enablePan = false

    const loader = new GLTFLoader()
    loader.load(
      url,
      (gltf) => {
        const model = gltf.scene

        // Normalize scale so longest axis = 1
        const box = new THREE.Box3().setFromObject(model)
        const size = box.getSize(new THREE.Vector3())
        const center = box.getCenter(new THREE.Vector3())
        const maxDim = Math.max(size.x, size.y, size.z)
        if (maxDim > 0) model.scale.multiplyScalar(1 / maxDim)

        // Re-center after scale
        model.position.sub(center.multiplyScalar(1 / maxDim))

        model.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.castShadow = true
            child.receiveShadow = true
          }
        })
        scene.add(model)
      },
      undefined,
      (err) => console.error('GLB load error', err)
    )

    let raf = 0
    const animate = () => {
      raf = requestAnimationFrame(animate)
      controls.update()
      renderer.render(scene, camera)
    }
    animate()

    return () => {
      cancelAnimationFrame(raf)
      controls.dispose()
      renderer.dispose()
      if (mount.contains(renderer.domElement)) mount.removeChild(renderer.domElement)
    }
  }, [url])

  return (
    <div
      ref={mountRef}
      style={{
        width: 200,
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        background: 'rgba(255,255,255,.04)',
        border: '1px solid var(--bd)',
      }}
    />
  )
}

// ── Main Component ───────────────────────────────────────────
interface PhotoTo3DProps {
  onClose: () => void
}

export default function PhotoTo3D({ onClose }: PhotoTo3DProps) {
  const [step, setStep] = useState<Step>(1)
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string>('')
  const [partName, setPartName] = useState('')
  const [partKind, setPartKind] = useState('leg')
  const [heightCm, setHeightCm] = useState('')
  const [widthCm, setWidthCm] = useState('')
  const [loading, setLoading] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{
    partId: string
    conversionId: string
    modelUrl: string
    previewUrl: string
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)
  const dragRef = useRef(false)
  const addCustomPart = useFormaStore(s => s.addCustomPart)

  // ── File handling ────────────────────────────────────────
  const handleFile = useCallback((f: File) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
      setError('Please use JPG, PNG or WEBP.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large. Max 10MB.')
      return
    }
    setError(null)
    setFile(f)
    const reader = new FileReader()
    reader.onload = e => setPreview(e.target?.result as string)
    reader.readAsDataURL(f)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    dragRef.current = false
    const f = e.dataTransfer.files[0]
    if (f) handleFile(f)
  }, [handleFile])

  // ── Progress simulation ──────────────────────────────────
  const runProgressAnimation = useCallback(() => {
    setProgressStep(0)
    let step = 0
    const advance = () => {
      if (step < PROGRESS_STEPS.length - 1) {
        step++
        setProgressStep(step)
        setTimeout(advance, PROGRESS_STEPS[step].durationMs)
      }
    }
    setTimeout(advance, PROGRESS_STEPS[0].durationMs)
  }, [])

  // ── Submit ───────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    if (!file || !partName || !heightCm || !widthCm) {
      setError('Please fill in all fields.')
      return
    }
    setError(null)
    setLoading(true)
    setStep(3)
    runProgressAnimation()

    try {
      const fd = new FormData()
      fd.append('image', file)
      fd.append('part_name', partName)
      fd.append('part_kind', partKind)
      fd.append('estimated_height_cm', heightCm)
      fd.append('estimated_width_cm', widthCm)

      const token = localStorage.getItem('forma_token') || ''
      const resp = await fetch(`${API_URL}/ai/photo-to-3d`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: fd,
      })

      if (!resp.ok) {
        const data = await resp.json().catch(() => ({}))
        const msg = data?.detail?.message || data?.detail || `Error ${resp.status}`
        if (resp.status === 429) {
          throw new Error(`Quota reached. ${msg}`)
        }
        throw new Error(msg)
      }

      const data = await resp.json()
      setResult({
        partId: data.part_id,
        conversionId: data.conversion_id,
        modelUrl: data.model_url,
        previewUrl: data.preview_image_url,
      })
      setProgressStep(PROGRESS_STEPS.length - 1)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error')
      setStep(2)
    } finally {
      setLoading(false)
    }
  }, [file, partName, partKind, heightCm, widthCm, runProgressAnimation])

  // ── Add to library ───────────────────────────────────────
  const handleAddToLibrary = useCallback(() => {
    if (!result) return
    const part: CustomPart = {
      id: result.partId,
      name: partName,
      kind: partKind as CustomPart['kind'],
      modelUrl: result.modelUrl,
      previewUrl: result.previewUrl,
      widthM: parseFloat(widthCm) / 100,
      heightM: parseFloat(heightCm) / 100,
      depthM: parseFloat(widthCm) / 100,
      source: 'ai_converted',
    }
    addCustomPart(part)
    onClose()
  }, [result, partName, partKind, widthCm, heightCm, addCustomPart, onClose])

  // ── Styles helpers ────────────────────────────────────────
  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '10px 12px',
    background: 'rgba(255,255,255,.05)',
    border: '1px solid var(--bd)',
    borderRadius: 8,
    color: 'var(--t)',
    fontSize: 13,
    fontFamily: 'DM Sans, sans-serif',
    outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 11,
    color: 'var(--t3)',
    fontFamily: 'DM Mono, monospace',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    marginBottom: 4,
    display: 'block',
  }

  return (
    <AnimatePresence>
      {/* Backdrop */}
      <motion.div
        key="backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, zIndex: 200,
          background: 'rgba(0,0,0,.65)',
          backdropFilter: 'blur(4px)',
        }}
      />

      {/* Modal */}
      <motion.div
        key="modal"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        style={{
          position: 'fixed', top: '50%', left: '50%', zIndex: 201,
          transform: 'translate(-50%, -50%)',
          width: 580, maxWidth: 'calc(100vw - 32px)',
          background: '#1a1714',
          border: '1px solid rgba(212,117,74,.25)',
          borderRadius: 16,
          boxShadow: '0 32px 80px rgba(0,0,0,.6)',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '20px 24px 16px',
          borderBottom: '1px solid var(--bd)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 18 }}>📸</span>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: 16, color: 'var(--t)' }}>
                Photo → 3D Model
              </span>
              <span style={{
                fontSize: 10, padding: '2px 7px',
                background: 'rgba(212,117,74,.15)',
                color: 'var(--acc)',
                borderRadius: 20,
                fontFamily: 'DM Mono, monospace',
                border: '1px solid rgba(212,117,74,.3)',
              }}>AI</span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--t3)', fontFamily: 'DM Sans, sans-serif' }}>
              Upload a product photo — ready in ~30 seconds
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: 'var(--t3)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: 4 }}
          >×</button>
        </div>

        {/* Step indicators */}
        <div style={{ display: 'flex', padding: '12px 24px', gap: 8 }}>
          {[1, 2, 3].map(n => (
            <div key={n} style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 22, height: 22, borderRadius: '50%',
                background: step === n ? 'var(--acc)' : step > n ? 'rgba(212,117,74,.4)' : 'var(--p2)',
                border: `1px solid ${step >= n ? 'var(--acc)' : 'var(--bd)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontFamily: 'DM Mono, monospace',
                color: step >= n ? '#fff' : 'var(--t3)',
                flexShrink: 0,
                transition: 'all 300ms',
              }}>{step > n ? '✓' : n}</div>
              <span style={{
                fontSize: 11, fontFamily: 'DM Sans, sans-serif',
                color: step === n ? 'var(--t)' : 'var(--t3)',
                transition: 'all 300ms',
              }}>
                {n === 1 ? 'Upload photo' : n === 2 ? 'Fill in details' : 'Result'}
              </span>
              {n < 3 && <div style={{ flex: 1, height: 1, background: step > n ? 'var(--acc)' : 'var(--bd)', opacity: .5 }} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div style={{ padding: '8px 24px 24px', minHeight: 320 }}>
          <AnimatePresence mode="wait">

            {/* ── STEP 1 — Upload ─────────────────────────────── */}
            {step === 1 && (
              <motion.div key="step1"
                initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}>

                <input
                  ref={fileInputRef}
                  type="file" accept="image/jpeg,image/png,image/webp"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
                />

                {/* Drop zone */}
                <div
                  onDragOver={e => { e.preventDefault(); dragRef.current = true }}
                  onDragLeave={() => { dragRef.current = false }}
                  onDrop={handleDrop}
                  onClick={() => !file && fileInputRef.current?.click()}
                  style={{
                    border: `2px dashed ${file ? 'var(--acc)' : 'var(--bd)'}`,
                    borderRadius: 12,
                    padding: 32,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12,
                    cursor: file ? 'default' : 'pointer',
                    transition: 'border-color 200ms, background 200ms',
                    background: file ? 'rgba(212,117,74,.05)' : 'transparent',
                    position: 'relative',
                  }}
                >
                  {file && preview ? (
                    <>
                      <img
                        src={preview} alt="preview"
                        style={{ width: 120, height: 120, objectFit: 'contain', borderRadius: 8 }}
                      />
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 13, color: 'var(--t)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                          {file.name}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                          {(file.size / 1024).toFixed(0)} KB
                        </div>
                        <button
                          onClick={e => { e.stopPropagation(); setFile(null); setPreview('') }}
                          style={{ marginTop: 8, background: 'none', border: '1px solid var(--bd)', borderRadius: 6, color: 'var(--t3)', fontSize: 11, padding: '4px 10px', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                        >Different photo</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ fontSize: 40 }}>🪑</div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--t)', fontFamily: 'DM Sans, sans-serif' }}>
                          Drop a product photo here
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 4, fontFamily: 'DM Sans, sans-serif' }}>
                          or click to select
                        </div>
                      </div>
                      <div style={{
                        fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono, monospace',
                        background: 'var(--p2)', borderRadius: 6, padding: '6px 12px', textAlign: 'center', lineHeight: 1.6,
                      }}>
                        JPG · PNG · WEBP · max 10MB<br />
                        ✓ White background · ✓ Good lighting · ✓ Full object visible
                      </div>
                    </>
                  )}
                </div>

                {error && (
                  <div style={{ marginTop: 10, padding: '8px 12px', background: 'rgba(224,82,82,.1)', border: '1px solid rgba(224,82,82,.3)', borderRadius: 8, fontSize: 12, color: '#e05252', fontFamily: 'DM Sans, sans-serif' }}>
                    {error}
                  </div>
                )}

                <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={() => { if (file) { setError(null); setStep(2) } else fileInputRef.current?.click() }}
                    style={{
                      padding: '10px 24px',
                      background: file ? 'var(--acc)' : 'var(--p2)',
                      border: '1px solid ' + (file ? 'var(--acc)' : 'var(--bd)'),
                      borderRadius: 8, color: file ? '#fff' : 'var(--t3)',
                      fontSize: 13, fontWeight: 500, cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      transition: 'all 200ms',
                    }}
                  >
                    {file ? 'Volgende →' : 'Selecteer foto'}
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 2 — Details ─────────────────────────────── */}
            {step === 2 && (
              <motion.div key="step2"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>

                <div style={{ display: 'flex', gap: 16 }}>
                  {/* Preview thumbnail */}
                  {preview && (
                    <div style={{ flexShrink: 0 }}>
                      <img src={preview} alt="preview"
                        style={{ width: 80, height: 80, objectFit: 'contain', borderRadius: 8, border: '1px solid var(--bd)', background: 'rgba(255,255,255,.04)' }}
                      />
                    </div>
                  )}

                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {/* Part name */}
                    <div>
                      <label style={labelStyle}>Part name</label>
                      <input
                        value={partName}
                        onChange={e => setPartName(e.target.value)}
                        placeholder="e.g. Hairpin leg chrome"
                        style={inputStyle}
                      />
                    </div>

                    {/* Part type */}
                    <div>
                      <label style={labelStyle}>Part type</label>
                      <select
                        value={partKind}
                        onChange={e => setPartKind(e.target.value)}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                      >
                        {PART_KIND_OPTIONS.map(o => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Dimensions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                      <div>
                        <label style={labelStyle}>Height (cm)</label>
                        <input
                          type="number" min="1" max="500"
                          value={heightCm}
                          onChange={e => setHeightCm(e.target.value)}
                          placeholder="71"
                          style={inputStyle}
                        />
                      </div>
                      <div>
                        <label style={labelStyle}>Width (cm)</label>
                        <input
                          type="number" min="1" max="500"
                          value={widthCm}
                          onChange={e => setWidthCm(e.target.value)}
                          placeholder="4"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div style={{ marginTop: 12, padding: '8px 12px', background: 'rgba(224,82,82,.1)', border: '1px solid rgba(224,82,82,.3)', borderRadius: 8, fontSize: 12, color: '#e05252', fontFamily: 'DM Sans, sans-serif' }}>
                    {error}
                  </div>
                )}

                <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <button
                    onClick={() => setStep(1)}
                    style={{ background: 'none', border: 'none', color: 'var(--t3)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                  >← Back</button>

                  <motion.button
                    whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                    onClick={handleGenerate}
                    disabled={!partName || !heightCm || !widthCm}
                    style={{
                      padding: '11px 28px',
                      background: 'var(--acc)',
                      border: '1px solid var(--acc)',
                      borderRadius: 8, color: '#fff',
                      fontSize: 13, fontWeight: 600, cursor: 'pointer',
                      fontFamily: 'DM Sans, sans-serif',
                      opacity: (!partName || !heightCm || !widthCm) ? 0.5 : 1,
                      display: 'flex', alignItems: 'center', gap: 8,
                    }}
                  >
                    <span>🚀</span> Generate 3D model →
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── STEP 3 — Loading / Result ────────────────────── */}
            {step === 3 && (
              <motion.div key="step3"
                initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}>

                {loading ? (
                  /* Loading state */
                  <div style={{ padding: '24px 0' }}>
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                      <div style={{ fontSize: 13, color: 'var(--t)', fontFamily: 'DM Sans, sans-serif', fontWeight: 500 }}>
                        AI is processing your photo…
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', marginTop: 4 }}>
                        ~30 seconds
                      </div>
                    </div>

                    {/* Progress steps */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {PROGRESS_STEPS.map((ps, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0.3 }}
                          animate={{ opacity: progressStep >= i ? 1 : 0.3 }}
                          style={{
                            display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 14px',
                            background: progressStep >= i ? 'rgba(212,117,74,.08)' : 'transparent',
                            border: `1px solid ${progressStep >= i ? 'rgba(212,117,74,.2)' : 'var(--bd)'}`,
                            borderRadius: 8,
                            transition: 'all 400ms',
                          }}
                        >
                          <span style={{ fontSize: 20, flexShrink: 0 }}>
                            {progressStep > i ? '✅' : progressStep === i ? ps.icon : '⏳'}
                          </span>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 12, fontFamily: 'DM Sans, sans-serif', color: progressStep >= i ? 'var(--t)' : 'var(--t3)', fontWeight: progressStep === i ? 500 : 400 }}>
                              {ps.label}
                            </div>
                          </div>
                          {progressStep === i && (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              style={{ width: 14, height: 14, border: '2px solid var(--acc)', borderTopColor: 'transparent', borderRadius: '50%', flexShrink: 0 }}
                            />
                          )}
                          {progressStep > i && (
                            <div style={{ width: 14, height: 14, flexShrink: 0, color: 'var(--gr)', fontSize: 12 }}>✓</div>
                          )}
                        </motion.div>
                      ))}
                    </div>
                  </div>
                ) : result ? (
                  /* Success state */
                  <div>
                    <div style={{ textAlign: 'center', marginBottom: 16 }}>
                      <div style={{ fontSize: 13, fontFamily: 'DM Sans, sans-serif', color: 'var(--gr)', fontWeight: 600 }}>
                        ✅ 3D model created successfully!
                      </div>
                    </div>

                    {/* 3D preview */}
                    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
                      <GLBViewer url={result.modelUrl} />
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: 8 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--t)', fontFamily: 'DM Sans, sans-serif' }}>
                        {partName}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: 'DM Mono, monospace', marginTop: 2 }}>
                        {heightCm}cm × {widthCm}cm · {PART_KIND_OPTIONS.find(o => o.value === partKind)?.label}
                      </div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={handleAddToLibrary}
                        style={{
                          flex: 1, padding: '11px', background: 'var(--acc)',
                          border: '1px solid var(--acc)', borderRadius: 8, color: '#fff',
                          fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                        }}
                      >📚 Add to my library</motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                        onClick={() => { setResult(null); setStep(1); setFile(null); setPreview(''); setPartName(''); setHeightCm(''); setWidthCm('') }}
                        style={{
                          padding: '11px 16px', background: 'var(--p2)',
                          border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--t2)',
                          fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                        }}
                      >↺ Try again</motion.button>
                    </div>
                  </div>
                ) : (
                  /* Error fallback */
                  <div style={{ padding: '24px 0', textAlign: 'center' }}>
                    <div style={{ fontSize: 13, color: '#e05252', fontFamily: 'DM Sans, sans-serif', marginBottom: 16 }}>
                      {error || 'Something went wrong'}
                    </div>
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={() => { setError(null); setStep(2) }}
                      style={{ padding: '10px 20px', background: 'var(--p2)', border: '1px solid var(--bd)', borderRadius: 8, color: 'var(--t)', fontSize: 13, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
                    >← Back to details</motion.button>
                  </div>
                )}
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
