/**
 * AI Chat Service for Exercise Help
 * Provides conversational assistance using Gemini API
 */
import { getGeminiClient } from '../gemini-ai-provider.server'
import { AI_MODELS } from '../models'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export interface ExerciseChatInput {
  message: string
  conversationHistory?: ChatMessage[]
}

export interface ExerciseChatResult {
  success: boolean
  message?: string
  error?: string
}

const SYSTEM_PROMPT = `You are a helpful math and science tutor for students working on exercises.
Your role is to:
- Guide students through problem-solving without giving direct answers
- Ask clarifying questions to help them think critically
- Provide hints and explanations when they're stuck
- Encourage step-by-step thinking
- Be supportive and patient

Keep responses concise and conversational. Focus on helping the student learn, not just get the answer.`

export async function chatWithExerciseHelper(
  input: ExerciseChatInput,
): Promise<ExerciseChatResult> {
  try {
    const client = getGeminiClient()
    const modelConfig = AI_MODELS.EXERCISE_CHAT
    const model = client.getGenerativeModel({
      model: modelConfig.name,
      generationConfig: {
        temperature: modelConfig.temperature,
        maxOutputTokens: modelConfig.maxOutputTokens,
      },
    })

    // Build conversation history
    const history = (input.conversationHistory || []).map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'model',
      parts: [{ text: msg.content }],
    }))

    // Start chat with history
    const chat = model.startChat({
      history: [
        {
          role: 'user',
          parts: [{ text: SYSTEM_PROMPT }],
        },
        {
          role: 'model',
          parts: [{ text: 'I understand. I will help guide students through their exercises.' }],
        },
        ...history,
      ],
    })

    const result = await chat.sendMessage(input.message)
    const responseText = result.response.text()

    return {
      success: true,
      message: responseText,
    }
  } catch (error) {
    console.error('Exercise chat error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to process chat message',
    }
  }
}
