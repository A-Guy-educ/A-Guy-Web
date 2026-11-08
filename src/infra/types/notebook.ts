/**
 * Notebook types shared by the notebook service, its API routes and the
 * lesson notebook UI.
 *
 * @fileType types
 * @domain notebook
 * @ai-summary A notebook page belongs to one student and is tagged with where it was made — a lesson or an Ask room (its conversation contextKey). A notebook is that student's pages for one scope; a cross-lesson notebook is the same pages viewed together, so there is no separate notebook record.
 */

/** Logical page width. Stroke coordinates are stored in this space so a page renders the same at any screen size. */
export const NOTEBOOK_PAGE_WIDTH = 900
export const NOTEBOOK_MIN_PAGE_HEIGHT = 600
export const NOTEBOOK_MAX_PAGE_HEIGHT = 20_000

/** Pen inks index into the `--pen-ink-*` design tokens, so stored strokes re-tint with the theme. */
export const NOTEBOOK_INK_COUNT = 3

export interface NotebookStroke {
  /** Index into the pen-ink palette. Ignored for eraser strokes. */
  ink: number
  erase?: boolean
  /**
   * Line width in page units. Set when the stroke was drawn on a small screen,
   * where the default would render hairline-thin; absent means the default.
   */
  width?: number
  /** Flat `[x0, y0, x1, y1, …]` in page coordinates. */
  points: number[]
}

/** A normalised rectangle (0–1) on the source it was cut from. */
export interface NotebookCutRect {
  x: number
  y: number
  w: number
  h: number
}

export interface NotebookCutSource {
  kind: 'pdf' | 'scroll'
  /** Media id of the PDF the cut came from (PDF cuts only). */
  mediaId?: string
  /** Human label shown in the page header, e.g. the file name. */
  label: string
  /** First PDF page the cut touches (PDF cuts only). */
  page?: number
  rect?: NotebookCutRect
}

export interface NotebookCut {
  mediaId: string
  url: string
  /** Pixel size of the cut image, used to lay it out before it loads. */
  width: number
  height: number
  source: NotebookCutSource
}

/**
 * Where a notebook lives. Stored as `lesson` or `askContext` on each page, so
 * lesson pages written before Ask notebooks existed need no migration.
 */
export type NotebookScope =
  { kind: 'lesson'; lessonId: string } | { kind: 'ask'; contextKey: string }

export interface NotebookPage {
  id: string
  scope: NotebookScope
  height: number
  cut: NotebookCut | null
  strokes: NotebookStroke[]
  createdAt: string
  updatedAt: string
}

export interface NotebookPageCreateInput {
  scope: NotebookScope
  height: number
  cut?: NotebookCut | null
}

export interface NotebookPageUpdateInput {
  height?: number
  strokes?: NotebookStroke[]
}
