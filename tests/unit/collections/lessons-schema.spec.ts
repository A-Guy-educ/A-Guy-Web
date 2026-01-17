/**
 * Unit Tests for Lessons Collection Schema
 *
 * Tests the lessonContextText field:
 * - Field exists and is of correct type
 * - Field is optional (not required)
 * - Field is NOT indexed
 */
import { describe, expect, it } from 'vitest'
import { Lessons } from '@/collections/Lessons'

describe('Lessons Schema', () => {
  describe('lessonContextText field', () => {
    it('should have lessonContextText field', () => {
      const field = Lessons.fields?.find((f) => f.name === 'lessonContextText')
      expect(field).toBeDefined()
    })

    it('should be textarea type', () => {
      const field = Lessons.fields?.find((f) => f.name === 'lessonContextText')
      expect(field).toBeDefined()
      expect(field?.type).toBe('textarea')
    })

    it('should be optional', () => {
      const field = Lessons.fields?.find((f) => f.name === 'lessonContextText')
      expect(field).toBeDefined()
      // Field should not be required
      expect(field?.required).toBeFalsy()
    })

    it('should NOT be indexed', () => {
      const field = Lessons.fields?.find((f) => f.name === 'lessonContextText')
      expect(field).toBeDefined()
      // Field should not have index property or it should be false
      expect(field?.index).toBeFalsy()
    })
  })
})
