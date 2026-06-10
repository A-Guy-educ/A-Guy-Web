/**
 * Shared types for documentation chunks
 *
 * @ai-summary Pure data shapes shared between the doc-search runtime and the
 * chunk generation script. No business logic here — only types that must stay
 * in sync across both consumers.
 *
 * @fileType types
 * @domain ai
 * @pattern data-transfer
 */

export interface DocChunk {
  id: string
  title: string
  content: string
  keywords: string[]
  category: string
  sourceFile: string
  startLine?: number
  endLine?: number
  priority: number // Higher = more important
}

export interface DocChunks {
  chunks: DocChunk[]
  metadata: {
    generatedAt: string
    totalChunks: number
    sourceFiles: string[]
  }
}
