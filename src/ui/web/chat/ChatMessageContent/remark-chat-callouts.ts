/**
 * @fileType utility
 * @domain ui
 * @pattern remark-plugin
 * @ai-summary Remark plugin that tags chat paragraphs starting with known Hebrew labels (הערה חשובה / דוגמה / טעות / טיפ / שאלה מנחה) as callouts so ChatMessageContent can render them with color + icon.
 */

import { visit } from 'unist-util-visit'

export type ChatCalloutKind = 'note' | 'example' | 'mistake' | 'tip' | 'guiding'

/**
 * Hebrew label → callout kind. Labels are matched with an optional trailing
 * colon and are compared after trimming whitespace, so both `**טעות:**` and
 * `**טעות**:` at the start of a paragraph will trigger the callout treatment.
 */
const LABEL_TO_KIND: Record<string, ChatCalloutKind> = {
  'הערה חשובה': 'note',
  הערה: 'note',
  דוגמה: 'example',
  טעות: 'mistake',
  טיפ: 'tip',
  'שאלה מנחה': 'guiding',
  'שאלה מדריכה': 'guiding',
}

// Minimal duck-typed shapes for the mdast nodes we touch. `@types/mdast` is
// not installed and pulling it in for one plugin isn't worth the devDep churn.
interface TextNode {
  type: 'text'
  value: string
}
interface StrongNode {
  type: 'strong'
  children: Array<TextNode | { type: string }>
}
interface ParagraphNode {
  type: 'paragraph'
  children: Array<StrongNode | TextNode | { type: string }>
  data?: {
    hProperties?: Record<string, unknown>
  }
}

/**
 * Tag chat paragraphs whose first child is a bold Hebrew label with a
 * `chat-callout chat-callout-<kind>` className, plus `data-callout-kind`,
 * so ChatMessageContent's custom `p` renderer can swap in the styled callout.
 * The bold label is left in place so it doubles as the callout heading.
 */
export function remarkChatCallouts() {
  return (tree: unknown) => {
    // The generic parameter of `visit` is loose — we cast the callback node to
    // our narrow ParagraphNode shape after the string-tag filter matches.
    visit(tree as never, 'paragraph', (raw: unknown) => {
      const node = raw as ParagraphNode
      // Require at least one child *after* the bold label so we don't wrap
      // an empty body in a coloured box when the AI emits a bare `**טעות:**`.
      if (node.children.length < 2) return
      const first = node.children[0]
      if (!isStrong(first)) return

      const labelText = readStrongText(first).replace(/:\s*$/, '').replace(/\s+/g, ' ').trim()
      const kind = LABEL_TO_KIND[labelText]
      if (!kind) return

      node.data ??= {}
      node.data.hProperties ??= {}
      const existing = node.data.hProperties.className
      const classList = Array.isArray(existing)
        ? existing.map(String)
        : typeof existing === 'string'
          ? [existing]
          : []
      node.data.hProperties.className = [...classList, 'chat-callout', `chat-callout-${kind}`]
      node.data.hProperties['data-callout-kind'] = kind
    })
  }
}

function isStrong(node: { type: string } | undefined): node is StrongNode {
  return !!node && node.type === 'strong'
}

function isText(node: { type: string }): node is TextNode {
  return node.type === 'text'
}

function readStrongText(node: StrongNode): string {
  return node.children.map((child) => (isText(child) ? child.value : '')).join('')
}
