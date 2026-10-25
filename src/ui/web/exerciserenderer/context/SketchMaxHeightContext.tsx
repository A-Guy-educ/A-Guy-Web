'use client'

import { createContext, useContext } from 'react'

/**
 * Optional hard cap (px) on the rendered height of svg / geometry / axis
 * sketches. `undefined` keeps the shared 330px sketch spec. When set, the
 * renderers keep the sketch's aspect ratio and derive the width from the
 * capped height. The chat view sets it on mobile so a sketch never pushes a
 * question's answer area off-screen.
 */
const SketchMaxHeightContext = createContext<number | undefined>(undefined)

export const SketchMaxHeightProvider = SketchMaxHeightContext.Provider

export function useSketchMaxHeight(): number | undefined {
  return useContext(SketchMaxHeightContext)
}
