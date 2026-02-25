import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock agent-runner
vi.mock('../../../../scripts/cody/agent-runner', () => ({
  runAgentWithFileWatch: vi.fn().mockResolvedValue({
    succeeded: true,
    timedOut: false,
    retries: 0,
  }),
}))

// Mock pipeline-utils
vi.mock('../../../../scripts/cody/pipeline-utils', () => ({
  stageOutputFile: vi.fn((taskDir, stage) => `${taskDir}/${stage}.json`),
}))

// Import after mocks
import { AgentHandler } from '../../../../scripts/cody/handlers/agent-handler'
import { runAgentWithFileWatch } from '../../../../scripts/cody/agent-runner'
import type { PipelineContext, StageDefinition } from '../../../../scripts/cody/engine/types'

describe('AgentHandler', () => {
  let handler: AgentHandler
  let mockCtx: PipelineContext
  let mockDef: StageDefinition

  beforeEach(() => {
    vi.clearAllMocks()
    handler = new AgentHandler()

    mockCtx = {
      taskId: 'test-task-123',
      taskDir: '/test/.tasks/test-task-123',
      input: {
        taskId: 'test-task-123',
        mode: 'full',
        dryRun: false,
      },
      taskDef: null,
      profile: 'standard',
      backend: {
        name: 'test-runner',
        spawn: vi.fn(),
      },
    }

    mockDef = {
      name: 'taskify',
      type: 'agent',
      timeout: 300000,
      maxRetries: 1,
      postActions: [],
    }
  })

  describe('execute', () => {
    it('should call runAgentWithFileWatch with correct parameters', async () => {
      await handler.execute(mockCtx, mockDef)

      expect(runAgentWithFileWatch).toHaveBeenCalledWith(
        mockCtx.input,
        'taskify',
        '/test/.tasks/test-task-123/taskify.json',
        300000,
        expect.objectContaining({
          backend: mockCtx.backend,
          maxRetries: 1,
        }),
      )
    })

    it('should pass maxRetries from stage definition to agent runner', async () => {
      mockDef.maxRetries = 3

      await handler.execute(mockCtx, mockDef)

      expect(runAgentWithFileWatch).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          maxRetries: 3,
        }),
      )
    })

    it('should return completed outcome when agent succeeds', async () => {
      vi.mocked(runAgentWithFileWatch).mockResolvedValueOnce({
        succeeded: true,
        timedOut: false,
        retries: 0,
      })

      const result = await handler.execute(mockCtx, mockDef)

      expect(result).toEqual({
        outcome: 'completed',
        retries: 0,
        outputFile: 'taskify.md',
      })
    })

    it('should return failed outcome when agent fails', async () => {
      vi.mocked(runAgentWithFileWatch).mockResolvedValueOnce({
        succeeded: false,
        timedOut: false,
        retries: 1,
      })

      const result = await handler.execute(mockCtx, mockDef)

      expect(result).toEqual({
        outcome: 'failed',
        reason: 'Agent failed',
        retries: 1,
      })
    })

    it('should return timed_out outcome when agent times out', async () => {
      vi.mocked(runAgentWithFileWatch).mockResolvedValueOnce({
        succeeded: false,
        timedOut: true,
        retries: 0,
      })

      const result = await handler.execute(mockCtx, mockDef)

      expect(result).toEqual({
        outcome: 'timed_out',
        retries: 0,
      })
    })

    it('should use output file extension based on stage name', async () => {
      mockDef.name = 'build'

      await handler.execute(mockCtx, mockDef)

      expect(runAgentWithFileWatch).toHaveBeenCalledWith(
        expect.anything(),
        'build',
        '/test/.tasks/test-task-123/build.json',
        expect.anything(),
        expect.anything(),
      )
    })

    it('should pass validator when defined in stage definition', async () => {
      const mockValidator = vi.fn().mockReturnValue({ valid: true })
      mockDef.validator = mockValidator

      await handler.execute(mockCtx, mockDef)

      expect(runAgentWithFileWatch).toHaveBeenCalledWith(
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.anything(),
        expect.objectContaining({
          validateOutput: mockValidator,
        }),
      )
    })
  })
})
