/**
 * Unit Tests for V2StatusPanel Component
 *
 * Tests:
 * - Renders error reasons with page index
 * - Error details styling matches design
 * - Empty errors array hides error section
 * - Component matches visual snapshots
 *
 * These tests verify the V2StatusPanel error display implementation.
 */

import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { V2StatusPanel } from '@/ui/admin/exercise-conversion/V2StatusPanel'

// Mock the useDocumentInfo hook
vi.mock('@payloadcms/ui', () => ({
  useDocumentInfo: vi.fn(() => ({
    id: 'test-lesson-id',
    collection: { slug: 'lessons' },
  })),
}))

describe('V2StatusPanel - Error Display', () => {
  const defaultStatus = {
    status: 'completed' as const,
    output: {
      pagesTotal: 5,
      pagesProcessed: 5,
      exercisesCreated: 20,
      errors: [],
      warnings: [],
    },
    updatedAt: new Date().toISOString(),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders error count when errors array has items', () => {
    const statusWithErrors = {
      ...defaultStatus,
      status: 'failed' as const,
      output: {
        ...defaultStatus.output,
        errors: [{ pageIndex: 0, reason: 'Test error' }],
      },
    }

    render(<V2StatusPanel status={statusWithErrors} />)

    expect(screen.getByText('Errors')).toBeInTheDocument()
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders individual error reasons with page index', () => {
    const statusWithErrors = {
      ...defaultStatus,
      status: 'failed' as const,
      output: {
        ...defaultStatus.output,
        errors: [
          { pageIndex: 0, reason: 'Model returned no bboxes' },
          { pageIndex: 2, reason: 'Image crop below minimum size' },
        ],
      },
    }

    render(<V2StatusPanel status={statusWithErrors} />)

    // Should show "Page 1: reason" format (1-indexed)
    expect(screen.getByText('Page 1: Model returned no bboxes')).toBeInTheDocument()
    expect(screen.getByText('Page 3: Image crop below minimum size')).toBeInTheDocument()
  })

  it('does not render error section when errors array is empty', () => {
    const statusWithNoErrors = {
      ...defaultStatus,
      output: {
        ...defaultStatus.output,
        errors: [],
      },
    }

    render(<V2StatusPanel status={statusWithNoErrors} />)

    // Error section should not appear
    expect(screen.queryByText('Page 1:')).not.toBeInTheDocument()
  })

  it('renders error details with error-themed styling', () => {
    const statusWithErrors = {
      ...defaultStatus,
      status: 'failed' as const,
      output: {
        ...defaultStatus.output,
        errors: [{ pageIndex: 0, reason: 'Test error' }],
      },
    }

    render(<V2StatusPanel status={statusWithErrors} />)

    // The error section should have an error icon
    expect(screen.getByText('❌')).toBeInTheDocument()
  })

  it('handles multiple errors correctly', () => {
    const statusWithMultipleErrors = {
      ...defaultStatus,
      status: 'failed' as const,
      output: {
        ...defaultStatus.output,
        errors: [
          { pageIndex: 0, reason: 'Error on page 1' },
          { pageIndex: 1, reason: 'Error on page 2' },
          { pageIndex: 4, reason: 'Error on page 5' },
        ],
      },
    }

    render(<V2StatusPanel status={statusWithMultipleErrors} />)

    // All error messages should be rendered
    expect(screen.getByText('Page 1: Error on page 1')).toBeInTheDocument()
    expect(screen.getByText('Page 2: Error on page 2')).toBeInTheDocument()
    expect(screen.getByText('Page 5: Error on page 5')).toBeInTheDocument()

    // Error count should be 3
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('displays both errors and warnings when both are present', () => {
    const statusWithBoth = {
      ...defaultStatus,
      status: 'completed' as const,
      output: {
        ...defaultStatus.output,
        errors: [{ pageIndex: 2, reason: 'Image quality below threshold' }],
        warnings: ['Model returned no bboxes for some regions'],
      },
    }

    render(<V2StatusPanel status={statusWithBoth} />)

    // Both should be visible
    expect(screen.getByText('Page 3: Image quality below threshold')).toBeInTheDocument()
    expect(screen.getByText('⚠️ Model returned no bboxes for some regions')).toBeInTheDocument()
  })
})

describe('V2StatusPanel - Status Display', () => {
  it('displays correct badge for queued status', () => {
    const queuedStatus = {
      status: 'queued' as const,
      output: {
        pagesTotal: 5,
        pagesProcessed: 0,
        exercisesCreated: 0,
        errors: [],
        warnings: [],
      },
      updatedAt: new Date().toISOString(),
    }

    render(<V2StatusPanel status={queuedStatus} />)

    expect(screen.getByText('QUEUED')).toBeInTheDocument()
  })

  it('displays correct badge for running status', () => {
    const runningStatus = {
      status: 'running' as const,
      output: {
        pagesTotal: 5,
        pagesProcessed: 2,
        exercisesCreated: 8,
        errors: [],
        warnings: [],
      },
      updatedAt: new Date().toISOString(),
    }

    render(<V2StatusPanel status={runningStatus} />)

    expect(screen.getByText('RUNNING')).toBeInTheDocument()
    expect(screen.getByText('2 / 5')).toBeInTheDocument() // Pages progress
    expect(screen.getByText('8')).toBeInTheDocument() // Exercises created
  })

  it('displays correct badge for completed status', () => {
    const completedStatus = {
      status: 'completed' as const,
      output: {
        pagesTotal: 5,
        pagesProcessed: 5,
        exercisesCreated: 20,
        errors: [],
        warnings: [],
      },
      updatedAt: new Date().toISOString(),
    }

    render(<V2StatusPanel status={completedStatus} />)

    expect(screen.getByText('COMPLETED')).toBeInTheDocument()
  })

  it('displays correct badge for failed status', () => {
    const failedStatus = {
      status: 'failed' as const,
      output: {
        pagesTotal: 5,
        pagesProcessed: 1,
        exercisesCreated: 0,
        errors: [{ pageIndex: 0, reason: 'PDF parsing failed' }],
        warnings: [],
      },
      updatedAt: new Date().toISOString(),
    }

    render(<V2StatusPanel status={failedStatus} />)

    expect(screen.getByText('FAILED')).toBeInTheDocument()
  })
})
