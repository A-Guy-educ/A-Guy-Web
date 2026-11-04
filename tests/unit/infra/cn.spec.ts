import { describe, expect, it } from 'vitest'

import { cn } from '@/infra/utils/ui'

describe('cn', () => {
  it('lets a design-token z-index override a numeric default', () => {
    expect(cn('fixed z-50 grid', 'z-modal')).toBe('fixed grid z-modal')
    expect(cn('inset-0 z-50', 'z-modal-backdrop')).toBe('inset-0 z-modal-backdrop')
  })

  it('still merges numeric z-index classes', () => {
    expect(cn('z-10', 'z-50')).toBe('z-50')
  })
})
