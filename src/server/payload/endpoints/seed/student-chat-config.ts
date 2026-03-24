/**
 * Seed Student Chat Config Values
 *
 * Seeds default student chat quota configuration values.
 * Import and call seedStudentChatConfig() in seed/index.ts
 *
 * @fileType seed-function
 * @domain config.seed
 * @pattern data-seeding
 * @ai-summary Seeds student_chat domain defaults into config_values collection
 */
import type { Payload } from 'payload'

const studentChatConfigData = {
  max_questions: 15,
  window_hours: 12,
}

export async function seedStudentChatConfig(payload: Payload, tenantId: string): Promise<void> {
  const existing = await payload.find({
    collection: 'config_values',
    where: {
      and: [{ tenant: { equals: tenantId } }, { domain: { equals: 'student_chat' } }],
    },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    await payload.update({
      collection: 'config_values',
      id: existing.docs[0].id,
      data: {
        domain: 'student_chat',
        config: studentChatConfigData,
      },
    })
    payload.logger.info('— Updated student_chat config')
    return
  }

  await payload.create({
    collection: 'config_values',
    data: {
      tenant: tenantId,
      domain: 'student_chat',
      config: studentChatConfigData,
      description: 'Student chat quota: max questions per rolling window',
    },
  })
  payload.logger.info('— Created student_chat config')
}
