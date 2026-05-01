import { PARTS, PlacedPart } from './parts'

export interface PhysicsResult {
  stable: boolean
  score: number
  reasons: string[]
  com: { x: number; y: number; z: number }
  legCount: number
  surfaceCount: number
  perPartStatus: Record<string, 'stable' | 'unstable' | 'neutral'>
}

function getBounds(part: PlacedPart) {
  const def = PARTS[part.type]
  if (!def) return null
  return {
    minX: part.x - def.w / 2, maxX: part.x + def.w / 2,
    minY: part.y - def.h / 2, maxY: part.y + def.h / 2,
    minZ: part.z - def.d / 2, maxZ: part.z + def.d / 2,
    cx: part.x, cy: part.y, cz: part.z,
  }
}

export function validatePhysics(parts: PlacedPart[]): PhysicsResult {
  const reasons: string[] = []
  const perPartStatus: Record<string, 'stable' | 'unstable' | 'neutral'> = {}
  let score = 100
  const surfaces = parts.filter(p => ['surface','cushion'].includes(PARTS[p.type]?.kind))
  const legs = parts.filter(p => PARTS[p.type]?.kind === 'leg')
  const backs = parts.filter(p => PARTS[p.type]?.kind === 'back')
  const panels = parts.filter(p => PARTS[p.type]?.kind === 'panel')
  parts.forEach(p => { perPartStatus[p.id] = 'neutral' })
  if (!parts.length) return { stable: false, score: 0, reasons: ['No parts'], com: {x:0,y:0,z:0}, legCount:0, surfaceCount:0, perPartStatus }
  let tm = 0, cx = 0, cy = 0, cz = 0
  parts.forEach(p => { const d = PARTS[p.type]; if (!d) return; tm += d.kg; cx += p.x*d.kg; cy += p.y*d.kg; cz += p.z*d.kg })
  if (tm > 0) { cx/=tm; cy/=tm; cz/=tm }
  if (!surfaces.length) { reasons.push('No surface'); score -= 40 }
  if (!legs.length && !panels.length) { reasons.push('No support'); score -= 40 }
  for (const surf of surfaces) {
    const sb = getBounds(surf); if (!sb) continue
    const sLow = sb.minY, TOL = 0.12
    const sLegs = legs.filter(l => { const b = getBounds(l); return b && Math.abs(b.maxY - sLow) < TOL })
    const sPanels = panels.filter(p => { const b = getBounds(p); return b && b.maxY >= sLow - TOL })
    if (sLegs.length >= 3 || sPanels.length >= 2) {
      perPartStatus[surf.id] = 'stable'
      sLegs.forEach(l => { perPartStatus[l.id] = 'stable' })
      sPanels.forEach(p => { perPartStatus[p.id] = 'stable' })
      if (sLegs.length > 1) {
        const bots = sLegs.map(l => getBounds(l)!.minY)
        if (Math.max(...bots) - Math.min(...bots) > 0.08) { reasons.push('Unequal leg heights'); score -= 25; perPartStatus[surf.id] = 'unstable'; sLegs.forEach(l => { perPartStatus[l.id] = 'unstable' }) }
      }
      if (sLegs.length >= 2) {
        const lx = sLegs.map(l => l.x), lz = sLegs.map(l => l.z)
        if (cx < Math.min(...lx)-0.05 || cx > Math.max(...lx)+0.05 || cz < Math.min(...lz)-0.05 || cz > Math.max(...lz)+0.05) { reasons.push('CoM outside base'); score -= 30; perPartStatus[surf.id] = 'unstable' }
      }
    } else {
      perPartStatus[surf.id] = 'unstable'
      reasons.push(sLegs.length || sPanels.length ? 'Insufficient support' : 'No support for surface')
      score -= sLegs.length || sPanels.length ? 20 : 35
    }
    backs.forEach(b => {
      const ok = Math.abs(b.x - surf.cx) < (sb.maxX-sb.minX)/2+0.1 && Math.abs(b.z - surf.cz) < 0.3
      perPartStatus[b.id] = ok ? 'stable' : 'unstable'
      if (!ok) { reasons.push('Backrest disconnected'); score -= 15 }
    })
  }
  parts.forEach(p => { if (perPartStatus[p.id] === 'neutral') { const b = getBounds(p); if (b && b.minY < 0.04) perPartStatus[p.id] = 'stable' } })
  score = Math.max(0, Math.min(100, score))
  const stable = score >= 70 && !reasons.length
  if (stable) reasons.push('Structure is stable')
  return { stable, score, reasons, com: {x:cx,y:cy,z:cz}, legCount: legs.length, surfaceCount: surfaces.length, perPartStatus }
}

export function getScoreGrade(score: number): 'A'|'B'|'C'|'D' {
  return score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 50 ? 'C' : 'D'
}
