/**
 * Student Chat Configuration
 *
 * @fileType utility
 * @domain config
 * @pattern typed-config-accessor
 * @ai-summary Typed getter for student_chat domain config values with hardcoded fallbacks
 */
import { ConfigDomain } from '@/infra/config/config-constants'
import { getConfigDomain } from '@/infra/config/runtime/config-values'

export interface StudentChatConfig {
  max_questions: number
  window_hours: number
}

const DEFAULTS: StudentChatConfig = {
  max_questions: 15,
  window_hours: 12,
}

export async function getStudentChatConfig(): Promise<StudentChatConfig> {
  try {
    const config = await getConfigDomain<StudentChatConfig>(ConfigDomain.StudentChat, {
      throwIfNotFound: false,
    })
    return { ...DEFAULTS, ...config }
  } catch {
    return DEFAULTS
  }
}
