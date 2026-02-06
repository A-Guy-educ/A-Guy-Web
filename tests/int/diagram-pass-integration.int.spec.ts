import { runDiagramPass } from '@/server/services/exercise-conversion/diagram-pass'
import type { EnrichedExercise } from '@/server/services/exercise-conversion/idempotency'
import type { Mock } from 'vitest'
import { beforeEach, describe, expect, it, vi } from 'vitest'

// Shared mock storage - this must be at top level so vi.mock can access it
const mocks = {
  provider: {
    generateMultimodalCompletion: null as Mock | null,
    generateChatCompletion: null as Mock | null,
    generateChatCompletionWithTools: null as Mock | null,
    isConfigured: null as Mock | null,
    errorCodes: {} as Record<string, string>,
  },
}

// Initialize mock functions before vi.mock
mocks.provider.generateMultimodalCompletion = vi.fn()
mocks.provider.generateChatCompletion = vi.fn()
mocks.provider.generateChatCompletionWithTools = vi.fn()
mocks.provider.isConfigured = vi.fn().mockReturnValue(true)

vi.mock('@/infra/llm/providers/factory', async () => {
  return {
    getLLMProvider: vi.fn().mockResolvedValue(mocks.provider),
    getProviderTypeFromEnv: vi.fn().mockResolvedValue('GEMINI'),
    getProviderModelConfig: vi
      .fn()
      .mockReturnValue({ name: 'test', temperature: 0.1, maxOutputTokens: 8192 }),
  }
})

describe('Diagram Pass Integration', () => {
  const mockPayload = {} as never
  const mockAttachments = [{ data: 'base64pdf', mimeType: 'application/pdf' }]
  const mockSegment = { pageStart: 1, pageEnd: 2 }
  const mockPrompt = 'Generate TikZ'

  beforeEach(() => {
    vi.clearAllMocks()
    // Reset mock implementations
    mocks.provider.generateMultimodalCompletion = vi.fn()
    mocks.provider.generateChatCompletion = vi.fn()
    mocks.provider.generateChatCompletionWithTools = vi.fn()
    mocks.provider.isConfigured = vi.fn().mockReturnValue(true)
  })

  it('should process exercises with diagram blocks', async () => {
    mocks.provider.generateMultimodalCompletion!.mockResolvedValueOnce({
      text: '{"tikz":"\\\\begin{tikzpicture}\\\\draw (0,0) circle (1);\\\\end{tikzpicture}","confidence":"medium"}',
    })

    const exercises: EnrichedExercise[] = [
      {
        title: 'Geometry Problem',
        orderInSegment: 1,
        blocks: [
          { id: 'b1', type: 'rich_text', value: 'Diagram: A circle with radius r' },
          { id: 'b2', type: 'rich_text', value: 'Find the area.' },
        ],
      },
    ]

    const metrics = await runDiagramPass(mockPayload, {
      attachments: mockAttachments,
      segment: mockSegment,
      diagramPrompt: mockPrompt,
      exercises,
    })

    expect(metrics.detected).toBe(1)
    expect(metrics.attempted).toBe(1)
    expect(metrics.succeeded).toBe(1)
    expect(metrics.failed).toBe(0)

    // Verify TikZ was inserted
    expect(exercises[0].blocks).toHaveLength(3)
    expect(exercises[0].blocks[1].type).toBe('latex')
  })

  it('should skip segment with no diagrams', async () => {
    const exercises: EnrichedExercise[] = [
      {
        title: 'Text Only',
        orderInSegment: 1,
        blocks: [{ id: 'b1', type: 'rich_text', value: 'Just some text' }],
      },
    ]

    const metrics = await runDiagramPass(mockPayload, {
      attachments: mockAttachments,
      segment: mockSegment,
      diagramPrompt: mockPrompt,
      exercises,
    })

    expect(metrics.detected).toBe(0)
    expect(metrics.skipped).toBe(1)
    expect(exercises[0].blocks).toHaveLength(1) // Unchanged
  })

  it('should handle LLM failure gracefully', async () => {
    // Mock LLM to return null (failure)
    mocks.provider.generateMultimodalCompletion!.mockResolvedValueOnce({
      text: 'invalid json',
    })

    const exercises: EnrichedExercise[] = [
      {
        title: 'Problem',
        orderInSegment: 1,
        blocks: [{ id: 'b1', type: 'rich_text', value: 'Diagram: A shape' }],
      },
    ]

    const metrics = await runDiagramPass(mockPayload, {
      attachments: mockAttachments,
      segment: mockSegment,
      diagramPrompt: mockPrompt,
      exercises,
    })

    expect(metrics.detected).toBe(1)
    expect(metrics.attempted).toBe(1)
    expect(metrics.succeeded).toBe(0)
    expect(metrics.failed).toBe(1)
    // Original block should still be there
    expect(exercises[0].blocks).toHaveLength(1)
  })

  it('should track insertion offsets correctly for multiple diagrams in same exercise', async () => {
    mocks.provider
      .generateMultimodalCompletion!.mockResolvedValueOnce({
        text: '{"tikz":"tikz1","confidence":"high"}',
      })
      .mockResolvedValueOnce({
        text: '{"tikz":"tikz2","confidence":"high"}',
      })

    const exercises: EnrichedExercise[] = [
      {
        title: 'Multi Diagram',
        orderInSegment: 1,
        blocks: [
          { id: 'b1', type: 'rich_text', value: 'Diagram: First shape' },
          { id: 'b2', type: 'rich_text', value: 'Diagram: Second shape' },
          { id: 'b3', type: 'rich_text', value: 'Question text' },
        ],
      },
    ]

    await runDiagramPass(mockPayload, {
      attachments: mockAttachments,
      segment: mockSegment,
      diagramPrompt: mockPrompt,
      exercises,
    })

    // Should have: original 3 + 2 inserted = 5 blocks
    expect(exercises[0].blocks).toHaveLength(5)
    // First latex block after b1
    expect(exercises[0].blocks[1].type).toBe('latex')
    // Second latex block after b2 (now at index 3)
    expect(exercises[0].blocks[3].type).toBe('latex')
  })
})
