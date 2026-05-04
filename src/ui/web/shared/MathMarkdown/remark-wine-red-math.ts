/**
 * @fileType utility
 * @domain ui
 * @pattern remark-plugin
 * @ai-summary Remark plugin to parse [wine-red-math]...[/wine-red-math] markers and emit custom nodes
 */

/**
 * Remark plugin to parse [wine-red-math]...[/wine-red-math] markers in markdown.
 *
 * These markers are emitted by the LaTeX parser's stripColorAndSizing function
 * when it encounters {\color{winered}...} in LaTeX source. This plugin transforms
 * them into custom mdast nodes with data.hProperties that mark the content for
 * wine-red rendering by the rehype layer.
 *
 * The token is transparent to KaTeX (remarkMath operates on the raw string
 * before math parsing), and the custom node's className is picked up by
 * rehypeMathWrapper to apply the wine-red color.
 */

import { visit } from 'unist-util-visit'

// Local type definitions mirroring remark-color-syntax.ts

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
 * Custom mdast node for wine-red math content.
 * The data.hName and data.hProperties will be used by remark-rehype.
 */
interface WineRedMathNode extends Parent {
  type: 'wineRedMath'
  children: Text[]
  data: {
    hName: 'span'
    hProperties: {
      className: string[]
    }
  }
}

/**
 * Remark plugin to transform [wine-red-math]...[/wine-red-math] markers.
 *
 * @example
 * Input:  "$[wine-red-math]x^2[/wine-red-math]$"
 * Output: <span class="wine-red-math-wrapper">x^2</span>
 */
export function remarkWineRedMath() {
  return (tree: Root) => {
    visit(tree, 'root', (node: Root) => {
      node.children = parseChildren(node.children)
    })
  }
}

/**
 * Recursively parse children, splitting text nodes on wine-red-math markers.
 */
function parseChildren(children: Node[]): Node[] {
  const result: Node[] = []

  for (const node of children) {
    if (node.type !== 'text') {
      // For non-text nodes, recursively parse their children
      if ('children' in node && Array.isArray((node as Parent).children)) {
        ;(node as Parent).children = parseChildren((node as Parent).children)
      }
      result.push(node)
      continue
    }

    const textNode = node as Text
    const text = textNode.value

    // Look for opening marker [wine-red-math]
    const openMarker = '[wine-red-math]'
    const closeMarker = '[/wine-red-math]'
    let start = 0

    while (start < text.length) {
      const markerIdx = text.indexOf(openMarker, start)

      if (markerIdx === -1) {
        // No more markers — add remaining text
        if (start < text.length) {
          result.push({ type: 'text', value: text.slice(start) } as Text)
        }
        break
      }

      // Text before the marker
      if (markerIdx > start) {
        result.push({ type: 'text', value: text.slice(start, markerIdx) } as Text)
      }

      // Find closing marker
      const contentStart = markerIdx + openMarker.length
      const closeIdx = text.indexOf(closeMarker, contentStart)

      if (closeIdx === -1) {
        // Unclosed — treat rest as literal text
        result.push({ type: 'text', value: text.slice(contentStart) } as Text)
        break
      }

      // Extract content and create WineRedMath node
      const content = text.slice(contentStart, closeIdx)
      const wineRedNode: WineRedMathNode = {
        type: 'wineRedMath',
        children: [{ type: 'text', value: content } as Text],
        data: {
          hName: 'span',
          hProperties: {
            className: ['wine-red-math-wrapper'],
          },
        },
      }
      result.push(wineRedNode as Node)

      // Continue after closing marker
      start = closeIdx + closeMarker.length
    }
  }

  return result
}
