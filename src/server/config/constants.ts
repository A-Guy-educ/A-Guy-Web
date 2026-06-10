export function readIntEnv(
  name: string,
  fallback: number,
  options: { min?: number; max?: number } = {},
): number {
  const raw = process.env[name]
  if (!raw) return fallback

  const value = Number(raw)
  if (!Number.isInteger(value)) {
    throw new Error(`Invalid ${name}: expected an integer`)
  }

  if (options.min !== undefined && value < options.min) {
    throw new Error(`Invalid ${name}: below minimum ${options.min}`)
  }

  if (options.max !== undefined && value > options.max) {
    throw new Error(`Invalid ${name}: exceeds maximum ${options.max}`)
  }

  return value
}

export const HEARTBEAT_INTERVAL_MS = readIntEnv('JOB_HEARTBEAT_INTERVAL_MS', 10_000)
export const LOCK_RECLAIM_THRESHOLD_MS = readIntEnv('JOB_LOCK_RECLAIM_THRESHOLD_MS', 60_000)
export const LOCK_TIMEOUT_MS = readIntEnv('JOB_LOCK_TIMEOUT_MS', 300_000)
export const PDF_MAX_BYTES = readIntEnv('PDF_MAX_BYTES', 25 * 1024 * 1024)
export const TASK_SLUGS = {
  PDF_TO_EXERCISES: 'pdf-to-exercises',
  PDF_TO_EXERCISES_V2: 'pdf-to-exercises-v2',
  LESSON_DUPLICATION: 'lesson-duplication',
} as const

export const TASK_SLUG = TASK_SLUGS.PDF_TO_EXERCISES

export const ENV = {
  PAYLOAD_SERVER_URL: 'NEXT_PUBLIC_SERVER_URL',
  CRON_SECRET: 'CRON_SECRET',
  TEST_ADMIN_SECRET: 'TEST_ADMIN_SECRET',
  NODE_ENV: 'NODE_ENV',
} as const
