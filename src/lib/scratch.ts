export const SCRATCH_WIDTH = 600
export const SCRATCH_HEIGHT = 300
export const SCRATCH_RADIUS = 30
export const REVEAL_THRESHOLD = 0.4
const CELL = 10
const COLUMNS = SCRATCH_WIDTH / CELL
const ROWS = SCRATCH_HEIGHT / CELL

export function scratchSegment(
  covered: Set<number>,
  from: { x: number; y: number },
  to: { x: number; y: number },
): number {
  const dx = to.x - from.x
  const dy = to.y - from.y
  const lengthSquared = dx * dx + dy * dy
  for (let row = 0; row < ROWS; row++) {
    for (let column = 0; column < COLUMNS; column++) {
      const x = (column + 0.5) * CELL
      const y = (row + 0.5) * CELL
      const t = lengthSquared === 0 ? 0
        : Math.max(0, Math.min(1, ((x - from.x) * dx + (y - from.y) * dy) / lengthSquared))
      if (Math.hypot(x - from.x - t * dx, y - from.y - t * dy) <= SCRATCH_RADIUS) {
        covered.add(row * COLUMNS + column)
      }
    }
  }
  return covered.size / (COLUMNS * ROWS)
}

export function safeHttpUrl(value: string | null): string | null {
  if (!value) return null
  try {
    const url = new URL(value)
    return ['https:', 'http:'].includes(url.protocol) ? url.href : null
  } catch {
    return null
  }
}
