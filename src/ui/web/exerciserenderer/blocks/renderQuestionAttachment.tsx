'use client'

import React from 'react'

import type { QuestionAttachment, SvgBlock } from '../types'
import { AxisRenderer } from './AxisRenderer'
import { GeometryRenderer } from './GeometryRenderer'
import { SvgRenderer } from './SvgRenderer'

/**
 * Render the visual side of a question attachment. Reuses the standalone
 * SVG / geometry / axis renderers so the attachment looks identical to its
 * `svg` / `question_geometry` / `question_axis` block counterpart. The
 * attachment carries no answer state — the SVG variant intentionally omits
 * hotspot / interactive fields (those stay on the standalone SVG block).
 *
 * Shared by ExerciseRenderer (interactive view) and ExerciseWorksheet
 * (scroll/PDF view) so a question block's `attachment` renders identically
 * across both. Chat-view bubbles do NOT call this directly — sections that
 * contain an attachment are routed through ExerciseRenderer instead (see
 * `isChatNativeSection` in ExerciseSectionBubble).
 */
export function renderQuestionAttachment(
  blockId: string,
  attachment: QuestionAttachment,
): React.ReactNode {
  const attachmentId = `${blockId}-attachment`
  if (attachment.kind === 'geometry') {
    return (
      <GeometryRenderer
        blockId={attachmentId}
        spec={attachment.geometry}
        displaySize={attachment.displaySize}
      />
    )
  }
  if (attachment.kind === 'axis') {
    return (
      <AxisRenderer
        blockId={attachmentId}
        spec={attachment.axis}
        displaySize={attachment.displaySize}
      />
    )
  }
  const svgBlock: SvgBlock = {
    id: attachmentId,
    type: 'svg',
    value: attachment.svg.value,
    altText: attachment.svg.altText,
    caption: attachment.svg.caption,
  }
  return <SvgRenderer block={svgBlock} displaySize={attachment.displaySize} />
}
