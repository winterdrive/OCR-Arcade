import { fabric } from 'fabric'
import type { SnapGuide, SpacingHint } from './alignmentEngine'

type RenderState = {
  guides: SnapGuide[]
  spacingHints: SpacingHint[]
}

const GUIDE_COLOR = 'rgba(59,130,246,0.9)'
const SPACING_COLOR = 'rgba(16,185,129,0.9)'
const LABEL_BG = 'rgba(15,23,42,0.85)'
const LABEL_TEXT = '#ffffff'

export class AlignmentGuideRenderer {
  private canvas: fabric.Canvas
  private state: RenderState = { guides: [], spacingHints: [] }
  private afterRenderHandler: () => void

  constructor(canvas: fabric.Canvas) {
    this.canvas = canvas
    this.afterRenderHandler = this.draw.bind(this)
    this.canvas.on('after:render', this.afterRenderHandler)
  }

  setState(nextState: RenderState) {
    this.state = nextState
  }

  clear() {
    this.state = { guides: [], spacingHints: [] }
    this.clearTopContext()
  }

  dispose() {
    this.canvas.off('after:render', this.afterRenderHandler)
    this.clearTopContext()
  }

  private clearTopContext() {
    const ctx = (this.canvas as any).contextTop as CanvasRenderingContext2D | undefined
    if (!ctx) return
    ctx.clearRect(0, 0, this.canvas.getWidth(), this.canvas.getHeight())
  }

  private draw() {
    const ctx = (this.canvas as any).contextTop as CanvasRenderingContext2D | undefined
    if (!ctx) return

    ctx.clearRect(0, 0, this.canvas.getWidth(), this.canvas.getHeight())
    if (this.state.guides.length === 0 && this.state.spacingHints.length === 0) {
      return
    }

    const zoom = this.canvas.getZoom() || 1
    const width = this.canvas.getWidth()
    const height = this.canvas.getHeight()

    ctx.save()
    ctx.lineWidth = 1

    for (const guide of this.state.guides) {
      ctx.beginPath()
      ctx.strokeStyle = GUIDE_COLOR
      if (guide.axis === 'x') {
        const x = guide.position * zoom
        ctx.moveTo(x, 0)
        ctx.lineTo(x, height)
      } else {
        const y = guide.position * zoom
        ctx.moveTo(0, y)
        ctx.lineTo(width, y)
      }
      ctx.stroke()
    }

    for (const hint of this.state.spacingHints) {
      const start = hint.start * zoom
      const end = hint.end * zoom
      const fixed = hint.fixed * zoom
      ctx.save()
      ctx.strokeStyle = SPACING_COLOR
      ctx.setLineDash([4, 3])
      ctx.beginPath()
      if (hint.axis === 'x') {
        ctx.moveTo(start, fixed)
        ctx.lineTo(end, fixed)
      } else {
        ctx.moveTo(fixed, start)
        ctx.lineTo(fixed, end)
      }
      ctx.stroke()
      ctx.restore()

      const label = `${hint.distance}`
      ctx.font = '10px sans-serif'
      const textWidth = ctx.measureText(label).width
      const paddingX = 4
      const labelW = textWidth + paddingX * 2
      const labelH = 16
      const mid = (start + end) / 2
      const labelX = hint.axis === 'x' ? mid - labelW / 2 : fixed + 6
      const labelY = hint.axis === 'x' ? fixed - labelH - 4 : mid - labelH / 2

      ctx.fillStyle = LABEL_BG
      ctx.fillRect(labelX, labelY, labelW, labelH)
      ctx.fillStyle = LABEL_TEXT
      ctx.textBaseline = 'middle'
      ctx.fillText(label, labelX + paddingX, labelY + labelH / 2)
    }

    ctx.restore()
  }
}
