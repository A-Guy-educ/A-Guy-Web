/**
 * Serializer between the markdown wire format (text + inline `$...$` math)
 * and TipTap's JSON document shape. Math segments become atomic `mathInline`
 * nodes; text runs stay as plain `text` nodes.
 */

import type { JSONContent } from '@tiptap/react'

export const MATH_INLINE_NODE = 'mathInline'

export function markdownToTipTap(md: string): JSONContent {
  const paragraphs = (md ?? '').split('\n')
  const content = paragraphs.map((para) => {
    const inline = parseParagraphContent(para)
    return inline.length > 0 ? { type: 'paragraph', content: inline } : { type: 'paragraph' }
  })
  if (content.length === 0) content.push({ type: 'paragraph' })
  return { type: 'doc', content }
}

function parseParagraphContent(text: string): JSONContent[] {
  if (!text) return []
  const nodes: JSONContent[] = []
  let i = 0
  while (i < text.length) {
    const openIdx = text.indexOf('$', i)
    if (openIdx === -1) {
      const run = text.slice(i)
      if (run) nodes.push({ type: 'text', text: run })
      break
    }
    if (openIdx > i) nodes.push({ type: 'text', text: text.slice(i, openIdx) })
    const closeIdx = text.indexOf('$', openIdx + 1)
    if (closeIdx === -1) {
      // Unterminated `$` — keep as literal text so the student doesn't lose
      // characters mid-type while a formula is in flight.
      const tail = text.slice(openIdx)
      if (tail) nodes.push({ type: 'text', text: tail })
      break
    }
    const latex = text.slice(openIdx + 1, closeIdx).trim()
    if (latex) nodes.push({ type: MATH_INLINE_NODE, attrs: { latex } })
    i = closeIdx + 1
  }
  return nodes
}

export function tipTapToMarkdown(doc: JSONContent | null | undefined): string {
  if (!doc?.content) return ''
  return doc.content
    .filter((n) => n.type === 'paragraph')
    .map(renderParagraph)
    .join('\n')
}

function renderParagraph(para: JSONContent): string {
  if (!para.content) return ''
  return para.content
    .map((node) => {
      if (node.type === 'text') return node.text ?? ''
      if (node.type === MATH_INLINE_NODE) {
        const latex = (node.attrs?.latex as string | undefined) ?? ''
        return latex ? `$${latex}$` : ''
      }
      return ''
    })
    .join('')
}
