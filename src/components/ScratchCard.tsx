import { useEffect, useRef, useState, type PointerEvent } from 'react'
import {
  REVEAL_THRESHOLD, SCRATCH_HEIGHT, SCRATCH_RADIUS, SCRATCH_WIDTH, scratchSegment,
} from '@/lib/scratch'

export default function ScratchCard({ onReveal, disabled }: { onReveal: () => void; disabled: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const previous = useRef<{ x: number; y: number } | null>(null)
  const activePointer = useRef<number | null>(null)
  const scratched = useRef(new Set<number>())
  const complete = useRef(false)
  const [percentage, setPercentage] = useState(0)

  useEffect(() => {
    const context = canvas.current?.getContext('2d')
    if (!context) return
    context.globalCompositeOperation = 'source-over'
    const gradient = context.createLinearGradient(0, 0, SCRATCH_WIDTH, SCRATCH_HEIGHT)
    gradient.addColorStop(0, '#8e3938')
    gradient.addColorStop(1, '#bf6b5c')
    context.fillStyle = gradient
    context.fillRect(0, 0, SCRATCH_WIDTH, SCRATCH_HEIGHT)
    context.fillStyle = '#fff8ef'
    context.textAlign = 'center'
    context.font = 'italic 31px Georgia, serif'
    context.fillText('A little surprise, just for you', SCRATCH_WIDTH / 2, 135)
    context.font = '20px sans-serif'
    context.fillText('Scratch here to unwrap', SCRATCH_WIDTH / 2, 178)
  }, [])

  const scratch = (event: PointerEvent<HTMLCanvasElement>, starting = false) => {
    if (disabled || complete.current || (!starting && activePointer.current !== event.pointerId)) return
    const rect = event.currentTarget.getBoundingClientRect()
    if (!rect.width || !rect.height) return
    const point = {
      x: (event.clientX - rect.left) * SCRATCH_WIDTH / rect.width,
      y: (event.clientY - rect.top) * SCRATCH_HEIGHT / rect.height,
    }
    const from = previous.current ?? point
    const context = canvas.current?.getContext('2d')
    if (context) {
      context.globalCompositeOperation = 'destination-out'
      context.lineWidth = SCRATCH_RADIUS * 2
      context.lineCap = 'round'
      context.beginPath()
      context.moveTo(from.x, from.y)
      context.lineTo(point.x, point.y)
      context.stroke()
      context.beginPath()
      context.arc(point.x, point.y, SCRATCH_RADIUS, 0, Math.PI * 2)
      context.fill()
    }
    previous.current = point
    const ratio = scratchSegment(scratched.current, from, point)
    setPercentage(Math.min(100, Math.round(ratio / REVEAL_THRESHOLD * 100)))
    if (ratio >= REVEAL_THRESHOLD) {
      complete.current = true
      onReveal()
    }
  }

  const finish = () => {
    previous.current = null
    activePointer.current = null
  }

  return (
    <div className="space-y-4">
      <div className="scratch-cover">
        <div className="absolute inset-0 flex items-center justify-center text-lg text-[#865b52]" aria-hidden="true">
          Almost unwrapped...
        </div>
        <canvas
          ref={canvas}
          width={SCRATCH_WIDTH}
          height={SCRATCH_HEIGHT}
          aria-hidden="true"
          className="relative block aspect-[2/1] w-full touch-none cursor-crosshair"
          onPointerDown={(event) => {
            if (disabled || activePointer.current !== null || event.button !== 0) return
            activePointer.current = event.pointerId
            event.currentTarget.setPointerCapture(event.pointerId)
            scratch(event, true)
          }}
          onPointerMove={(event) => scratch(event)}
          onPointerUp={finish}
          onPointerCancel={finish}
          onLostPointerCapture={finish}
        />
      </div>
      <p className="muted-copy">Scratch with your finger or mouse, or use the button below.</p>
      <progress aria-label="Scratch progress" className="festive-progress" value={percentage} max={100} />
      <button type="button" className="calendar-action w-full" disabled={disabled} onClick={onReveal}>
        Reveal my surprise
      </button>
    </div>
  )
}
