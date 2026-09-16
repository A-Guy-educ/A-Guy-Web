'use client'

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import dynamic from 'next/dynamic'
import type { GeometrySpecV1 } from '@/infra/contracts'
import { renderGeometrySpec } from '../../graphics/geometryElements'
import { computeBoardSize } from '@/infra/utils/graphics/board-sizing'

const JSXGraphBoard = dynamic(
  () => import('../../graphics/JSXGraphBoard').then((m) => ({ default: m.JSXGraphBoard })),
  {
    ssr: false,
    loading: () => <div className="w-full h-64 bg-muted animate-pulse rounded-lg" />,
  },
)

export type DisplaySize = 'small' | 'medium' | 'large' | 'full'

const SIZE_MAP: Record<DisplaySize, number> = {
  small: 0.25,
  medium: 0.5,
  large: 0.75,
  full: 1,
}

interface GeometryRendererProps {
  blockId: string
  spec: GeometrySpecV1
  displaySize?: DisplaySize
}

export function GeometryRenderer({ blockId, spec, displaySize = 'full' }: GeometryRendererProps) {
  const handleBoardReady = useCallback(
    (board: JXG.Board) => {
      renderGeometrySpec(board, spec)
    },
    [spec],
  )

  const { canvas } = spec
  const boundingBox = useMemo<[number, number, number, number]>(
    () => canvas.boundingBox ?? [0, canvas.height, canvas.width, 0],
    [canvas.boundingBox, canvas.width, canvas.height],
  )

  // Size the container to match the bounding box aspect ratio so 1 unit on
  // x and 1 unit on y produce the same pixel length. Without this the
  // container was left at canvas.width × canvas.height and CSS max-width
  // stretched it to whatever the parent gave — unit circles rendered as
  // ~1.2:1 ellipses on the default 600×400 canvas.
  const [bbXMin, bbYMax, bbXMax, bbYMin] = boundingBox
  const xRange = Math.abs(bbXMax - bbXMin)
  const yRange = Math.abs(bbYMax - bbYMin)

  const containerRef = useRef<HTMLDivElement>(null)
  const [dimensions, setDimensions] = useState({ width: canvas.width, height: canvas.height })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const percentage = SIZE_MAP[displaySize]
    const recompute = () => {
      const availableWidth = container.clientWidth * percentage
      const size = computeBoardSize({
        xRange,
        yRange,
        availableWidth,
        maxWidth: availableWidth,
        maxHeight: Number.POSITIVE_INFINITY,
        minWidth: Math.min(200, availableWidth),
        minHeight: 200,
      })
      setDimensions(size)
    }
    recompute()
    // JSXGraphBoard rebuilds the whole board (freeBoard + initBoard +
    // renderGeometrySpec) whenever width/height change. Without an rAF
    // gate, a window drag fires ResizeObserver at animation-frame cadence
    // and every tick triggers a full O(elements) rebuild — heavy specs
    // visibly stutter. Coalescing consecutive ticks into one paint means
    // at most one rebuild per frame.
    let rafId: number | null = null
    const scheduleRecompute = () => {
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        recompute()
      })
    }
    const observer = new ResizeObserver(scheduleRecompute)
    observer.observe(container)
    return () => {
      observer.disconnect()
      if (rafId !== null) cancelAnimationFrame(rafId)
    }
  }, [xRange, yRange, displaySize])

  return (
    <div className="w-full" ref={containerRef}>
      <JSXGraphBoard
        id={blockId}
        width={dimensions.width}
        height={dimensions.height}
        boundingBox={boundingBox}
        showGrid={canvas.grid ?? false}
        showAxis={canvas.axis ?? false}
        onBoardReady={handleBoardReady}
        className="border-border"
      />
    </div>
  )
}
