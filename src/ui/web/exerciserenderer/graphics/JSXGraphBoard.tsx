'use client'

import React, { useEffect, useId, useRef } from 'react'
import { cn } from '@/infra/utils/ui'

interface JSXGraphBoardProps {
  id: string
  width: number
  height: number
  boundingBox?: [number, number, number, number]
  showGrid?: boolean
  showAxis?: boolean
  axisConfig?: {
    showNumbers?: boolean
    showLabels?: boolean
    ticks?: number
    labels?: { x: string; y: string }
    tickPosition?: { x: 'default' | 'inverted'; y: 'default' | 'inverted' }
    origin?: { x: number; y: number }
  }
  onBoardReady: (board: JXG.Board) => void
  className?: string
}

export function JSXGraphBoard({
  id,
  width,
  height,
  boundingBox = [-10, 10, 10, -10],
  showGrid = false,
  showAxis = false,
  axisConfig,
  onBoardReady,
  className,
}: JSXGraphBoardProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const boardRef = useRef<JXG.Board | null>(null)
  const jxgRef = useRef<typeof JXG | null>(null)
  // Per-mount unique id. The same block can render in multiple
  // ExerciseRenderer trees at once (chat-view intro amber card + the
  // given-data pill), and JSXGraph.initBoard resolves the container via
  // document.getElementById — which always picks the FIRST match. Without
  // a per-mount id, the second mount would attach its board to the first
  // mount's div and then blank it out on cleanup. Colons from useId() are
  // valid in HTML5 ids but stripped anyway so downstream querySelector
  // consumers don't need to escape.
  const reactId = useId().replace(/[^a-zA-Z0-9-]/g, '')
  const containerId = `jsxgraph-${reactId}-${id}`

  useEffect(() => {
    let destroyed = false

    async function init() {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mod = (await import('jsxgraph')) as any
      const JXGLib = mod.default || mod
      if (destroyed || !containerRef.current) return

      jxgRef.current = JXGLib

      // Check if origin is outside the viewport — if so, create axes manually
      const ox = axisConfig?.origin?.x ?? 0
      const oy = axisConfig?.origin?.y ?? 0
      const [bbXMin, bbYMax, bbXMax, bbYMin] = boundingBox
      const originOutside = showAxis && (ox < bbXMin || ox > bbXMax || oy < bbYMin || oy > bbYMax)

      const tickDist = axisConfig?.ticks ?? 1
      const showNumbers = axisConfig?.showNumbers ?? true
      const showLabels = axisConfig?.showLabels ?? true

      const axisOpts =
        showAxis && !originOutside
          ? {
              axis: true,
              defaultAxes: {
                x: {
                  ticks: {
                    visible: showNumbers,
                    ticksDistance: tickDist,
                    label: {
                      offset: [0, axisConfig?.tickPosition?.x === 'inverted' ? 10 : -10],
                    },
                  },
                  name: axisConfig?.labels?.x ?? 'x',
                  withLabel: showLabels,
                  label: { position: 'rt', offset: [0, 12] },
                  lastArrow: true,
                },
                y: {
                  ticks: {
                    visible: showNumbers,
                    ticksDistance: tickDist,
                    label: {
                      offset: [axisConfig?.tickPosition?.y === 'inverted' ? 10 : -10, 0],
                    },
                  },
                  name: axisConfig?.labels?.y ?? 'y',
                  withLabel: showLabels,
                  label: { position: 'rt', offset: [15, 0] },
                  lastArrow: true,
                },
              },
            }
          : { axis: false }

      const board = JXGLib.JSXGraph.initBoard(containerId, {
        boundingbox: boundingBox,
        ...axisOpts,
        grid: showGrid,
        showNavigation: false,
        showCopyright: false,
        keepAspectRatio: false,
        pan: { needShift: true },
        zoom: { factorX: 1, factorY: 1 },
      } as JXG.BoardAttributes)

      // When origin is outside viewport, create axes manually at viewport edge
      if (originOutside) {
        const axOriginX = Math.max(bbXMin, Math.min(ox, bbXMax))
        const axOriginY = Math.max(bbYMin, Math.min(oy, bbYMax))
        const tickOpts = {
          visible: showNumbers,
          ticksDistance: tickDist,
          label: { fontSize: 12 },
          drawZero: true,
        }
        board.create(
          'axis',
          [
            [axOriginX, axOriginY],
            [axOriginX + 1, axOriginY],
          ],
          {
            ticks: tickOpts,
            name: axisConfig?.labels?.x ?? 'x',
            withLabel: showLabels,
          },
        )
        board.create(
          'axis',
          [
            [axOriginX, axOriginY],
            [axOriginX, axOriginY + 1],
          ],
          {
            ticks: tickOpts,
            name: axisConfig?.labels?.y ?? 'y',
            withLabel: showLabels,
          },
        )
      }

      boardRef.current = board
      onBoardReady(board)
    }

    init()

    return () => {
      destroyed = true
      if (boardRef.current && jxgRef.current) {
        try {
          jxgRef.current.JSXGraph.freeBoard(boardRef.current)
        } catch {
          /* ignore cleanup errors */
        }
        boardRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerId])

  return (
    <div
      ref={containerRef}
      id={containerId}
      className={cn('w-full border rounded-lg overflow-hidden bg-white', className)}
      style={{ width, height, maxWidth: '100%' }}
    />
  )
}
