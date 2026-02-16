export type SnapAxis = 'x' | 'y'
export type SnapKind = 'left' | 'centerX' | 'right' | 'top' | 'centerY' | 'bottom'

export interface RectBounds {
  id: string
  left: number
  top: number
  right: number
  bottom: number
  width: number
  height: number
  centerX: number
  centerY: number
  type: 'object' | 'canvas'
}

export interface SnapGuide {
  axis: SnapAxis
  position: number
}

export interface SpacingHint {
  axis: SnapAxis
  start: number
  end: number
  fixed: number
  distance: number
}

export interface SnapResult {
  deltaX: number
  deltaY: number
  matchedGuides: SnapGuide[]
  spacingHints: SpacingHint[]
}

type Match = {
  delta: number
  axis: SnapAxis
  kind: SnapKind
  position: number
}

const getComparables = (rect: RectBounds) => ({
  left: rect.left,
  centerX: rect.centerX,
  right: rect.right,
  top: rect.top,
  centerY: rect.centerY,
  bottom: rect.bottom,
})

const kindPriority = (kind: SnapKind) => {
  if (kind === 'centerX' || kind === 'centerY') return 0
  return 1
}

const findBestMatch = (
  axis: SnapAxis,
  active: RectBounds,
  candidates: RectBounds[],
  tolerance: number,
): Match | null => {
  const activeCompares = getComparables(active)
  const axisKinds: SnapKind[] =
    axis === 'x' ? ['left', 'centerX', 'right'] : ['top', 'centerY', 'bottom']

  let best: Match | null = null
  for (const candidate of candidates) {
    const candidateCompares = getComparables(candidate)
    for (const kind of axisKinds) {
      const delta = candidateCompares[kind] - activeCompares[kind]
      if (Math.abs(delta) > tolerance) continue
      const next: Match = {
        delta,
        axis,
        kind,
        position: candidateCompares[kind],
      }
      if (!best) {
        best = next
        continue
      }
      const absNext = Math.abs(next.delta)
      const absBest = Math.abs(best.delta)
      if (absNext < absBest) {
        best = next
        continue
      }
      if (absNext === absBest && kindPriority(next.kind) < kindPriority(best.kind)) {
        best = next
      }
    }
  }
  return best
}

const overlapsVertically = (a: RectBounds, b: RectBounds) => {
  return a.top < b.bottom && a.bottom > b.top
}

const overlapsHorizontally = (a: RectBounds, b: RectBounds) => {
  return a.left < b.right && a.right > b.left
}

export const computeSmartSpacing = (
  active: RectBounds,
  candidates: RectBounds[],
  tolerance: number,
): SpacingHint[] => {
  const objectCandidates = candidates.filter((c) => c.type === 'object')
  const hints: SpacingHint[] = []

  const leftCandidates = objectCandidates
    .filter((c) => overlapsVertically(active, c) && c.right <= active.left)
    .sort((a, b) => b.right - a.right)
  const rightCandidates = objectCandidates
    .filter((c) => overlapsVertically(active, c) && c.left >= active.right)
    .sort((a, b) => a.left - b.left)
  const topCandidates = objectCandidates
    .filter((c) => overlapsHorizontally(active, c) && c.bottom <= active.top)
    .sort((a, b) => b.bottom - a.bottom)
  const bottomCandidates = objectCandidates
    .filter((c) => overlapsHorizontally(active, c) && c.top >= active.bottom)
    .sort((a, b) => a.top - b.top)

  if (leftCandidates.length > 0 && rightCandidates.length > 0) {
    const left = leftCandidates[0]
    const right = rightCandidates[0]
    const gapLeft = active.left - left.right
    const gapRight = right.left - active.right
    if (Math.abs(gapLeft - gapRight) <= tolerance) {
      hints.push({
        axis: 'x',
        start: left.right,
        end: active.left,
        fixed: active.centerY,
        distance: Math.round(gapLeft),
      })
      hints.push({
        axis: 'x',
        start: active.right,
        end: right.left,
        fixed: active.centerY,
        distance: Math.round(gapRight),
      })
    }
  }

  if (topCandidates.length > 0 && bottomCandidates.length > 0) {
    const top = topCandidates[0]
    const bottom = bottomCandidates[0]
    const gapTop = active.top - top.bottom
    const gapBottom = bottom.top - active.bottom
    if (Math.abs(gapTop - gapBottom) <= tolerance) {
      hints.push({
        axis: 'y',
        start: top.bottom,
        end: active.top,
        fixed: active.centerX,
        distance: Math.round(gapTop),
      })
      hints.push({
        axis: 'y',
        start: active.bottom,
        end: bottom.top,
        fixed: active.centerX,
        distance: Math.round(gapBottom),
      })
    }
  }

  return hints
}

export const computeSnap = (
  active: RectBounds,
  candidates: RectBounds[],
  snapTolerance: number,
  spacingTolerance: number,
): SnapResult => {
  const xMatch = findBestMatch('x', active, candidates, snapTolerance)
  const yMatch = findBestMatch('y', active, candidates, snapTolerance)

  const matchedGuides: SnapGuide[] = []
  if (xMatch) {
    matchedGuides.push({ axis: 'x', position: xMatch.position })
  }
  if (yMatch) {
    matchedGuides.push({ axis: 'y', position: yMatch.position })
  }

  return {
    deltaX: xMatch?.delta ?? 0,
    deltaY: yMatch?.delta ?? 0,
    matchedGuides,
    spacingHints: computeSmartSpacing(active, candidates, spacingTolerance),
  }
}

