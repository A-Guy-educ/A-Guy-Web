// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'

import {
  takeAskPendingQuestion,
  writeAskPendingQuestion,
} from '@/client/state/sessionStorage/askPendingQuestion'

describe('ask pending question handoff', () => {
  beforeEach(() => sessionStorage.clear())

  it('is read once, per Ask room', () => {
    writeAskPendingQuestion('room-1', '  איך פותרים את זה?  ')

    expect(takeAskPendingQuestion('room-2')).toBeNull()
    expect(takeAskPendingQuestion('room-1')).toBe('איך פותרים את זה?')
    expect(takeAskPendingQuestion('room-1')).toBeNull()
  })

  it('ignores a blank question', () => {
    writeAskPendingQuestion('room-1', '   ')
    expect(takeAskPendingQuestion('room-1')).toBeNull()
  })
})
