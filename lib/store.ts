import { create } from 'zustand'
import { PlacedPart, PRESETS, PresetName } from './parts'
import { validatePhysics, PhysicsResult } from './physics'
import {
  saveDesignToSupabase,
  updateDesignInSupabase,
  loadDesignsFromSupabase,
  shareDesignInSupabase,
  getCurrentUser,
  type DesignRow,
} from './supabase'

export type Theme = 'dark' | 'light' | 'bw'
export type CameraView = 'perspective' | 'front' | 'side' | 'top'

interface FormaState {
  // ── Design state ───────────────────────────────────────────
  parts: PlacedPart[]
  selectedId: string | null
  physics: PhysicsResult | null

  // ── UI state ───────────────────────────────────────────────
  theme: Theme
  showGrid: boolean
  showCoM: boolean
  showShadows: boolean
  showFog: boolean
  snapEnabled: boolean
  symmetryEnabled: boolean
  autoRotate: boolean
  cameraSpeed: number
  cameraView: CameraView
  showSettings: boolean
  showCommandPalette: boolean
  showTutorial: boolean
  tutorialStep: number
  sidebarTab: 'parts' | 'real' | 'presets'

  // ── History ────────────────────────────────────────────────
  history: PlacedPart[][]
  historyIndex: number

  // ── Cloud state ────────────────────────────────────────────
  cloudDesigns: DesignRow[]
  cloudSaving: boolean
  cloudLoading: boolean
  cloudError: string | null
  currentDesignId: string | null  // ID of the design currently being edited

  // ── Design actions ─────────────────────────────────────────
  addPart: (part: PlacedPart) => void
  removePart: (id: string) => void
  updatePart: (id: string, updates: Partial<PlacedPart>) => void
  selectPart: (id: string | null) => void
  duplicatePart: (id: string) => void
  clearAll: () => void
  loadPreset: (name: PresetName) => void

  // ── UI actions ─────────────────────────────────────────────
  setTheme: (theme: Theme) => void
  setShowGrid: (v: boolean) => void
  setShowCoM: (v: boolean) => void
  setShowShadows: (v: boolean) => void
  setShowFog: (v: boolean) => void
  setSnapEnabled: (v: boolean) => void
  setSymmetryEnabled: (v: boolean) => void
  setAutoRotate: (v: boolean) => void
  setCameraSpeed: (v: number) => void
  setCameraView: (v: CameraView) => void
  setShowSettings: (v: boolean) => void
  setShowCommandPalette: (v: boolean) => void
  setShowTutorial: (v: boolean) => void
  setTutorialStep: (v: number) => void
  setSidebarTab: (v: 'parts' | 'real' | 'presets') => void

  // ── History actions ────────────────────────────────────────
  undo: () => void
  redo: () => void
  runPhysics: () => void

  // ── Cloud actions ──────────────────────────────────────────
  saveDesign: (name?: string) => Promise<string | null>
  loadDesigns: () => Promise<void>
  shareDesign: (designId?: string) => Promise<string | null>
}

let _idCounter = 0
function newId() { return 'p' + (++_idCounter) + '_' + Date.now() }

export const useFormaStore = create<FormaState>((set, get) => ({
  // ── Initial state ─────────────────────────────────────────
  parts: [],
  selectedId: null,
  physics: null,
  theme: 'dark',
  showGrid: true,
  showCoM: false,
  showShadows: true,
  showFog: false,
  snapEnabled: true,
  symmetryEnabled: false,
  autoRotate: false,
  cameraSpeed: 1,
  cameraView: 'perspective',
  showSettings: false,
  showCommandPalette: false,
  showTutorial: false,
  tutorialStep: 0,
  sidebarTab: 'parts',
  history: [[]],
  historyIndex: 0,
  cloudDesigns: [],
  cloudSaving: false,
  cloudLoading: false,
  cloudError: null,
  currentDesignId: null,

  // ── Design actions ─────────────────────────────────────────
  addPart: (part) => set((state) => {
    const newPart = { ...part, id: newId() }
    const parts = [...state.parts, newPart]
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), [...parts]].slice(-50)
    return {
      parts,
      physics: validatePhysics(parts),
      selectedId: newPart.id,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    }
  }),

  removePart: (id) => set((state) => {
    const parts = state.parts.filter(p => p.id !== id)
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), [...parts]].slice(-50)
    return {
      parts,
      physics: validatePhysics(parts),
      selectedId: state.selectedId === id ? null : state.selectedId,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    }
  }),

  updatePart: (id, updates) => set((state) => {
    const parts = state.parts.map(p => p.id === id ? { ...p, ...updates } : p)
    return { parts, physics: validatePhysics(parts) }
  }),

  selectPart: (id) => set({ selectedId: id }),

  duplicatePart: (id) => set((state) => {
    const part = state.parts.find(p => p.id === id)
    if (!part) return state
    const newPart = { ...part, id: newId(), x: part.x + 0.1, z: part.z + 0.1 }
    const parts = [...state.parts, newPart]
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), [...parts]].slice(-50)
    return {
      parts,
      physics: validatePhysics(parts),
      selectedId: newPart.id,
      history: newHistory,
      historyIndex: newHistory.length - 1,
    }
  }),

  clearAll: () => set((state) => {
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), []].slice(-50)
    return {
      parts: [],
      selectedId: null,
      physics: null,
      history: newHistory,
      historyIndex: newHistory.length - 1,
      currentDesignId: null,
    }
  }),

  loadPreset: (name) => set((state) => {
    const preset = PRESETS[name]
    if (!preset) return state
    const parts = preset.map(p => ({ ...p, id: newId() }))
    const newHistory = [...state.history.slice(0, state.historyIndex + 1), [...parts]].slice(-50)
    return {
      parts,
      selectedId: null,
      physics: validatePhysics(parts),
      history: newHistory,
      historyIndex: newHistory.length - 1,
    }
  }),

  // ── UI actions ─────────────────────────────────────────────
  setTheme: (theme) => set({ theme }),
  setShowGrid: (showGrid) => set({ showGrid }),
  setShowCoM: (showCoM) => set({ showCoM }),
  setShowShadows: (showShadows) => set({ showShadows }),
  setShowFog: (showFog) => set({ showFog }),
  setSnapEnabled: (snapEnabled) => set({ snapEnabled }),
  setSymmetryEnabled: (symmetryEnabled) => set({ symmetryEnabled }),
  setAutoRotate: (autoRotate) => set({ autoRotate }),
  setCameraSpeed: (cameraSpeed) => set({ cameraSpeed }),
  setCameraView: (cameraView) => set({ cameraView }),
  setShowSettings: (showSettings) => set({ showSettings }),
  setShowCommandPalette: (showCommandPalette) => set({ showCommandPalette }),
  setShowTutorial: (showTutorial) => set({ showTutorial }),
  setTutorialStep: (tutorialStep) => set({ tutorialStep }),
  setSidebarTab: (sidebarTab) => set({ sidebarTab }),

  // ── History actions ────────────────────────────────────────
  undo: () => set((state) => {
    if (state.historyIndex <= 0) return state
    const newIndex = state.historyIndex - 1
    const parts = [...state.history[newIndex]]
    return { parts, historyIndex: newIndex, physics: validatePhysics(parts), selectedId: null }
  }),

  redo: () => set((state) => {
    if (state.historyIndex >= state.history.length - 1) return state
    const newIndex = state.historyIndex + 1
    const parts = [...state.history[newIndex]]
    return { parts, historyIndex: newIndex, physics: validatePhysics(parts), selectedId: null }
  }),

  runPhysics: () => set((state) => ({
    physics: validatePhysics(state.parts)
  })),

  // ── Cloud actions ──────────────────────────────────────────
  saveDesign: async (name?: string) => {
    set({ cloudSaving: true, cloudError: null })
    try {
      const user = await getCurrentUser()
      if (!user) {
        set({ cloudSaving: false, cloudError: 'Not signed in' })
        return null
      }
      const state = get()
      const designName = name || `Design ${new Date().toLocaleDateString('nl-NL')}`

      let savedId: string
      if (state.currentDesignId) {
        // Update existing design
        await updateDesignInSupabase(state.currentDesignId, {
          name: designName,
          parts: state.parts,
          theme: state.theme,
        })
        savedId = state.currentDesignId
      } else {
        // Create new design
        const saved = await saveDesignToSupabase({
          name: designName,
          parts: state.parts,
          theme: state.theme,
          userId: user.id,
        })
        savedId = saved.id
      }

      set({ cloudSaving: false, currentDesignId: savedId })
      return savedId
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Save failed'
      set({ cloudSaving: false, cloudError: msg })
      return null
    }
  },

  loadDesigns: async () => {
    set({ cloudLoading: true, cloudError: null })
    try {
      const user = await getCurrentUser()
      if (!user) {
        set({ cloudLoading: false })
        return
      }
      const designs = await loadDesignsFromSupabase(user.id)
      set({ cloudDesigns: designs, cloudLoading: false })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Load failed'
      set({ cloudLoading: false, cloudError: msg })
    }
  },

  shareDesign: async (designId?: string) => {
    const state = get()
    const id = designId || state.currentDesignId
    if (!id) {
      // Save first if no design ID
      const savedId = await state.saveDesign()
      if (!savedId) return null
      try {
        const token = await shareDesignInSupabase(savedId)
        const shareUrl = `${window.location.origin}/share/${token}`
        set({ currentDesignId: savedId })
        return shareUrl
      } catch (err) {
        set({ cloudError: err instanceof Error ? err.message : 'Share failed' })
        return null
      }
    }
    try {
      const token = await shareDesignInSupabase(id)
      return `${window.location.origin}/share/${token}`
    } catch (err) {
      set({ cloudError: err instanceof Error ? err.message : 'Share failed' })
      return null
    }
  },
}))
