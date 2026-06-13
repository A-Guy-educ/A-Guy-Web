/**
 * Teacher Profile Block Builder
 *
 * @ai-summary The <teacher_profile> XML tag is parsed by the prompt-composer; changing the tag name without updating the parser causes teacher profile content to bleed into the system prompt as plain text.
 */

import type { ResolvedTeacherProfile } from '@/server/services/teacher-profile-resolver'

/**
 * Builds the teacher profile block for system prompt injection
 *
 * Format:
 * ```
 * <teacher_profile>
 * Name: {label}
 * Description: {description}
 *
 * Behavior:
 * {systemPrompt.template text}
 * </teacher_profile>
 * ```
 *
 * @param profile - Resolved teacher profile
 * @returns Formatted teacher profile block string
 */
export function buildTeacherProfileBlock(profile: ResolvedTeacherProfile): string {
  const block = `<teacher_profile>
Name: ${profile.profileLabel}
Description: ${profile.profileDescription}

Behavior:
${profile.promptTemplate}
</teacher_profile>`

  return block
}
