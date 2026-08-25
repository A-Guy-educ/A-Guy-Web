import { MongoTutorConversationRepository } from './conversation-repository'
import { GeminiTutorModelGateway, type TutorModelGateway } from './model-gateway'
import { TutorChatOrchestrator } from './orchestrator'

class UnconfiguredTutorModelGateway implements TutorModelGateway {
  async generate() {
    return { text: '', inputTokens: 0, outputTokens: 0, model: 'fallback' }
  }

  async *stream() {
    return { inputTokens: 0, outputTokens: 0, model: 'fallback' }
  }
}

function createGateway(): TutorModelGateway {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return new UnconfiguredTutorModelGateway()

  return new GeminiTutorModelGateway({
    apiKey,
    model: process.env.LLM_MODEL_OVERRIDE_EXERCISE_CHAT || 'gemini-2.5-flash',
  })
}

export function createTutorChatOrchestrator() {
  return new TutorChatOrchestrator({
    repository: new MongoTutorConversationRepository(),
    gateway: createGateway(),
  })
}
