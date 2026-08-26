const RECENT_MESSAGE_LIMIT = 20
const SUMMARY_LIMIT = 12_000
const LESSON_CONTEXT_LIMIT = 20_000
const ATTACHMENT_CONTEXT_LIMIT = 4_000

export type TutorContextMessage = {
  id?: string
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  hidden?: boolean
}

export type TutorContextInput = {
  message: string
  history: TutorContextMessage[]
  summary?: string
  lessonText?: string
  attachmentText?: string
  systemInstructions?: string
}

export type BuiltTutorContext = {
  system: string
  prompt: string
  recentMessageCount: number
}

const DEFAULT_TUTOR_SYSTEM = `You are A-Guy, a focused math and science tutor.
Help the student understand and solve the problem with clear, concise steps.
Respond in the same language as the student when possible.
Guide before giving a complete solution unless the student explicitly asks for it.
Use \\(...\\) for inline math and \\[...\\] for display math.`

function bounded(value: string | undefined, max: number): string {
  const clean = value?.trim() || ''
  if (clean.length <= max) return clean
  return clean.slice(0, max) + '\n[context truncated]'
}

export function buildTutorContext(input: TutorContextInput): BuiltTutorContext {
  const recent = input.history.slice(-RECENT_MESSAGE_LIMIT)
  const historyText = recent
    .map((message) => `${message.role === 'user' ? 'Student' : 'Tutor'}: ${message.content}`)
    .join('\n')

  const summary = bounded(input.summary, SUMMARY_LIMIT)
  const lessonText = bounded(input.lessonText, LESSON_CONTEXT_LIMIT)
  const attachmentText = bounded(input.attachmentText, ATTACHMENT_CONTEXT_LIMIT)
  const prompt = [
    summary ? `## Conversation summary\n${summary}` : '',
    lessonText ? `## Lesson context\n${lessonText}` : '',
    attachmentText ? `## Attachments\n${attachmentText}` : '',
    historyText ? `## Recent conversation\n${historyText}` : '',
    `Student: ${input.message}`,
    'Tutor:',
  ]
    .filter(Boolean)
    .join('\n\n')

  return {
    system: bounded(input.systemInstructions, 12_000) || DEFAULT_TUTOR_SYSTEM,
    prompt,
    recentMessageCount: recent.length,
  }
}

export const TUTOR_CONTEXT_POLICY = {
  recentMessageLimit: RECENT_MESSAGE_LIMIT,
  summaryLimit: SUMMARY_LIMIT,
  lessonContextLimit: LESSON_CONTEXT_LIMIT,
  attachmentContextLimit: ATTACHMENT_CONTEXT_LIMIT,
} as const
