'use client'

// StabilityCertificate.tsx
// Generates a 1200x800px PNG "Stability Certificate" using HTML Canvas API

export interface CertificateDesign {
  name: string
  score: number
  letter: 'A' | 'B' | 'C' | 'D'
  parts: number
  weightKg: number
  heightCm: number
  costEur: number
  stableAt: Date
}

const GRADE_COLOR = {
  A: '#3ec87a',
  B: '#8bc47a',
  C: '#e8a84e',
  D: '#e05252',
}

function generateUID(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let uid = 'FORMA-'
  for (let i = 0; i < 4; i++) uid += chars[Math.floor(Math.random() * chars.length)]
  uid += '-'
  for (let i = 0; i < 4; i++) uid += chars[Math.floor(Math.random() * chars.length)]
  return uid
}

async function loadFonts(): Promise<void> {
  const fonts = [
    new FontFace('Syne', 'url(https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBZRjr0FKM_04uQ.woff2)', { weight: '800' }),
    new FontFace('Syne', 'url(https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBZRjr0FKM_04uQ.woff2)', { weight: '700' }),
    new FontFace('Syne', 'url(https://fonts.gstatic.com/s/syne/v22/8vIS7w4qzmVxsWxjBZRjr0FKM_04uQ.woff2)', { weight: '600' }),
    new FontFace('DM Mono', 'url(https://fonts.gstatic.com/s/dmmono/v14/aFTR7PB1QTsUX8KYvrGyIYetlA.woff2)', { weight: '400' }),
    new FontFace('DM Mono', 'url(https://fonts.gstatic.com/s/dmmono/v14/aFTT7PB1QTsUX8KYth-orYataIf4.woff2)', { weight: '500' }),
  ]
  await Promise.allSettled(fonts.map(async (font) => {
    try {
      await font.load()
      document.fonts.add(font)
    } catch (_) {
      // fallback to system fonts
    }
  }))
  // Small wait to ensure fonts are ready
  await new Promise(resolve => setTimeout(resolve, 100))
}

function drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.strokeStyle = 'rgba(255, 243, 220, 0.04)'
  ctx.lineWidth = 1
  const step = 40
  for (let x = 0; x <= w; x += step) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke()
  }
  for (let y = 0; y <= h; y += step) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke()
  }
}

function drawQRPlaceholder(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  const cells = 10
  const cellSize = size / cells
  ctx.fillStyle = '#d4754a'
  for (let row = 0; row < cells; row++) {
    for (let col = 0; col < cells; col++) {
      // QR-like pattern with border and random interior
      const isBorder = row === 0 || row === cells - 1 || col === 0 || col === cells - 1
      const isCornerBlock = (row < 3 && col < 3) || (row < 3 && col > cells - 4) || (row > cells - 4 && col < 3)
      if (isBorder || isCornerBlock || Math.random() > 0.5) {
        ctx.fillRect(
          x + col * cellSize + 0.5,
          y + row * cellSize + 0.5,
          cellSize - 1,
          cellSize - 1
        )
      }
    }
  }
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('nl-NL', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function generateCertificate(design: CertificateDesign): Promise<Blob> {
  return new Promise((resolve, reject) => {
    loadFonts().then(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 1200
      canvas.height = 800
      const ctx = canvas.getContext('2d')!

      const W = 1200, H = 800
      const LEFT = 340  // left panel width
      const uid = generateUID()

      // ── Background gradient ──────────────────────────────────────────
      const grad = ctx.createLinearGradient(0, 0, W, H)
      grad.addColorStop(0, '#0e0d0b')
      grad.addColorStop(1, '#1a1512')
      ctx.fillStyle = grad
      ctx.fillRect(0, 0, W, H)

      // ── Grid lines ────────────────────────────────────────────────────
      drawGrid(ctx, W, H)

      // ── Vertical divider ──────────────────────────────────────────────
      ctx.strokeStyle = 'rgba(255, 243, 220, 0.10)'
      ctx.lineWidth = 1
      ctx.beginPath(); ctx.moveTo(LEFT, 0); ctx.lineTo(LEFT, H); ctx.stroke()

      // ── Outer border ─────────────────────────────────────────────────
      const PAD = 16
      ctx.strokeStyle = 'rgba(212, 117, 74, 0.6)'
      ctx.lineWidth = 1
      ctx.strokeRect(PAD, PAD, W - PAD * 2, H - PAD * 2)

      // ══════════════════════════════════════════════════════════════════
      // LEFT PANEL
      // ══════════════════════════════════════════════════════════════════
      const lCx = LEFT / 2  // center of left panel

      // Forma logo
      ctx.fillStyle = '#d4754a'
      ctx.font = '800 28px "Syne", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('FORMA', lCx, 72)

      // Subtitle
      ctx.fillStyle = '#5a5045'
      ctx.font = '400 11px "DM Mono", monospace'
      ctx.letterSpacing = '0px'
      ctx.fillText('3D Physics Studio', lCx, 92)

      // Divider
      ctx.strokeStyle = 'rgba(255, 243, 220, 0.10)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(40, 108); ctx.lineTo(LEFT - 40, 108)
      ctx.stroke()

      // Large score letter
      const gradeColor = GRADE_COLOR[design.letter]
      ctx.fillStyle = gradeColor
      ctx.font = '800 120px "Syne", sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(design.letter, lCx, 260)

      // Grade glow
      ctx.shadowColor = gradeColor
      ctx.shadowBlur = 40
      ctx.fillStyle = gradeColor + '20'
      ctx.beginPath()
      ctx.arc(lCx, 215, 80, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = 0

      // "STABILITY SCORE" label
      ctx.fillStyle = '#5a5045'
      ctx.font = '400 10px "DM Mono", monospace'
      ctx.textAlign = 'center'
      ctx.fillText('STABILITY SCORE', lCx, 295)

      // Score percentage
      ctx.fillStyle = '#9e9182'
      ctx.font = '500 26px "DM Mono", monospace'
      ctx.fillText(design.score + '%', lCx, 328)

      // ── Left panel bottom info ────────────────────────────────────────
      // Badge
      const badgeBg = gradeColor + '18'
      ctx.fillStyle = badgeBg
      const bw = 180, bh = 36, bx = lCx - bw / 2, by = 400
      ctx.beginPath()
      ctx.roundRect(bx, by, bw, bh, 6)
      ctx.fill()
      ctx.strokeStyle = gradeColor + '40'
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = gradeColor
      ctx.font = '500 11px "DM Mono", monospace'
      ctx.textAlign = 'center'
      const stableLabel = design.score >= 70 ? 'PHYSICS VALIDATED ✓' : 'VALIDATION FAILED'
      ctx.fillText(stableLabel, lCx, by + 22)

      // ══════════════════════════════════════════════════════════════════
      // RIGHT PANEL
      // ══════════════════════════════════════════════════════════════════
      const rX = LEFT + 48
      const rW = W - LEFT - 48

      // "PHYSICS VALIDATED" header
      ctx.fillStyle = '#d4754a'
      ctx.font = '700 13px "Syne", sans-serif'
      ctx.textAlign = 'left'
      // letter-spacing simulation: draw char by char
      const headerText = 'PHYSICS VALIDATED'
      let hx = rX
      for (const ch of headerText) {
        ctx.fillText(ch, hx, 68)
        hx += ctx.measureText(ch).width + 3
      }

      // Design name
      ctx.fillStyle = '#f5ede0'
      ctx.font = '600 34px "Syne", sans-serif'
      ctx.textAlign = 'left'

      // Wrap design name if too long
      const maxW = rW - 40
      let designName = design.name
      if (ctx.measureText(designName).width > maxW) {
        // Truncate
        while (ctx.measureText(designName + '…').width > maxW && designName.length > 0) {
          designName = designName.slice(0, -1)
        }
        designName += '…'
      }
      ctx.fillText(designName, rX, 116)

      // Date
      ctx.fillStyle = '#5a5045'
      ctx.font = '400 12px "DM Mono", monospace'
      ctx.fillText(formatDate(design.stableAt), rX, 140)

      // ── Stats divider ──────────────────────────────────────────────────
      ctx.strokeStyle = 'rgba(255, 243, 220, 0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(rX, 162); ctx.lineTo(W - 48, 162)
      ctx.stroke()

      // ── Stats 2×2 grid ──────────────────────────────────────────────
      const stats = [
        { value: design.parts + ' onderdelen', label: 'PARTS' },
        { value: design.weightKg.toFixed(1) + ' kg', label: 'GEWICHT' },
        { value: design.heightCm + ' cm', label: 'HOOGTE' },
        { value: '€' + design.costEur, label: 'MATERIALEN' },
      ]

      const gCols = 2, gRows = 2
      const cellW = (rW - 20) / gCols
      const cellH = 110
      const gY = 178

      for (let i = 0; i < stats.length; i++) {
        const col = i % gCols
        const row = Math.floor(i / gCols)
        const cx2 = rX + col * (cellW + 10)
        const cy2 = gY + row * (cellH + 10)

        // Cell background
        ctx.fillStyle = 'rgba(255, 243, 220, 0.03)'
        ctx.beginPath()
        ctx.roundRect(cx2, cy2, cellW, cellH, 8)
        ctx.fill()
        ctx.strokeStyle = 'rgba(255, 243, 220, 0.06)'
        ctx.lineWidth = 1
        ctx.stroke()

        // Value
        ctx.fillStyle = '#f5ede0'
        ctx.font = '700 26px "DM Mono", monospace'
        ctx.textAlign = 'left'
        ctx.fillText(stats[i].value, cx2 + 20, cy2 + 50)

        // Label
        ctx.fillStyle = '#5a5045'
        ctx.font = '400 10px "DM Mono", monospace'
        // letter spacing simulation
        let lbX = cx2 + 20
        for (const ch of stats[i].label) {
          ctx.fillText(ch, lbX, cy2 + 70)
          lbX += ctx.measureText(ch).width + 2
        }
      }

      // ── Bottom right section ──────────────────────────────────────────
      const bY = gY + gRows * (cellH + 10) + 20

      ctx.strokeStyle = 'rgba(255, 243, 220, 0.08)'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(rX, bY); ctx.lineTo(W - 48, bY)
      ctx.stroke()

      // QR code placeholder
      const qrSize = 60
      const qrX = W - 48 - qrSize
      const qrY = bY + 20
      drawQRPlaceholder(ctx, qrX, qrY, qrSize)

      // Validation text
      ctx.fillStyle = '#5a5045'
      ctx.font = '400 10px "DM Mono", monospace'
      ctx.textAlign = 'left'
      ctx.fillText('This design has been validated by', rX, bY + 34)
      ctx.fillText('Forma Physics Engine v1.0', rX, bY + 50)

      // forma.app
      ctx.fillStyle = '#d4754a'
      ctx.font = '400 11px "DM Mono", monospace'
      ctx.fillText('forma.app', rX, bY + 70)

      // UID
      ctx.fillStyle = '#5a5045'
      ctx.font = '400 10px "DM Mono", monospace'
      ctx.fillText(uid, rX, bY + 88)

      // ══════════════════════════════════════════════════════════════════
      // DECORATIVE WATERMARK
      // ══════════════════════════════════════════════════════════════════
      ctx.save()
      ctx.globalAlpha = 0.04
      ctx.fillStyle = '#d4754a'
      ctx.font = '800 280px "Syne", sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText('F', W - 20, H - 10)
      ctx.restore()

      // Export PNG
      canvas.toBlob((blob) => {
        if (blob) resolve(blob)
        else reject(new Error('Canvas export failed'))
      }, 'image/png', 1.0)
    }).catch(reject)
  })
}

// React hook for certificate generation
export function useCertificate() {
  return { generateCertificate }
}
