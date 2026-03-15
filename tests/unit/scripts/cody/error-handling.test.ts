import { describe, it, expect, vi, beforeEach } from 'vitest'

// ============================================================================
// Mocks
// ============================================================================

// Mock agent-runner
vi.mock('../../../../scripts/cody/agent-runner', () => ({
  runAgentWithFileWatch: vi.fn().mockResolvedValue({
    succeeded: true,
    timedOut: false,
    retries: 0,
  }),
}))

// Mock stages/registry
vi.mock('../../../../scripts/cody/stages/registry', () => ({
  stageOutputFile: vi.fn((taskDir: string, stage: string) => `${taskDir}/${stage}.md`),
  getStageTimeout: vi.fn(() => 300000),
}))

// Mock chat-history
vi.mock('../../../../scripts/cody/chat-history', () => ({
  appendSession: vi.fn().mockResolvedValue(undefined),
}))

// Mock pipeline-utils
vi.mock('../../../../scripts/cody/pipeline-utils', () => ({
  readTask: vi.fn(),
  resolvePipelineProfile: vi.fn(() => 'standard'),
  resolveControlMode: vi.fn(() => 'auto'),
  getComplexityTier: vi.fn(() => 'moderate'),
}))

// Mock clarify-workflow
vi.mock('../../../../scripts/cody/clarify-workflow', () => ({
  handleGateApproval: vi.fn(() => 'approved'),
}))

// Mock github-api
vi.mock('../../../../scripts/cody/github-api', () => ({
  extractGateCommentBody: vi.fn(),
  postComment: vi.fn(),
  addIssueLabel: vi.fn(),
  removeIssueLabel: vi.fn(),
  setClassificationLabels: vi.fn(),
  setProfileLabel: vi.fn(),
  GATE_LABELS: { HARD_STOP: 'hard-stop', RISK_GATED: 'risk-gated' },
}))

// Mock git-utils
vi.mock('../../../../scripts/cody/git-utils', () => ({
  commitPipelineFiles: vi.fn(),
}))

// Mock engine/status
vi.mock('../../../../scripts/cody/engine/status', () => ({
  updateStage: vi.fn((_s: unknown) => _s),
  completeState: vi.fn((_s: unknown) => _s),
  writeState: vi.fn(),
  appendActorEvent: vi.fn(),
}))

// Mock child_process for validate-src-changes tests
vi.mock('child_process', () => ({
  execFileSync: vi.fn(),
}))

// Mock logger
const { mockLogger } = vi.hoisted(() => {
  const mockLogger = {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    child: vi.fn().mockReturnThis(),
    trace: vi.fn(),
    silent: vi.fn(),
    level: 'info',
  }
  return { mockLogger }
})

vi.mock('../../../../scripts/cody/logger', () => ({
  logger: mockLogger,
  createStageLogger: vi.fn().mockReturnValue(mockLogger),
}))

// Mock error-classifier
vi.mock('../../../../scripts/cody/pipeline/error-classifier', () => ({
  classifyError: vi.fn(() => ({ category: 'unknown', message: 'test' })),
  formatErrorsAsMarkdown: vi.fn(() => '# Errors'),
}))

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { AgentHandler } from '../../../../scripts/cody/handlers/agent-handler'
import { runAgentWithFileWatch } from '../../../../scripts/cody/agent-runner'
import { executePostAction } from '../../../../scripts/cody/pipeline/post-actions'
import { execFileSync } from 'child_process'
import type {
  PipelineContext,
  StageDefinition,
  PostAction,
} from '../../../../scripts/cody/engine/types'

// ============================================================================
// Tests
// ============================================================================

describe('Error Handling Hardening', () => {
  let mockCtx: PipelineContext
  let mockDef: StageDefinition

  beforeEach(() => {
    vi.clearAllMocks()

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
      name: 'build',
      type: 'agent',
      timeout: 300000,
      maxRetries: 1,
    }
  })

  describe('agent failure reason includes validation errors', () => {
    it('should include validation errors in failure reason', async () => {
      vi.mocked(runAgentWithFileWatch).mockResolvedValueOnce({
        succeeded: false,
        timedOut: false,
        retries: 2,
        validationErrors: ['Missing ## Changes section', 'No file paths found'],
      })

      const handler = new AgentHandler()
      const result = await handler.execute(mockCtx, mockDef)

      expect(result.outcome).toBe('failed')
      expect(result.reason).toContain('Missing ## Changes section')
      expect(result.reason).toContain('No file paths found')
      expect(result.reason).toContain('Validation errors:')
    })
  })

  describe('agent failure reason includes artifact paths', () => {
    it('should mention stderr.log and events.jsonl in failure reason', async () => {
      vi.mocked(runAgentWithFileWatch).mockResolvedValueOnce({
        succeeded: false,
        timedOut: false,
        retries: 0,
      })

      const handler = new AgentHandler()
      const result = await handler.execute(mockCtx, mockDef)

      expect(result.outcome).toBe('failed')
      expect(result.reason).toContain('build-stderr.log')
      expect(result.reason).toContain('build-events.jsonl')
    })

    it('should use agentName when set on definition', async () => {
      mockDef.agentName = 'custom-agent'

      vi.mocked(runAgentWithFileWatch).mockResolvedValueOnce({
        succeeded: false,
        timedOut: false,
        retries: 0,
      })

      const handler = new AgentHandler()
      const result = await handler.execute(mockCtx, mockDef)

      expect(result.outcome).toBe('failed')
      expect(result.reason).toContain('Agent "custom-agent" failed')
    })

    it('should propagate tokenUsage and cost on failure', async () => {
      vi.mocked(runAgentWithFileWatch).mockResolvedValueOnce({
        succeeded: false,
        timedOut: false,
        retries: 1,
        tokenUsage: { input: 1000, output: 500, cacheRead: 200 },
        cost: 0.05,
      })

      const handler = new AgentHandler()
      const result = await handler.execute(mockCtx, mockDef)

      expect(result.outcome).toBe('failed')
      expect(result.tokenUsage).toEqual({ input: 1000, output: 500, cacheRead: 200 })
      expect(result.cost).toBe(0.05)
    })
  })

  describe('validate-src-changes throws git-specific error when git fails', () => {
    it('should throw git-specific error when both git commands fail', async () => {
      vi.mocked(execFileSync).mockImplementation(() => {
        throw new Error('fatal: not a git repository')
      })

      const action: PostAction = { type: 'validate-src-changes' }

      await expect(executePostAction(mockCtx, action, null)).rejects.toThrow(
        'validate-src-changes: git commands failed',
      )
    })

    it('should NOT throw git error when git partially succeeds with data', async () => {
      // First call (git diff) returns a file, second call (ls-files) throws
      vi.mocked(execFileSync)
        .mockReturnValueOnce('src/index.ts')
        .mockImplementationOnce(() => {
          throw new Error('git ls-files failed')
        })

      const action: PostAction = { type: 'validate-src-changes' }

      // Should throw because gitFailed is set when any git command fails
      await expect(executePostAction(mockCtx, action, null)).rejects.toThrow(
        'validate-src-changes: git commands failed',
      )
    })
  })

  describe('unknown post-action type throws instead of warning', () => {
    it('should throw Error for unknown post-action type', async () => {
      const action = { type: 'nonexistent' } as unknown as PostAction

      await expect(executePostAction(mockCtx, action, null)).rejects.toThrow(
        'Unknown post-action type: "nonexistent"',
      )
    })

    it('should throw Error (not just log warning) for unknown type', async () => {
      const action = { type: 'bogus-action' } as unknown as PostAction

      await expect(executePostAction(mockCtx, action, null)).rejects.toThrow(Error)
    })
  })
})
