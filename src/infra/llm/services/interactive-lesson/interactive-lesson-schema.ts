/**
 * Zod response schema for the Gemini interactive lesson call.
 *
 * @ai-summary Passed directly to Gemini's responseSchema API (not Genkit); Gemini's responseSchema implementation silently ignores `$ref`, `$defs`, and `oneOf` with discriminator — these constructs in the schema will be dropped and cause the call to fail with a schema validation error.
 */

import { z } from 'zod'

const GeoPointSchema = z.object({
  label: z.string(),
  x: z.number(),
  y: z.number(),
})

const GeoSegmentSchema = z.object({
  from: z.string(),
  to: z.string(),
  style: z.enum(['solid', 'dashed', 'bold']).optional(),
  color: z.enum(['blue', 'red', 'green', 'orange', 'purple']).optional(),
})

const GeoAngleSchema = z.object({
  points: z.array(z.string()).length(3),
  rightAngle: z.boolean().optional(),
})

const GeoLabelSchema = z.object({
  text: z.string(),
  x: z.number(),
  y: z.number(),
  fontSize: z.number().optional(),
})

const GeometrySchema = z.object({
  width: z.number(),
  height: z.number(),
  points: z.array(GeoPointSchema),
  segments: z.array(GeoSegmentSchema),
  angles: z.array(GeoAngleSchema),
  labels: z.array(GeoLabelSchema),
})

const GraphPlotSchema = z.object({
  id: z.string(),
  /** Array of [x, y] pre-sampled points (30–50 per curve is typical). */
  points: z.array(z.array(z.number()).length(2)).min(2),
  color: z.enum(['blue', 'red', 'green', 'orange', 'purple']).optional(),
  style: z.enum(['solid', 'dashed']).optional(),
  label: z.string().optional(),
})

const GraphMarkerSchema = z.object({
  id: z.string(),
  x: z.number(),
  y: z.number(),
  label: z.string().optional(),
  color: z.enum(['blue', 'red', 'green', 'orange', 'purple']).optional(),
})

const GraphSchema = z.object({
  xRange: z.array(z.number()).length(2),
  yRange: z.array(z.number()).length(2),
  xStep: z.number().optional(),
  yStep: z.number().optional(),
  plots: z.array(GraphPlotSchema),
  markers: z.array(GraphMarkerSchema),
})

const NumberLineMarkSchema = z.object({
  id: z.string(),
  value: z.number(),
  label: z.string().optional(),
  inclusion: z.enum(['open', 'closed']).optional(),
  color: z.enum(['blue', 'red', 'green', 'orange', 'purple']).optional(),
})

const NumberLineIntervalSchema = z.object({
  id: z.string(),
  from: z.number(),
  to: z.number(),
  /** 'unbounded' renders an arrow instead of an endpoint dot. */
  fromInclusion: z.enum(['open', 'closed', 'unbounded']),
  toInclusion: z.enum(['open', 'closed', 'unbounded']),
  color: z.enum(['blue', 'red', 'green', 'orange', 'purple']).optional(),
  label: z.string().optional(),
})

const NumberLineSchema = z.object({
  range: z.array(z.number()).length(2),
  step: z.number().optional(),
  marks: z.array(NumberLineMarkSchema),
  intervals: z.array(NumberLineIntervalSchema),
})

const StepSchema = z.object({
  id: z.number(),
  title: z.string(),
  claim: z.string(),
  reason: z.string(),
  narration: z.string(),
  explanation: z.string(),
  durationSeconds: z.number(),
  /** Array of [from, to] label pairs (geometry). */
  highlightSegments: z.array(z.array(z.string()).length(2)),
  highlightPoints: z.array(z.string()),
  /** Plot ids to reveal this step (graph scene). */
  highlightPlots: z.array(z.string()),
  /** Marker ids to reveal this step (graph scene). */
  highlightMarkers: z.array(z.string()),
  /** Mark ids to reveal this step (number-line scene). */
  highlightMarks: z.array(z.string()),
  /** Interval ids to draw this step (number-line scene). */
  highlightIntervals: z.array(z.string()),
})

export const InteractiveLessonResponseSchema = z.object({
  title: z.string(),
  geometry: GeometrySchema,
  graph: GraphSchema,
  numberLine: NumberLineSchema,
  steps: z.array(StepSchema),
})

export type InteractiveLessonResponseShape = z.infer<typeof InteractiveLessonResponseSchema>
