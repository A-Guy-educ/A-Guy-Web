/**
 * Teacher Profile Block Builder
 *
 * @ai-summary Injects a teacher personality profile into the system prompt via
 * a structured XML-like block. If the block is malformed (e.g., unescaped `<` in
 * the description), it can corrupt prompt parsing downstream. The block format
 * must stay in sync with whatever regex or parser reads it.
 *
 * @fileType ai-utility
 * @domain chat
 * @pattern server-only
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
