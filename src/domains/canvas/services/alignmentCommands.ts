import { fabric } from 'fabric'
import { OcrHotspotManager } from '@/domains/ocr/services/OcrHotspotManager'

export type AlignCommand =
  | 'alignLeft'
  | 'alignCenterX'
  | 'alignRight'
  | 'alignTop'
  | 'alignCenterY'
  | 'alignBottom'

export type DistributeCommand = 'distributeHorizontally' | 'distributeVertically'

const isEditableObject = (obj: fabric.Object) => {
  if (!obj.visible) return false
  if (OcrHotspotManager.isHotspot(obj)) return false
  return true
}

const getSelectionObjects = (canvas: fabric.Canvas): fabric.Object[] => {
  const active = canvas.getActiveObject()
  if (!active) return []

  if ((active as any).type === 'activeSelection' && Array.isArray((active as any)._objects)) {
    return (active as any)._objects.filter((obj: fabric.Object) => isEditableObject(obj))
  }

  if ((active as any).type === 'group' && Array.isArray((active as any)._objects)) {
    return (active as any)._objects.filter((obj: fabric.Object) => isEditableObject(obj))
  }

  return isEditableObject(active) ? [active] : []
}

const getBounds = (obj: fabric.Object) => obj.getBoundingRect(false, false)

export const applyAlignCommand = (canvas: fabric.Canvas, command: AlignCommand): boolean => {
  const objects = getSelectionObjects(canvas)
  if (objects.length < 2) return false

  const bounds = objects.map(getBounds)
  const groupBounds = {
    left: Math.min(...bounds.map((b) => b.left)),
    top: Math.min(...bounds.map((b) => b.top)),
    right: Math.max(...bounds.map((b) => b.left + b.width)),
    bottom: Math.max(...bounds.map((b) => b.top + b.height)),
  }
  const groupCenterX = (groupBounds.left + groupBounds.right) / 2
  const groupCenterY = (groupBounds.top + groupBounds.bottom) / 2

  for (const obj of objects) {
    const b = getBounds(obj)
    const centerX = b.left + b.width / 2
    const centerY = b.top + b.height / 2
    if (command === 'alignLeft') {
      obj.set('left', (obj.left || 0) + (groupBounds.left - b.left))
    } else if (command === 'alignCenterX') {
      obj.set('left', (obj.left || 0) + (groupCenterX - centerX))
    } else if (command === 'alignRight') {
      obj.set('left', (obj.left || 0) + (groupBounds.right - (b.left + b.width)))
    } else if (command === 'alignTop') {
      obj.set('top', (obj.top || 0) + (groupBounds.top - b.top))
    } else if (command === 'alignCenterY') {
      obj.set('top', (obj.top || 0) + (groupCenterY - centerY))
    } else if (command === 'alignBottom') {
      obj.set('top', (obj.top || 0) + (groupBounds.bottom - (b.top + b.height)))
    }
    obj.setCoords()
  }

  canvas.requestRenderAll()
  canvas.fire('object:modified', { target: canvas.getActiveObject() })
  return true
}

export const applyDistributeCommand = (canvas: fabric.Canvas, command: DistributeCommand): boolean => {
  const objects = getSelectionObjects(canvas)
  if (objects.length < 3) return false

  const sorted = [...objects].sort((a, b) => {
    const ab = getBounds(a)
    const bb = getBounds(b)
    return command === 'distributeHorizontally' ? ab.left - bb.left : ab.top - bb.top
  })

  const first = getBounds(sorted[0])
  const last = getBounds(sorted[sorted.length - 1])

  if (command === 'distributeHorizontally') {
    const totalWidth = sorted.reduce((acc, obj) => acc + getBounds(obj).width, 0)
    const span = last.left + last.width - first.left
    const gap = (span - totalWidth) / (sorted.length - 1)
    if (!Number.isFinite(gap)) return false

    let cursor = first.left + first.width + gap
    for (let i = 1; i < sorted.length - 1; i += 1) {
      const obj = sorted[i]
      const b = getBounds(obj)
      obj.set('left', (obj.left || 0) + (cursor - b.left))
      obj.setCoords()
      cursor += b.width + gap
    }
  } else {
    const totalHeight = sorted.reduce((acc, obj) => acc + getBounds(obj).height, 0)
    const span = last.top + last.height - first.top
    const gap = (span - totalHeight) / (sorted.length - 1)
    if (!Number.isFinite(gap)) return false

    let cursor = first.top + first.height + gap
    for (let i = 1; i < sorted.length - 1; i += 1) {
      const obj = sorted[i]
      const b = getBounds(obj)
      obj.set('top', (obj.top || 0) + (cursor - b.top))
      obj.setCoords()
      cursor += b.height + gap
    }
  }

  canvas.requestRenderAll()
  canvas.fire('object:modified', { target: canvas.getActiveObject() })
  return true
}

