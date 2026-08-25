import { describe, expect, it } from 'vitest'

import { buildTutorContext } from '@/server/services/tutor-chat/context-builder'

describe('buildTutorContext', () => {
  it('keeps deterministic context order and bounded recent history', () => {
    const history = Array.from({ length: 25 }, (_, index) => ({
      id: String(index),
      role: index % 2 === 0 ? ('user' as const) : ('assistant' as const),
      content: `message-${index}`,
      timestamp: new Date(2026, 0, 1, 0, index).toISOString(),
    }))

    const result = buildTutorContext({
      message: 'current question',
      summary: 'Earlier learning summary',
      lessonText: 'Quadratic equations',
      attachmentText: 'Attached file: worksheet.pdf',
      history,
    })

    expect(result.system).toContain('A-Guy')
    expect(result.prompt.indexOf('Earlier learning summary')).toBeLessThan(
      result.prompt.indexOf('Quadratic equations'),
    )
    expect(result.prompt).not.toContain('message-4')
    expect(result.prompt).toContain('message-5')
    expect(result.prompt).toContain('current question')
    expect(result.recentMessageCount).toBe(20)
  })

  it('does not inject empty sections', () => {
    const result = buildTutorContext({ message: 'hello', history: [] })

    expect(result.prompt).not.toContain('undefined')
    expect(result.prompt).not.toContain('Conversation summary')
    expect(result.prompt).toContain('Student: hello')
  })
})
