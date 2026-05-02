'use client'
import { useEffect, useRef, useCallback } from 'react'
import * as THREE from 'three'
import { useFormaStore } from '../lib/store'
import { PARTS } from '../lib/parts'
import PhysicsHUD from './PhysicsHUD'
import { motion, AnimatePresence } from 'framer-motion'

// ──────────────────────────────────────────────────────────────
// FORMA 3D — Three.js Physics Studio
// ──────────────────────────────────────────────────────────────

const GRID_SIZE = 0.1 // 10cm snap grid

function snapToGrid(v: number, snap: boolean) {
  if (!snap) return v
  return Math.round(v / GRID_SIZE) * GRID_SIZE
}

// Expose renderer for export
let _renderer: THREE.WebGLRenderer | null = null
export function getRenderer() { return _renderer }

export default function Forma3D() {
  const mountRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<{
    renderer: THREE.WebGLRenderer
    scene: THREE.Scene
    camera: THREE.PerspectiveCamera
    meshes: Map<string, THREE.Mesh>
    ground: THREE.Mesh
    grid: THREE.GridHelper
    animFrame: number
  } | null>(null)

  const stateRef = useRef({
    isDraggingPart: false,
    isOrbiting: false,
    selectedMesh: null as THREE.Mesh | null,
    selectedId: null as string | null,
    dragPlane: new THREE.Plane(new THREE.Vector3(0, 1, 0), 0),
    dragOffset: new THREE.Vector3(),
    lastMouse: { x: 0, y: 0 },
    cameraTheta: Math.PI / 4,
    cameraPhi: Math.PI / 3,
    cameraRadius: 2.5,
    cameraTarget: new THREE.Vector3(0, 0.3, 0),
  })

  const store = useFormaStore()
  const storeRef = useRef(store)
  storeRef.current = store

  // ── Initialize Three.js ───────────────────────────────────
  useEffect(() => {
    const mount = mountRef.current
    if (!mount) return

    // Renderer with preserveDrawingBuffer for PNG export
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: false,
      preserveDrawingBuffer: true,
    })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setSize(mount.clientWidth, mount.clientHeight)
    renderer.shadowMap.enabled = true
    renderer.shadowMap.type = THREE.PCFSoftShadowMap
    renderer.toneMapping = THREE.ACESFilmicToneMapping
    renderer.toneMappingExposure = 1.2
    mount.appendChild(renderer.domElement)
    _renderer = renderer

    // Scene
    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0e0d0b)
    scene.fog = null

    // Camera
    const camera = new THREE.PerspectiveCamera(45, mount.clientWidth / mount.clientHeight, 0.01, 100)

    // Lighting
    const ambient = new THREE.AmbientLight(0xfff3dc, 0.6)
    scene.add(ambient)
    const sunLight = new THREE.DirectionalLight(0xfff3dc, 1.2)
    sunLight.position.set(3, 5, 4)
    sunLight.castShadow = true
    sunLight.shadow.mapSize.set(2048, 2048)
    sunLight.shadow.camera.near = 0.1
    sunLight.shadow.camera.far = 20
    sunLight.shadow.camera.left = -3
    sunLight.shadow.camera.right = 3
    sunLight.shadow.camera.top = 3
    sunLight.shadow.camera.bottom = -3
    sunLight.shadow.bias = -0.001
    scene.add(sunLight)
    const fillLight = new THREE.DirectionalLight(0x8090ff, 0.3)
    fillLight.position.set(-2, 2, -2)
    scene.add(fillLight)

    // Ground
    const groundGeo = new THREE.PlaneGeometry(10, 10)
    const groundMat = new THREE.MeshLambertMaterial({ color: 0x181614 })
    const ground = new THREE.Mesh(groundGeo, groundMat)
    ground.rotation.x = -Math.PI / 2
    ground.receiveShadow = true
    ground.name = 'ground'
    scene.add(ground)

    // Grid
    const grid = new THREE.GridHelper(4, 40, 0x2a261f, 0x1e1b15)
    grid.position.y = 0.001
    scene.add(grid)

    // Store refs
    sceneRef.current = { renderer, scene, camera, meshes: new Map(), ground, grid, animFrame: 0 }

    // Camera positioning
    const updateCamera = () => {
      const s = stateRef.current
      const x = s.cameraTarget.x + s.cameraRadius * Math.sin(s.cameraPhi) * Math.sin(s.cameraTheta)
      const y = s.cameraTarget.y + s.cameraRadius * Math.cos(s.cameraPhi)
      const z = s.cameraTarget.z + s.cameraRadius * Math.sin(s.cameraPhi) * Math.cos(s.cameraTheta)
      camera.position.set(x, y, z)
      camera.lookAt(s.cameraTarget)
    }
    updateCamera()

    // Animation loop
    const animate = () => {
      const sc = sceneRef.current!
      const st = storeRef.current

      // Auto-rotate
      if (st.autoRotate) {
        stateRef.current.cameraTheta += 0.007
        updateCamera()
      }

      // Update part meshes from store
      const storeParts = st.parts
      const physics = st.physics
      const meshes = sc.meshes

      // Remove deleted parts
      meshes.forEach((mesh, id) => {
        if (!storeParts.find(p => p.id === id)) {
          sc.scene.remove(mesh)
          if (mesh.geometry) mesh.geometry.dispose()
          meshes.delete(id)
        }
      })

      // Add/update parts
      storeParts.forEach(part => {
        const def = PARTS[part.type]
        if (!def) return
        let mesh = meshes.get(part.id)
        if (!mesh) {
          // Create new mesh
          const geo = new THREE.BoxGeometry(def.w, def.h, def.d)
          const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(part.color || def.color),
            roughness: 0.7,
            metalness: 0.1,
          })
          mesh = new THREE.Mesh(geo, mat)
          mesh.castShadow = true
          mesh.receiveShadow = true
          mesh.name = part.id
          mesh.userData = { partId: part.id, partType: part.type }
          sc.scene.add(mesh)
          meshes.set(part.id, mesh)
        }

        // Update position/rotation
        mesh.position.set(part.x, part.y, part.z)
        mesh.rotation.y = part.rotationY || 0

        // Physics emissive coloring
        const mat = mesh.material as THREE.MeshStandardMaterial
        const status = physics?.perPartStatus[part.id]
        const selected = stateRef.current.selectedId === part.id

        if (selected) {
          mat.emissive.setHex(0x2a1f10)
          mat.emissiveIntensity = 1
        } else if (status === 'stable') {
          mat.emissive.setHex(0x001a00)
          mat.emissiveIntensity = 1
        } else if (status === 'unstable') {
          mat.emissive.setHex(0x1f0000)
          mat.emissiveIntensity = 1
        } else {
          mat.emissive.setHex(0x000000)
          mat.emissiveIntensity = 0
        }

        // Selection pulse via scale
        if (selected) {
          const pulse = 1 + Math.sin(Date.now() * 0.005) * 0.005
          mesh.scale.setScalar(pulse)
        } else {
          mesh.scale.setScalar(1)
        }
      })

      // Update grid visibility
      sc.grid.visible = st.showGrid

      // Update shadows
      sc.renderer.shadowMap.enabled = st.showShadows

      // Update theme background
      const theme = st.theme
      if (theme === 'light') {
        sc.scene.background = new THREE.Color(0xf5f1ea)
      } else if (theme === 'bw') {
        sc.scene.background = new THREE.Color(0x0a0a0a)
      } else {
        sc.scene.background = new THREE.Color(0x0e0d0b)
      }

      // Render
      sc.renderer.render(sc.scene, sc.camera)
      sc.animFrame = requestAnimationFrame(animate)
    }
    animate()

    // Resize
    const handleResize = () => {
      if (!mount || !sceneRef.current) return
      const { renderer: r, camera: c } = sceneRef.current
      const w = mount.clientWidth, h = mount.clientHeight
      r.setSize(w, h)
      c.aspect = w / h
      c.updateProjectionMatrix()
    }
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(sceneRef.current!.animFrame)
      window.removeEventListener('resize', handleResize)
      _renderer = null
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement)
      }
      renderer.dispose()
    }
  }, [])

  // ── Mouse Events ──────────────────────────────────────────
  const getIntersects = useCallback((e: React.MouseEvent) => {
    const mount = mountRef.current
    const sc = sceneRef.current
    if (!mount || !sc) return []
    const rect = mount.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    const y = -((e.clientY - rect.top) / rect.height) * 2 + 1
    const raycaster = new THREE.Raycaster()
    raycaster.setFromCamera({ x, y }, sc.camera)
    const meshArray = Array.from(sc.meshes.values())
    return raycaster.intersectObjects(meshArray)
  }, [])

  const handlePointerDown = useCallback((e: React.MouseEvent) => {
    const intersects = getIntersects(e)
    const s = stateRef.current
    const sc = sceneRef.current
    if (!sc) return

    if (intersects.length > 0) {
      // Hit a part
      const mesh = intersects[0].object as THREE.Mesh
      s.selectedMesh = mesh
      s.selectedId = mesh.userData.partId
      s.isDraggingPart = true
      storeRef.current.selectPart(mesh.userData.partId)

      // Setup drag plane at part's Y
      s.dragPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -mesh.position.y)
      const raycaster = new THREE.Raycaster()
      const rect = mountRef.current!.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera({ x: mx, y: my }, sc.camera)
      const pt = new THREE.Vector3()
      raycaster.ray.intersectPlane(s.dragPlane, pt)
      if (pt) s.dragOffset.subVectors(mesh.position, pt)
    } else {
      // Orbit
      s.isOrbiting = true
      s.isDraggingPart = false
      if (e.button === 0) {
        storeRef.current.selectPart(null)
        s.selectedId = null
        s.selectedMesh = null
      }
    }
    s.lastMouse = { x: e.clientX, y: e.clientY }
  }, [getIntersects])

  const handlePointerMove = useCallback((e: React.MouseEvent) => {
    const s = stateRef.current
    const sc = sceneRef.current
    if (!sc) return

    // Update cursor
    const intersects = getIntersects(e)
    const mount = mountRef.current
    if (mount) {
      if (s.isDraggingPart) mount.style.cursor = 'move'
      else if (s.isOrbiting) mount.style.cursor = 'grabbing'
      else if (intersects.length > 0) mount.style.cursor = 'pointer'
      else mount.style.cursor = 'grab'
    }

    if (s.isDraggingPart && s.selectedId) {
      // Drag part in XZ plane
      const raycaster = new THREE.Raycaster()
      const rect = mountRef.current!.getBoundingClientRect()
      const mx = ((e.clientX - rect.left) / rect.width) * 2 - 1
      const my = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera({ x: mx, y: my }, sc.camera)
      const pt = new THREE.Vector3()
      raycaster.ray.intersectPlane(s.dragPlane, pt)
      if (pt) {
        pt.add(s.dragOffset)
        const snap = storeRef.current.snapEnabled
        const newX = snapToGrid(pt.x, snap)
        const newZ = snapToGrid(pt.z, snap)
        storeRef.current.updatePart(s.selectedId, { x: newX, z: newZ })
      }
    } else if (s.isOrbiting) {
      // Orbit camera 360°
      const speed = storeRef.current.cameraSpeed || 1
      const dx = (e.clientX - s.lastMouse.x) * 0.01 * speed
      const dy = (e.clientY - s.lastMouse.y) * 0.01 * speed
      s.cameraTheta -= dx
      s.cameraPhi = Math.max(0.1, Math.min(Math.PI / 2.1, s.cameraPhi + dy))
      const x = s.cameraTarget.x + s.cameraRadius * Math.sin(s.cameraPhi) * Math.sin(s.cameraTheta)
      const y = s.cameraTarget.y + s.cameraRadius * Math.cos(s.cameraPhi)
      const z = s.cameraTarget.z + s.cameraRadius * Math.sin(s.cameraPhi) * Math.cos(s.cameraTheta)
      sc.camera.position.set(x, y, z)
      sc.camera.lookAt(s.cameraTarget)
    }
    s.lastMouse = { x: e.clientX, y: e.clientY }
  }, [getIntersects])

  const handlePointerUp = useCallback(() => {
    const s = stateRef.current
    s.isDraggingPart = false
    s.isOrbiting = false
    s.selectedMesh = null
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const s = stateRef.current
    s.cameraRadius = Math.max(0.5, Math.min(8, s.cameraRadius + e.deltaY * 0.002))
    const sc = sceneRef.current
    if (sc) {
      const x = s.cameraTarget.x + s.cameraRadius * Math.sin(s.cameraPhi) * Math.sin(s.cameraTheta)
      const y = s.cameraTarget.y + s.cameraRadius * Math.cos(s.cameraPhi)
      const z = s.cameraTarget.z + s.cameraRadius * Math.sin(s.cameraPhi) * Math.cos(s.cameraTheta)
      sc.camera.position.set(x, y, z)
      sc.camera.lookAt(s.cameraTarget)
    }
  }, [])

  const { physics, autoRotate, setAutoRotate, parts } = store

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* Three.js mount */}
      <div
        ref={mountRef}
        style={{ width: '100%', height: '100%' }}
        onMouseDown={handlePointerDown}
        onMouseMove={handlePointerMove}
        onMouseUp={handlePointerUp}
        onMouseLeave={handlePointerUp}
        onWheel={handleWheel}
      />

      {/* Instability overlay */}
      <AnimatePresence>
        {physics && !physics.stable && parts.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="instability-overlay"
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '50%',
              background: 'radial-gradient(ellipse at 50% 100%, rgba(224,82,82,0.12) 0%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        )}
      </AnimatePresence>

      {/* Stability glow */}
      <AnimatePresence>
        {physics?.stable && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              height: '40%',
              background: 'radial-gradient(ellipse at 50% 100%, rgba(62,200,122,0.06) 0%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 5,
            }}
          />
        )}
      </AnimatePresence>

      {/* Physics HUD */}
      <PhysicsHUD />

      {/* Camera views floating top */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 4,
        background: 'var(--panel)', border: '1px solid var(--bd)',
        borderRadius: 10, padding: '3px 4px', zIndex: 20,
      }}>
        {(['perspective', 'front', 'side', 'top'] as const).map(view => (
          <button key={view} onClick={() => {
            useFormaStore.getState().setCameraView(view)
            const s = stateRef.current
            if (view === 'perspective') { s.cameraTheta = Math.PI/4; s.cameraPhi = Math.PI/3; s.cameraRadius = 2.5 }
            if (view === 'front') { s.cameraTheta = 0; s.cameraPhi = Math.PI/2.5; s.cameraRadius = 2.5 }
            if (view === 'side') { s.cameraTheta = Math.PI/2; s.cameraPhi = Math.PI/2.5; s.cameraRadius = 2.5 }
            if (view === 'top') { s.cameraTheta = 0; s.cameraPhi = 0.1; s.cameraRadius = 3 }
            const sc = sceneRef.current
            if (sc) {
              const x = s.cameraTarget.x + s.cameraRadius * Math.sin(s.cameraPhi) * Math.sin(s.cameraTheta)
              const y = s.cameraTarget.y + s.cameraRadius * Math.cos(s.cameraPhi)
              const z = s.cameraTarget.z + s.cameraRadius * Math.sin(s.cameraPhi) * Math.cos(s.cameraTheta)
              sc.camera.position.set(x, y, z)
              sc.camera.lookAt(s.cameraTarget)
            }
          }}
            style={{
              padding: '4px 10px',
              background: store.cameraView === view ? 'var(--p3)' : 'transparent',
              border: 'none', borderRadius: 7,
              color: store.cameraView === view ? 'var(--t)' : 'var(--t3)',
              fontSize: 11, fontFamily: 'DM Sans, sans-serif',
              cursor: 'pointer', transition: 'all 200ms', textTransform: 'capitalize',
            }}
          >
            {view}
          </button>
        ))}
      </div>

      {/* Float bar bottom */}
      <div style={{
        position: 'absolute', bottom: 20, left: '50%', transform: 'translateX(-50%)',
        display: 'flex', gap: 6, alignItems: 'center',
        background: 'var(--panel)', border: '1px solid var(--bd)',
        borderRadius: 12, padding: '5px 8px', zIndex: 20,
        backdropFilter: 'blur(8px)',
      }}>
        <button
          onClick={() => useFormaStore.getState().undo()}
          title="Undo (⌘Z)"
          style={{ padding: '5px 10px', background: 'transparent', border: 'none', color: 'var(--t2)', fontSize: 14, cursor: 'pointer' }}
        >↩</button>
        <button
          onClick={() => useFormaStore.getState().redo()}
          title="Redo (⌘Y)"
          style={{ padding: '5px 10px', background: 'transparent', border: 'none', color: 'var(--t2)', fontSize: 14, cursor: 'pointer' }}
        >↪</button>
        <div style={{ width: 1, height: 16, background: 'var(--bd2)' }} />
        <button
          onClick={() => {
            const sel = useFormaStore.getState().selectedId
            if (sel) useFormaStore.getState().duplicatePart(sel)
          }}
          title="Duplicate (D)"
          style={{ padding: '5px 10px', background: 'transparent', border: 'none', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >Dup</button>
        <button
          onClick={() => {
            const sel = useFormaStore.getState().selectedId
            if (sel) useFormaStore.getState().removePart(sel)
          }}
          title="Delete (Del)"
          style={{ padding: '5px 10px', background: 'transparent', border: 'none', color: 'var(--rd)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >Del</button>
        <div style={{ width: 1, height: 16, background: 'var(--bd2)' }} />
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          title="Auto-rotate"
          style={{
            padding: '5px 10px',
            background: autoRotate ? 'rgba(212,117,74,.1)' : 'transparent',
            border: 'none', borderRadius: 8,
            color: autoRotate ? 'var(--acc)' : 'var(--t2)',
            fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
            display: 'flex', alignItems: 'center', gap: 5, transition: 'all 200ms',
          }}
        >
          {autoRotate && <span style={{ width: 6, height: 6, borderRadius: 3, background: 'var(--gr)' }} />}
          ⟳ Auto
        </button>
        <div style={{ width: 1, height: 16, background: 'var(--bd2)' }} />
        <button
          onClick={() => {
            const s = stateRef.current
            s.cameraTheta = Math.PI/4; s.cameraPhi = Math.PI/3; s.cameraRadius = 2.5
            s.cameraTarget.set(0, 0.3, 0)
            const sc = sceneRef.current
            if (sc) {
              const x = s.cameraTarget.x + s.cameraRadius * Math.sin(s.cameraPhi) * Math.sin(s.cameraTheta)
              const y = s.cameraTarget.y + s.cameraRadius * Math.cos(s.cameraPhi)
              const z = s.cameraTarget.z + s.cameraRadius * Math.sin(s.cameraPhi) * Math.cos(s.cameraTheta)
              sc.camera.position.set(x, y, z); sc.camera.lookAt(s.cameraTarget)
            }
          }}
          title="Reset camera (R)"
          style={{ padding: '5px 10px', background: 'transparent', border: 'none', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >↺ Reset</button>
        <div style={{ width: 1, height: 16, background: 'var(--bd2)' }} />
        <button
          onClick={() => {
            if (!document.fullscreenElement) mountRef.current?.requestFullscreen()
            else document.exitFullscreen()
          }}
          title="Fullscreen (F)"
          style={{ padding: '5px 10px', background: 'transparent', border: 'none', color: 'var(--t2)', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}
        >⛶ Full</button>
      </div>

      {/* Hints bottom left */}
      <div style={{
        position: 'absolute', bottom: 20, left: 16, zIndex: 20,
        color: 'var(--t3)', fontSize: 10, fontFamily: 'DM Mono, monospace',
        lineHeight: 1.8, pointerEvents: 'none',
      }}>
        <div>⌘K search · D duplicate · Del delete</div>
        <div>Drag part · Scroll zoom · Drag empty orbit</div>
      </div>
    </div>
  )
}
