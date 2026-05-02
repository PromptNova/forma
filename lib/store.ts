import { create } from 'zustand'
import { PlacedPart, PRESETS, PresetName } from './parts'
import { validatePhysics, PhysicsResult } from './physics'

export type Theme = 'dark' | 'light' | 'bw'
export type CameraView = 'perspective' | 'front' | 'side' | 'top'

interface FormaState {
  parts: PlacedPart[]
  selectedId: string | null
  physics: PhysicsResult | null
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
  history: PlacedPart[][]
  historyIndex: number
  addPart: (part: PlacedPart) => void
  removePart: (id: string) => void
  updatePart: (id: string, updates: Partial<PlacedPart>) => void
  selectPart: (id: string | null) => void
  duplicatePart: (id: string) => void
  clearAll: () => void
  loadPreset: (name: PresetName) => void
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
  undo: () => void
  redo: () => void
  runPhysics: () => void
}

let _idCounter = 0
function newId() { return 'p' + (++_idCounter) + '_' + Date.now() }

export const useFormaStore = create<FormaState>((set) => ({
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
    return { parts: [], selectedId: null, physics: null, history: newHistory, historyIndex: newHistory.length - 1 }
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

  runPhysics: () => set((state) => ({ physics: validatePhysics(state.parts) })),
}))
