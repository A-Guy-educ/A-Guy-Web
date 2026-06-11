/**
 * Shared DocChunk contract between doc-search and chunk generation
 *
 * @ai-summary This is the shared schema contract. If the shape changes, both the doc-search consumer and the chunk generation script must be updated together.
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
