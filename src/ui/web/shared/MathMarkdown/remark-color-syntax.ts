/**
 * @fileType utility
 * @domain ui
 * @pattern remark-plugin
 * @ai-summary Remark plugin transforming ::token{text} syntax for highlights, named colors, sizes, and alignment (nests, recurses into inline formatting, and spans siblings).
 */

import { visit } from 'unist-util-visit'
import { isAllowedColorToken, isBlockColorToken } from '@/infra/utils/allowedColorTokens'

// Local type definitions for mdast nodes (to avoid adding new dependencies)

interface Node {
  type: string
  data?: Record<string, unknown>
}

interface Parent extends Node {
  children: Node[]
}

interface Text extends Node {
  type: 'text'
  value: string
}

interface Root extends Parent {
  type: 'root'
  children: Node[]
}

/**
 * Custom mdast node for highlighted text with hast data.
 * The data.hName and data.hProperties will be used by remark-rehype.
 */
interface HighlightTextNode extends Parent {
  type: 'highlightText'
  // Widened to any phrasing content so we can preserve nested strong/em/etc.
  // that fall between the opening and closing braces in the mdast tree.
  children: Node[]
  isBlock: boolean
  data: {
    hName: 'span' | 'div'
    hProperties: {
      className: string[]
    }
  }
}

/** Where a token's closing brace sits: `children[nodeIndex].value[charIndex]`. */
interface ClosePosition {
  nodeIndex: number
  charIndex: number
}

const TOKEN_MARKER_RE = /::([a-z0-9-]+)\{/g

/**
 * Remark plugin that transforms ::<token>{...} syntax into
 * <span class="aguy-<token>">...</span> for whitelisted color/size tokens.
 *
 * The plugin runs on `paragraph`, `heading`, and `listItem` nodes and:
 *
 * 1. Recurses into inline formatting nodes (strong, emphasis, delete, link…)
 *    so tokens fully contained inside `**bold**` or `*italic*` are picked up.
 * 2. Scans forward across sibling nodes when the opening `{` and closing `}`
 *    land in different text nodes (a common outcome when the author sprinkles
 *    bold/italic through the middle of a token). Any inline formatting between
 *    the braces is preserved inside the emitted `<span>`.
 * 3. Matches balanced braces and transforms the content recursively, so tokens
 *    can nest. Math is already an `inlineMath` node here (remarkMath runs
 *    first), so its braces are never counted.
 * 4. Falls through unrecognised tokens and unclosed tags as literal text
 *    (whitelist enforcement).
 * 5. Lifts block tokens (`text-align-right`) out of their paragraph as a
 *    `<div>`, since a `<div>` inside a `<p>` is invalid HTML. Nested inside
 *    inline formatting they stay a `<span>`, made block by CSS.
 * 6. Never touches code blocks, tables, or other non-phrasing content.
 *
 * SECURITY
 * - Only tokens in `ALLOWED_COLOR_TOKENS` are transformed.
 * - Uses `data.hName` + `data.hProperties` (safe remark-rehype directives) —
 *   never raw HTML — so unknown tokens can't inject markup.
 *
 * @example Single text node
 *   Input:  "This is ::text-green{important} text"
 *   Output: <p>This is <span class="aguy-text-green">important</span> text</p>
 *
 * @example Token fully inside bold
 *   Input:  "**intro ::text-blue{here} end**"
 *   Output: <p><strong>intro <span class="aguy-text-blue">here</span> end</strong></p>
 *
 * @example Token straddles an inline node
 *   Input:  "start ::text-blue{some *bold* here} end"
 *   Output: <p>start <span class="aguy-text-blue">some <em>bold</em> here</span> end</p>
 *
 * @example Nested tokens
 *   Input:  "::text-size-large{::text-blue{x}}"
 *   Output: <p><span class="aguy-text-size-large"><span class="aguy-text-blue">x</span></span></p>
 *
 * @example Whole-line alignment
 *   Input:  "::text-align-right{line}"
 *   Output: <div class="aguy-text-align-right">line</div>
 */
export function remarkColorSyntax() {
  return (tree: Root) => {
    const transformer = (node: Parent) => {
      node.children = transformChildren(node.children)
    }

    visit(tree, 'paragraph', transformer)
    visit(tree, 'heading', transformer)
    visit(tree, 'listItem', transformer)
    hoistBlockTokens(tree)
  }
}

function hasChildren(node: Node): node is Parent {
  return node.type !== 'text' && 'children' in node && Array.isArray((node as Parent).children)
}

function makeHighlightNode(token: string, children: Node[]): HighlightTextNode {
  return {
    type: 'highlightText',
    children,
    isBlock: isBlockColorToken(token),
    data: {
      hName: 'span',
      hProperties: {
        className: [`aguy-${token}`],
      },
    },
  }
}

function textNodes(value: string): Text[] {
  return value ? [{ type: 'text', value }] : []
}

function isBlockToken(node: Node): node is HighlightTextNode {
  return node.type === 'highlightText' && (node as HighlightTextNode).isBlock
}

function isBlankText(node: Node): boolean {
  return node.type === 'text' && !(node as Text).value.trim()
}

/** Replace paragraphs holding block tokens with the pieces around those tokens. */
function hoistBlockTokens(parent: Parent): void {
  parent.children = parent.children.flatMap((child) => {
    if (child.type === 'paragraph') return splitParagraphAroundBlocks(child as Parent)
    if (hasChildren(child)) hoistBlockTokens(child)
    return [child]
  })
}

function splitParagraphAroundBlocks(paragraph: Parent): Node[] {
  if (!paragraph.children.some(isBlockToken)) return [paragraph]

  const pieces: Node[] = []
  let run: Node[] = []
  const flushRun = () => {
    // Admin writes one align tag per line, so the "\n" between them is not content.
    if (!run.every(isBlankText)) pieces.push({ ...paragraph, children: run } as Parent)
    run = []
  }

  for (const child of paragraph.children) {
    if (isBlockToken(child)) {
      flushRun()
      pieces.push({ ...child, data: { ...child.data, hName: 'div' } } as HighlightTextNode)
    } else {
      run.push(child)
    }
  }
  flushRun()
  return pieces
}

/**
 * Transform a list of sibling children:
 *   1) Recurse into any child with its own children so nested tokens (e.g.
 *      inside `<strong>`) are transformed too.
 *   2) Walk the siblings left-to-right, greedily consuming ::<token>{...}
 *      spans that may cross node boundaries.
 */
function transformChildren(children: Node[]): Node[] {
  // Step 1: recurse into inline formatting containers.
  for (const child of children) {
    if (hasChildren(child)) {
      child.children = transformChildren(child.children)
    }
  }

  // Step 2: sibling-aware scan for tokens.
  const result: Node[] = []
  let i = 0
  while (i < children.length) {
    const consumed = tryConsumeToken(children, i, result)
    if (consumed > 0) {
      i += consumed
    } else {
      result.push(children[i])
      i++
    }
  }
  return result
}

/**
 * Find the brace closing a token whose content starts at `contentStart` in
 * `children[start]`. Only text siblings are counted: inline formatting and math
 * sit between the braces as their own nodes.
 */
function findClosingBrace(
  children: Node[],
  start: number,
  contentStart: number,
): ClosePosition | null {
  let depth = 1
  for (let nodeIndex = start; nodeIndex < children.length; nodeIndex++) {
    const node = children[nodeIndex]
    if (node.type !== 'text') continue

    const value = (node as Text).value
    for (let i = nodeIndex === start ? contentStart : 0; i < value.length; i++) {
      if (value[i] === '{') depth++
      if (value[i] === '}') depth--
      if (depth === 0) return { nodeIndex, charIndex: i }
    }
  }
  return null
}

/** The nodes between a token's opening brace and its closing brace. */
function sliceTokenContent(
  children: Node[],
  start: number,
  contentStart: number,
  close: ClosePosition,
): Node[] {
  const startText = (children[start] as Text).value
  if (close.nodeIndex === start) {
    return textNodes(startText.substring(contentStart, close.charIndex))
  }

  const closeText = (children[close.nodeIndex] as Text).value
  return [
    ...textNodes(startText.substring(contentStart)),
    ...children.slice(start + 1, close.nodeIndex),
    ...textNodes(closeText.substring(0, close.charIndex)),
  ]
}

/**
 * Try to match a ::<token>{...} span starting at `children[start]`. Pushes the
 * resulting nodes onto `output` and returns how many source children were
 * consumed. Returns 0 when there is no match at this position. Unknown or
 * unclosed markers are skipped, so they stay in the literal prefix.
 */
function tryConsumeToken(children: Node[], start: number, output: Node[]): number {
  const startNode = children[start]
  if (startNode.type !== 'text') return 0

  const startText = (startNode as Text).value
  for (const marker of startText.matchAll(TOKEN_MARKER_RE)) {
    const token = marker[1]
    if (!isAllowedColorToken(token)) continue

    const contentStart = marker.index + marker[0].length
    const close = findClosingBrace(children, start, contentStart)
    if (!close) continue

    const content = sliceTokenContent(children, start, contentStart, close)
    output.push(...textNodes(startText.substring(0, marker.index)))
    output.push(makeHighlightNode(token, transformChildren(content)))

    // Reprocess the tail so additional tokens on the same line still fire.
    const closeText = (children[close.nodeIndex] as Text).value
    const remainder = [
      ...textNodes(closeText.substring(close.charIndex + 1)),
      ...children.slice(close.nodeIndex + 1),
    ]
    output.push(...transformChildren(remainder))

    // We already consumed everything from `start` through end of siblings.
    return children.length - start
  }

  return 0
}
