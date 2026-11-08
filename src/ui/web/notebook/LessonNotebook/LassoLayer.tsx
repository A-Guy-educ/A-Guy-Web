'use client'

import { useRef, useState } from 'react'

import { NOTEBOOK_PAGE_WIDTH, type NotebookStroke } from '@/infra/types/notebook'
import { useClaimPencilTouches } from '@/ui/web/notebook/stylus-touch'
import { clampOffset, strokesBounds } from './lasso'
import { PEN_WIDTH, roundCoord } from './stroke-render'

/** A press this close (page units) to the selection still grabs it. */
const GRAB_PADDING = 12
const NO_OFFSET = { dx: 0, dy: 0 }

const OUTLINE = {
  vectorEffect: 'non-scaling-stroke',
  strokeWidth: 1.5,
  strokeDasharray: '6 4',
} as const

interface LassoLayerProps {
  height: number
  inks: readonly string[]
  selected: NotebookStroke[] | null
  fingerDraws: boolean
  onLasso: (loop: number[]) => void
  onMove: (dx: number, dy: number) => void
  onClear: () => void
}

type Gesture =
  | { kind: 'loop'; pointerId: number; points: number[] }
  | { kind: 'drag'; pointerId: number; startX: number; startY: number }

function pathFor(points: readonly number[]): string {
  const parts = [`M${points[0]} ${points[1]}`]
  for (let i = 2; i < points.length; i += 2) parts.push(`L${points[i]} ${points[i + 1]}`)
  // A one-point stroke is a dot; a path needs a segment for its round cap to show.
  if (points.length === 2) parts.push(`L${points[0]} ${points[1]}`)
  return parts.join('')
}

/**
 * Sits over a page while the lasso tool is on. Drawing a loop selects the ink
 * inside it; dragging inside the selection moves it. Drawn as vector paths in
 * page units so the selection can follow the pointer without repainting the
 * page canvas.
 */
export function LassoLayer({
  height,
  inks,
  selected,
  fingerDraws,
  onLasso,
  onMove,
  onClear,
}: LassoLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const [loop, setLoop] = useState<number[]>([])
  const [offset, setOffset] = useState(NO_OFFSET)
  useClaimPencilTouches(svgRef, fingerDraws)

  const bounds = selected ? strokesBounds(selected) : null

  const toPage = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = NOTEBOOK_PAGE_WIDTH / rect.width
    return [roundCoord((e.clientX - rect.left) * scale), roundCoord((e.clientY - rect.top) * scale)]
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0 || gesture.current) return
    if (e.pointerType === 'touch' && !fingerDraws) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = toPage(e)
    const grabbed =
      bounds &&
      x >= bounds.left - GRAB_PADDING &&
      x <= bounds.right + GRAB_PADDING &&
      y >= bounds.top - GRAB_PADDING &&
      y <= bounds.bottom + GRAB_PADDING
    if (grabbed) {
      gesture.current = { kind: 'drag', pointerId: e.pointerId, startX: x, startY: y }
      return
    }
    onClear()
    gesture.current = { kind: 'loop', pointerId: e.pointerId, points: [x, y] }
    setLoop([x, y])
  }

  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== e.pointerId) return
    e.preventDefault()
    const [x, y] = toPage(e)
    if (current.kind === 'loop') {
      current.points = [...current.points, x, y]
      setLoop(current.points)
    } else if (bounds) {
      setOffset(clampOffset(bounds, x - current.startX, y - current.startY, height))
    }
  }

  const reset = () => {
    gesture.current = null
    setLoop([])
    setOffset(NO_OFFSET)
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== e.pointerId) return
    if (current.kind === 'loop' && current.points.length >= 6) onLasso(current.points)
    if (current.kind === 'drag' && (offset.dx || offset.dy)) onMove(offset.dx, offset.dy)
    reset()
  }

  const onPointerAbort = (e: React.PointerEvent<SVGSVGElement>) => {
    if (gesture.current?.pointerId === e.pointerId) reset()
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${NOTEBOOK_PAGE_WIDTH} ${height}`}
      className="absolute inset-0 h-full w-full select-none cursor-crosshair"
      style={{ touchAction: fingerDraws ? 'none' : 'pan-x pan-y', WebkitTouchCallout: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerAbort}
      onLostPointerCapture={onPointerAbort}
    >
      {selected && bounds && (
        <g transform={`translate(${offset.dx} ${offset.dy})`}>
          {selected.map((stroke, index) => (
            <path
              key={index}
              d={pathFor(stroke.points)}
              fill="none"
              stroke={inks[stroke.ink] ?? inks[0]}
              strokeWidth={stroke.width ?? PEN_WIDTH}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          ))}
          <rect
            x={bounds.left}
            y={bounds.top}
            width={bounds.right - bounds.left}
            height={bounds.bottom - bounds.top}
            className="fill-primary/10 stroke-primary cursor-move"
            {...OUTLINE}
          />
        </g>
      )}
      {loop.length >= 4 && (
        <path d={`${pathFor(loop)}Z`} className="fill-primary/10 stroke-primary" {...OUTLINE} />
      )}
    </svg>
  )
}
