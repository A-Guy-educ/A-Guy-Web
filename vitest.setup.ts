// Any setup scripts you might need go here

// Load .env files
import 'dotenv/config'
import { vi } from 'vitest'
import { getTestDatabaseUrl } from './tests/setup/db-config'

// ---------------------------------------------------------------------------
// DOM globals for tests that use // @vitest-environment jsdom
// vitest's jsdom environment provides window/document but not bare globals.
// ---------------------------------------------------------------------------
// jsdom creates separate window and globalThis objects in Node.js. We bridge
// them here so that bare localStorage/sessionStorage (which resolve to
// globalThis.*) hit the same storage as window.* that tests spy on.
//
// localStorage: if window.localStorage is a proper Storage object, use it.
// Otherwise fall back to a mock so product code always has access to storage.
//
// sessionStorage: delegate to window.sessionStorage so that bare
// sessionStorage in product code uses the same object that tests spy on.
// ---------------------------------------------------------------------------
// Fallback mock storage - uses Storage.prototype if available so prototype spies intercept calls
const createStorageMock = (): Storage => {
  // In jsdom, Storage is available as window.Storage
  const proto = typeof Storage !== 'undefined' && Storage.prototype ? Storage.prototype : {}
  const mock = Object.create(proto) as Storage
  const data = new Map<string, string>()
  mock.getItem = function (key: string): string | null {
    return data.get(key) ?? null
  }
  mock.setItem = function (key: string, value: string): void {
    data.set(key, String(value))
  }
  mock.removeItem = function (key: string): void {
    data.delete(key)
  }
  mock.clear = function (): void {
    data.clear()
  }
  Object.defineProperty(mock, 'length', {
    get(): number {
      return data.size
    },
    enumerable: false,
    configurable: true,
  })
  mock.key = function (index: number): string | null {
    const keys = Array.from(data.keys())
    return keys[index] ?? null
  }
  return mock
}

// Provide localStorage/sessionStorage to product code that uses bare access.
// In jsdom, window.localStorage is a proper Storage object; bridge it to globalThis.
// If window.localStorage is unavailable (e.g., jsdom without storage resource),
// use a fallback mock so product code still has a working Storage object.
if (typeof window !== 'undefined') {
  try {
    // If window.localStorage is available and works, use it
    const _test = window.localStorage
    Object.defineProperty(globalThis, 'localStorage', {
      value: window.localStorage,
      writable: true,
      configurable: true,
    })
  } catch {
    // window.localStorage is unavailable (e.g., opaque origin in jsdom) - use fallback
    Object.defineProperty(globalThis, 'localStorage', {
      value: createStorageMock(),
      writable: true,
      configurable: true,
    })
  }
  try {
    const _test2 = window.sessionStorage
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: window.sessionStorage,
      writable: true,
      configurable: true,
    })
  } catch {
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: createStorageMock(),
      writable: true,
      configurable: true,
    })
  }
} else if (typeof globalThis.localStorage === 'undefined') {
  // Node-only environment (no jsdom): fall back to a minimal mock.
  Object.defineProperty(globalThis, 'localStorage', {
    value: createStorageMock(),
    writable: true,
    configurable: true,
  })
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: createStorageMock(),
    writable: true,
    configurable: true,
  })
}

// Set required environment variables for tests if not already set
if (!process.env.PAYLOAD_SECRET) {
  process.env.PAYLOAD_SECRET = 'test-secret-key-for-integration-tests-only-minimum-32-chars'
}

if (!process.env.NEXT_PUBLIC_SERVER_URL) {
  process.env.NEXT_PUBLIC_SERVER_URL = 'http://localhost:3000'
}

if (!process.env.DEFAULT_TENANT_SLUG) {
  process.env.DEFAULT_TENANT_SLUG = 'default'
}

if (process.env.USE_ATLAS === 'true') {
  const databaseUrl = getTestDatabaseUrl()
  if (databaseUrl) {
    process.env.DATABASE_URL = databaseUrl
  }
}

// Note: Testcontainers constraint is enforced in individual test files
// that use testcontainers (via startMongoContainer() in beforeAll hooks)
// Vector search tests are allowed to use MongoDB Atlas (they require it)
// This setup file doesn't enforce constraints because test files aren't loaded yet

/**
 * Mock OpenAI for integration tests
 *
 * Benefits:
 * - Avoids rate limits and API costs
 * - Deterministic test results
 * - Faster test execution
 * - Tests work offline
 *
 * Test Quality:
 * - Uses realistic response structures from OpenAI docs
 * - Generates deterministic but unique embeddings per input (via hash)
 * - Tests our code's logic, error handling, and data transformations
 * - Can be disabled via USE_REAL_OPENAI_API=true for occasional validation
 */

// Helper: Generate deterministic embedding from text (for test consistency)
function generateMockEmbedding(text: string): number[] {
  // Simple hash function to generate consistent but different embeddings
  let hash = 0
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }

  // Use hash as seed for deterministic random values
  const seed = Math.abs(hash)
  const random = (index: number) => {
    const x = Math.sin(seed + index) * 10000
    return (x - Math.floor(x)) * 2 - 1 // Normalize to [-1, 1]
  }

  return Array.from({ length: 1536 }, (_, i) => random(i))
}

// Only mock if not explicitly using real API
const shouldMock = process.env.USE_REAL_OPENAI_API !== 'true'

if (shouldMock) {
  vi.mock('openai', () => {
    // Create a proper constructor class for Vitest 4.0
    class MockOpenAI {
      embeddings: {
        create: ReturnType<typeof vi.fn>
      }
      chat: {
        completions: {
          create: ReturnType<typeof vi.fn>
        }
      }

      constructor() {
        this.embeddings = {
          create: vi.fn().mockImplementation(async ({ input, model }) => {
            // Simulate API behavior: reject empty strings
            if (!input || (Array.isArray(input) && input.some((i) => !i || i.trim() === ''))) {
              throw new Error('Input cannot be empty')
            }

            const isArray = Array.isArray(input)
            const texts = isArray ? input : [input]

            // Generate unique embeddings based on input text
            const data = texts.map((text: string) => ({
              embedding: generateMockEmbedding(text),
              index: 0,
              object: 'embedding',
            }))

            return {
              data,
              model: model || 'text-embedding-3-small',
              usage: {
                prompt_tokens: texts.reduce(
                  (sum: number, t: string) => sum + t.split(' ').length,
                  0,
                ),
                total_tokens: texts.reduce(
                  (sum: number, t: string) => sum + t.split(' ').length,
                  0,
                ),
              },
              object: 'list',
            }
          }),
        }
        this.chat = {
          completions: {
            create: vi.fn().mockImplementation(async ({ messages, response_format }) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const systemMessage = messages.find((m: any) => m.role === 'system')?.content || ''
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const userMessage = messages.find((m: any) => m.role === 'user')?.content || ''

              // For memory extraction (JSON response)
              if (
                systemMessage.includes('Extract important information') ||
                systemMessage.includes('memory') ||
                response_format?.type === 'json_object'
              ) {
                // Parse user message to create relevant memories
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const memories: any[] = []

                if (userMessage.includes('dark mode') || userMessage.includes('prefer')) {
                  memories.push({
                    type: 'preference',
                    text: 'User prefers dark mode for coding',
                    importance: 4,
                    scope: 'user',
                    reason: 'User preference stated',
                  })
                }

                if (userMessage.includes('TypeScript') || userMessage.includes('language')) {
                  memories.push({
                    type: 'preference',
                    text: 'User prefers TypeScript as programming language',
                    importance: 4,
                    scope: 'user',
                    reason: 'User preference stated',
                  })
                }

                if (userMessage.includes('learning') || userMessage.includes('Payload')) {
                  memories.push({
                    type: 'fact',
                    text: 'User is learning Payload CMS',
                    importance: 3,
                    scope: 'user',
                    reason: 'Educational context mentioned',
                  })
                }

                return {
                  id: 'chatcmpl-mock',
                  object: 'chat.completion',
                  created: Date.now(),
                  model: 'gpt-4o-mini',
                  choices: [
                    {
                      index: 0,
                      message: {
                        role: 'assistant',
                        content: JSON.stringify({ memories }),
                      },
                      finish_reason: 'stop',
                    },
                  ],
                  usage: {
                    prompt_tokens: 100,
                    completion_tokens: 50,
                    total_tokens: 150,
                  },
                }
              }

              // For summary generation (text response)
              const topics: string[] = []
              if (userMessage.includes('Payload')) topics.push('Payload CMS')
              if (userMessage.includes('collections')) topics.push('collections')
              if (userMessage.includes('hooks')) topics.push('hooks')
              if (userMessage.includes('TypeScript')) topics.push('TypeScript')

              const summary =
                topics.length > 0
                  ? `User discussed ${topics.join(', ')}. Key topics covered in recent conversation.`
                  : 'User engaged in general discussion about web development topics.'

              return {
                id: 'chatcmpl-mock',
                object: 'chat.completion',
                created: Date.now(),
                model: 'gpt-4o-mini',
                choices: [
                  {
                    index: 0,
                    message: {
                      role: 'assistant',
                      content: summary,
                    },
                    finish_reason: 'stop',
                  },
                ],
                usage: {
                  prompt_tokens: 150,
                  completion_tokens: 50,
                  total_tokens: 200,
                },
              }
            }),
          },
        }
      }
    }

    return {
      OpenAI: MockOpenAI,
    }
  })
}
