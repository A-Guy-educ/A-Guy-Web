/**
 * Shared utilities for Exercise admin editors
 */

import { ZodError } from 'zod'
import type { EditorError } from './types'

/**
 * Convert Zod validation errors to editor error format
 */
export function zodErrorsToEditorErrors(error: ZodError, prefix = ''): EditorError[] {
  return error.issues.map((issue) => ({
    path: prefix ? `${prefix}.${issue.path.join('.')}` : issue.path.join('.'),
    message: issue.message,
  }))
}

/**
 * Get errors for a specific path
 */
export function getErrorsForPath(errors: EditorError[] | undefined, path: string): EditorError[] {
  if (!errors) return []
  return errors.filter((err) => err.path === path || err.path.startsWith(`${path}.`))
}

/**
 * Generate a unique block ID
 */
export function generateBlockId(): string {
  return `b${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}
