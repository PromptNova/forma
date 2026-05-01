export type PartKind = 'surface' | 'leg' | 'support' | 'back' | 'panel' | 'cushion' | 'door'

export interface PartDef {
  id: string
  label: string
  kg: number
  price: number
  kind: PartKind
  w: number  // width in meters
  h: number  // height in meters
  d: number  // depth in meters
  color: string
  icon: string
}

export const PARTS: Record<string, PartDef> = {
  // ── BASIC PARTS ──────────────────────────────────────────────
  seat: {
    id: 'seat', label: 'Seat', kg: 2.5, price: 12, kind: 'surface',
    w: 0.45, h: 0.04, d: 0.45, color: '#8B6F5C', icon: '▭'
  },
  tabletop: {
    id: 'tabletop', label: 'Tabletop', kg: 8, price: 45, kind: 'surface',
    w: 1.2, h: 0.04, d: 0.7, color: '#A0785A', icon: '▬'
  },
  shelf: {
    id: 'shelf', label: 'Shelf', kg: 3, price: 18, kind: 'surface',
    w: 0.8, h: 0.025, d: 0.3, color: '#9E7B5F', icon: '▬'
  },
  'leg-short': {
    id: 'leg-short', label: 'Short Leg', kg: 0.5, price: 8, kind: 'leg',
    w: 0.04, h: 0.45, d: 0.04, color: '#5C4A3C', icon: '|'
  },
  'leg-long': {
    id: 'leg-long', label: 'Long Leg', kg: 0.8, price: 12, kind: 'leg',
    w: 0.04, h: 0.72, d: 0.04, color: '#5C4A3C', icon: '|'
  },
  crossbar: {
    id: 'crossbar', label: 'Crossbar', kg: 0.6, price: 9, kind: 'support',
    w: 0.4, h: 0.03, d: 0.03, color: '#6B5447', icon: '─'
  },
  backrest: {
    id: 'backrest', label: 'Backrest', kg: 1.8, price: 22, kind: 'back',
    w: 0.44, h: 0.45, d: 0.04, color: '#8B6F5C', icon: '▯'
  },
  armrest: {
    id: 'armrest', label: 'Armrest', kg: 0.9, price: 15, kind: 'support',
    w: 0.2, h: 0.03, d: 0.2, color: '#7A5F4E', icon: '⌐'
  },
  panel: {
    id: 'panel', label: 'Panel', kg: 5, price: 35, kind: 'panel',
    w: 0.04, h: 1.8, d: 0.4, color: '#6B5447', icon: '▮'
  },

  // ── PRODUCT PARTS ────────────────────────────────────────────
  'prod-oak-top': {
    id: 'prod-oak-top', label: 'Oak Top', kg: 12, price: 220, kind: 'surface',
    w: 1.6, h: 0.04, d: 0.8, color: '#B8864E', icon: '▬'
  },
  'prod-walnut-top': {
    id: 'prod-walnut-top', label: 'Walnut Top', kg: 14, price: 310, kind: 'surface',
    w: 1.8, h: 0.04, d: 0.9, color: '#6B4226', icon: '▬'
  },
  'prod-pine-desk': {
    id: 'prod-pine-desk', label: 'Pine Desk', kg: 8, price: 95, kind: 'surface',
    w: 1.2, h: 0.04, d: 0.6, color: '#C8A96E', icon: '▬'
  },
  'prod-bamboo-shelf': {
    id: 'prod-bamboo-shelf', label: 'Bamboo Shelf', kg: 2, price: 24, kind: 'surface',
    w: 0.8, h: 0.025, d: 0.25, color: '#D4B483', icon: '▬'
  },
  'prod-dining-seat': {
    id: 'prod-dining-seat', label: 'Dining Seat', kg: 2, price: 12, kind: 'surface',
    w: 0.42, h: 0.04, d: 0.42, color: '#9E7B5F', icon: '▭'
  },
  'prod-cushion': {
    id: 'prod-cushion', label: 'Cushion', kg: 0.8, price: 18, kind: 'cushion',
    w: 0.4, h: 0.08, d: 0.4, color: '#C4956A', icon: '◫'
  },
  'prod-hairpin': {
    id: 'prod-hairpin', label: 'Hairpin Leg', kg: 0.4, price: 14, kind: 'leg',
    w: 0.015, h: 0.71, d: 0.015, color: '#4A4A4A', icon: '⌇'
  },
  'prod-scandi-leg': {
    id: 'prod-scandi-leg', label: 'Scandi Leg', kg: 0.6, price: 9, kind: 'leg',
    w: 0.04, h: 0.45, d: 0.04, color: '#B8A080', icon: '|'
  },
  'prod-u-leg': {
    id: 'prod-u-leg', label: 'U-Frame Leg', kg: 2.5, price: 55, kind: 'leg',
    w: 0.6, h: 0.71, d: 0.04, color: '#3A3A3A', icon: '⋃'
  },
  'prod-tall-panel': {
    id: 'prod-tall-panel', label: 'Tall Panel', kg: 8, price: 45, kind: 'panel',
    w: 0.04, h: 1.8, d: 0.4, color: '#5A4A3A', icon: '▮'
  },
  'prod-door': {
    id: 'prod-door', label: 'Cabinet Door', kg: 3, price: 68, kind: 'door',
    w: 0.4, h: 0.7, d: 0.02, color: '#8B7355', icon: '▯'
  },
}

export const PART_CATEGORIES = {
  Surfaces: ['seat', 'tabletop', 'shelf', 'prod-oak-top', 'prod-walnut-top', 'prod-pine-desk', 'prod-bamboo-shelf', 'prod-dining-seat'],
  Legs: ['leg-short', 'leg-long', 'prod-hairpin', 'prod-scandi-leg', 'prod-u-leg'],
  Supports: ['crossbar', 'armrest', 'backrest'],
  Panels: ['panel', 'prod-tall-panel', 'prod-door'],
  Extras: ['prod-cushion'],
} as const

export type PresetName = 'chair' | 'table' | 'stool' | 'bookshelf' | 'desk' | 'bench'

export interface PlacedPart {
  id: string
  type: string
  x: number
  y: number
  z: number
  rotationY: number
  color?: string
}

export const PRESETS: Record<PresetName, PlacedPart[]> = {
  chair: [
    { id: 'p0', type: 'seat', x: 0, y: 0.47, z: 0, rotationY: 0 },
    { id: 'p1', type: 'leg-short', x: -0.18, y: 0.225, z: -0.18, rotationY: 0 },
    { id: 'p2', type: 'leg-short', x:  0.18, y: 0.225, z: -0.18, rotationY: 0 },
    { id: 'p3', type: 'leg-short', x: -0.18, y: 0.225, z:  0.18, rotationY: 0 },
    { id: 'p4', type: 'leg-short', x:  0.18, y: 0.225, z:  0.18, rotationY: 0 },
    { id: 'p5', type: 'backrest',  x: 0, y: 0.72, z: -0.205, rotationY: 0 },
  ],
  table: [
    { id: 'p0', type: 'prod-oak-top', x: 0, y: 0.73, z: 0, rotationY: 0 },
    { id: 'p1', type: 'prod-hairpin', x: -0.68, y: 0.355, z: -0.33, rotationY: 0 },
    { id: 'p2', type: 'prod-hairpin', x:  0.68, y: 0.355, z: -0.33, rotationY: 0 },
    { id: 'p3', type: 'prod-hairpin', x: -0.68, y: 0.355, z:  0.33, rotationY: 0 },
    { id: 'p4', type: 'prod-hairpin', x:  0.68, y: 0.355, z:  0.33, rotationY: 0 },
  ],
  stool: [
    { id: 'p0', type: 'prod-dining-seat', x: 0, y: 0.47, z: 0, rotationY: 0 },
    { id: 'p1', type: 'prod-scandi-leg', x: -0.16, y: 0.225, z: -0.16, rotationY: 0 },
    { id: 'p2', type: 'prod-scandi-leg', x:  0.16, y: 0.225, z: -0.16, rotationY: 0 },
    { id: 'p3', type: 'prod-scandi-leg', x: -0.16, y: 0.225, z:  0.16, rotationY: 0 },
    { id: 'p4', type: 'prod-scandi-leg', x:  0.16, y: 0.225, z:  0.16, rotationY: 0 },
  ],
  bookshelf: [
    { id: 'p0', type: 'panel', x: -0.42, y: 0.9, z: 0, rotationY: 0 },
    { id: 'p1', type: 'panel', x:  0.42, y: 0.9, z: 0, rotationY: 0 },
    { id: 'p2', type: 'prod-bamboo-shelf', x: 0, y: 0.3, z: 0, rotationY: 0 },
    { id: 'p3', type: 'prod-bamboo-shelf', x: 0, y: 0.9, z: 0, rotationY: 0 },
    { id: 'p4', type: 'prod-bamboo-shelf', x: 0, y: 1.5, z: 0, rotationY: 0 },
  ],
  desk: [
    { id: 'p0', type: 'prod-pine-desk', x: 0, y: 0.73, z: 0, rotationY: 0 },
    { id: 'p1', type: 'prod-u-leg', x: -0.45, y: 0.355, z: 0, rotationY: 0 },
    { id: 'p2', type: 'prod-u-leg', x:  0.45, y: 0.355, z: 0, rotationY: 0 },
  ],
  bench: [
    { id: 'p0', type: 'prod-walnut-top', x: 0, y: 0.47, z: 0, rotationY: 0 },
    { id: 'p1', type: 'prod-scandi-leg', x: -0.7, y: 0.225, z: -0.18, rotationY: 0 },
    { id: 'p2', type: 'prod-scandi-leg', x:  0.7, y: 0.225, z: -0.18, rotationY: 0 },
    { id: 'p3', type: 'prod-scandi-leg', x: -0.7, y: 0.225, z:  0.18, rotationY: 0 },
    { id: 'p4', type: 'prod-scandi-leg', x:  0.7, y: 0.225, z:  0.18, rotationY: 0 },
  ],
}
