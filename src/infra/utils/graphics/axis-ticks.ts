/**
 * @fileType utility
 * @domain graphics
 * @pattern jsxgraph-config
 * @ai-summary Fixed 1-unit tick and grid spacing for axis boards, shared with the admin editor
 */

/**
 * Pin axis ticks to 1-unit spacing. JSXGraph's `insertTicks` defaults to true
 * and re-spaces ticks to 0.5 or 2 depending on zoom.
 */
export const AXIS_TICK_OPTIONS = { ticksDistance: 1, insertTicks: false, minorTicks: 0 } as const

/** Grid lines at every integer. The default grid (`majorStep: 'auto'`) follows the ticks. */
export const AXIS_GRID_OPTIONS = { majorStep: [1, 1], minorElements: 0 }
