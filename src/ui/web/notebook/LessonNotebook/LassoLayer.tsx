'use client'

import { useRef, useState } from 'react'

import { NOTEBOOK_PAGE_WIDTH, type NotebookStroke } from '@/infra/types/notebook'
import { useClaimPencilTouches } from '@/ui/web/notebook/stylus-touch'
import { clampOffset, clampScale, scaleStrokes, strokesBounds } from './lasso'
import { PEN_WIDTH, roundCoord } from './stroke-render'

/** A press this close (page units) to the selection still grabs it. */
const GRAB_PADDING = 12
const NO_OFFSET = { dx: 0, dy: 0 }
/** Size (page units) of the resize handle drawn on the selection's corner. */
const HANDLE_SIZE = 18
/** A press this close (page units) to the corner grabs the handle. */
const HANDLE_GRAB = 24

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
  /** Scale the selection from its top-left corner. */
  onResize: (scale: number) => void
  onClear: () => void
}

type Gesture = { pointerId: number; pointerType: string } & (
  | { kind: 'loop'; points: number[] }
  | { kind: 'drag'; startX: number; startY: number }
  | { kind: 'resize' }
)

function pathFor(points: readonly number[]): string {
  const parts = [`M${points[0]} ${points[1]}`]
  for (let i = 2; i < points.length; i += 2) parts.push(`L${points[i]} ${points[i + 1]}`)
  // A one-point stroke is a dot; a path needs a segment for its round cap to show.
  if (points.length === 2) parts.push(`L${points[0]} ${points[1]}`)
  return parts.join('')
}

/**
 * Sits over a page while the lasso tool is on. Drawing a loop selects the ink
 * inside it; dragging inside the selection moves it, and dragging its corner
 * handle resizes it. Drawn as vector paths in
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
  onResize,
  onClear,
}: LassoLayerProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const gesture = useRef<Gesture | null>(null)
  const [loop, setLoop] = useState<number[]>([])
  const [offset, setOffset] = useState(NO_OFFSET)
  const [scale, setScale] = useState(1)
  useClaimPencilTouches(svgRef, fingerDraws)

  const bounds = selected ? strokesBounds(selected) : null
  // While resizing, show the selection at its new size; widths stay as drawn.
  const shown =
    selected && bounds && scale !== 1
      ? scaleStrokes(selected, bounds.left, bounds.top, scale)
      : selected
  const shownBounds = shown && scale !== 1 ? strokesBounds(shown) : bounds

  const toPage = (e: React.PointerEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const scale = NOTEBOOK_PAGE_WIDTH / rect.width
    return [roundCoord((e.clientX - rect.left) * scale), roundCoord((e.clientY - rect.top) * scale)]
  }

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (e.button !== 0) return
    if (gesture.current) {
      // A second finger means a pinch: drop what the first finger started.
      if (e.pointerType === 'touch' && gesture.current.pointerType === 'touch') reset()
      return
    }
    if (e.pointerType === 'touch' && !fingerDraws) return
    e.preventDefault()
    e.currentTarget.setPointerCapture(e.pointerId)
    const [x, y] = toPage(e)
    const pointer = { pointerId: e.pointerId, pointerType: e.pointerType }
    if (
      bounds &&
      Math.abs(x - bounds.right) <= HANDLE_GRAB &&
      Math.abs(y - bounds.bottom) <= HANDLE_GRAB
    ) {
      gesture.current = { ...pointer, kind: 'resize' }
      return
    }
    const grabbed =
      bounds &&
      x >= bounds.left - GRAB_PADDING &&
      x <= bounds.right + GRAB_PADDING &&
      y >= bounds.top - GRAB_PADDING &&
      y <= bounds.bottom + GRAB_PADDING
    if (grabbed) {
      gesture.current = { ...pointer, kind: 'drag', startX: x, startY: y }
      return
    }
    onClear()
    gesture.current = { ...pointer, kind: 'loop', points: [x, y] }
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
    } else if (current.kind === 'drag' && bounds) {
      setOffset(clampOffset(bounds, x - current.startX, y - current.startY, height))
    } else if (current.kind === 'resize' && bounds) {
      // Follows the pointer along the box's diagonal, keeping its shape.
      const width = bounds.right - bounds.left
      const tall = bounds.bottom - bounds.top
      const wanted = (x - bounds.left + (y - bounds.top)) / (width + tall)
      setScale(clampScale(bounds, wanted, height))
    }
  }

  function reset() {
    gesture.current = null
    setLoop([])
    setOffset(NO_OFFSET)
    setScale(1)
  }

  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const current = gesture.current
    if (!current || current.pointerId !== e.pointerId) return
    if (current.kind === 'loop' && current.points.length >= 6) onLasso(current.points)
    if (current.kind === 'drag' && (offset.dx || offset.dy)) onMove(offset.dx, offset.dy)
    if (current.kind === 'resize' && scale !== 1) onResize(scale)
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
      {shown && shownBounds && (
        <g transform={`translate(${offset.dx} ${offset.dy})`}>
          {shown.map((stroke, index) => (
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
            x={shownBounds.left}
            y={shownBounds.top}
            width={shownBounds.right - shownBounds.left}
            height={shownBounds.bottom - shownBounds.top}
            className="fill-primary/10 stroke-primary cursor-move"
            {...OUTLINE}
          />
          <rect
            x={shownBounds.right - HANDLE_SIZE / 2}
            y={shownBounds.bottom - HANDLE_SIZE / 2}
            width={HANDLE_SIZE}
            height={HANDLE_SIZE}
            rx={3}
            className="fill-background stroke-primary cursor-nwse-resize"
            vectorEffect="non-scaling-stroke"
            strokeWidth={2}
          />
        </g>
      )}
      {loop.length >= 4 && (
        <path d={`${pathFor(loop)}Z`} className="fill-primary/10 stroke-primary" {...OUTLINE} />
      )}
    </svg>
  )
}
