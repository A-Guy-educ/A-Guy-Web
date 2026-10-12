/**
 * MathInline — TipTap node for an inline, atomic math atom. Content lives in
 * the `latex` attribute; rendering is handled by MathChip's NodeView.
 */

import { Node, mergeAttributes, ReactNodeViewRenderer } from '@tiptap/react'
import { MathChip } from './MathChip'
import { MATH_INLINE_NODE } from './tiptapMarkdown'

export const MathInline = Node.create({
  name: MATH_INLINE_NODE,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: false,

  addAttributes() {
    return {
      latex: {
        default: '',
        parseHTML: (el) => el.getAttribute('data-latex') ?? '',
        renderHTML: (attrs) => ({ 'data-latex': (attrs as { latex?: string }).latex ?? '' }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-math-inline]' }]
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes({ 'data-math-inline': 'true' }, HTMLAttributes)]
  },

  addNodeView() {
    return ReactNodeViewRenderer(MathChip)
  },
})
