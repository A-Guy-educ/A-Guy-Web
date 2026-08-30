import { NextRequest } from 'next/server'
import { z } from 'zod'

import { rateLimit, rateLimitExceededResponse } from '@/infra/security/rate-limit'
import { enforceUserChatQuota, requireUser } from '@/server/auth/api-auth'

const VALIDATE_ANSWER_RATE_LIMIT_MAX = 30
const VALIDATE_ANSWER_RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute

const BodySchema = z.object({
  questionId: z.string().min(1),
  questionText: z.string().min(1),
  acceptedAnswers: z.array(z.string().min(1)).min(1),
  studentAnswer: z.string(),
  questionType: z.string().optional(),
  questionVariant: z.string().optional(),
})

function normalize(input: string) {
  return input.toLowerCase().trim().replace(/\s+/g, ' ')
}

/**
 * Convert LaTeX-flavored math the FormulaComposer inserts (`$\frac{1}{2}$`,
 * `$x^{2}$`, `$\sqrt{9}$`) into a plain-text form comparable to a manually-
 * typed accepted answer like `1/2`, `x^2`, `sqrt(9)`.
 *
 * The transform is intentionally conservative — no CAS-level equivalence,
 * no operator reordering. It just strips display chrome so a student who
 * used the math keyboard doesn't get marked wrong for producing the same
 * expression the teacher wrote by hand. Semantic equivalence still falls
 * through to the LLM in `semanticMatch()`.
 *
 * Applied iteratively so nested `\frac{\frac{a}{b}}{c}` collapses fully.
 */
function latexToPlain(input: string) {
  let out = input
    .replace(/\$\$([\s\S]*?)\$\$/g, '$1')
    .replace(/\$([^$]*)\$/g, '$1')
    .replace(/\\left|\\right/g, '')
    .replace(/\\,|\\;|\\!|\\ /g, ' ')
  // Repeatedly expand \frac / \sqrt / ^{}/ _{} until stable so nested forms
  // collapse. Cap iterations to prevent pathological input from looping.
  for (let i = 0; i < 6; i++) {
    const next = out
      .replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)')
      .replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)')
      .replace(/\^\{([^{}]*)\}/g, '^$1')
      .replace(/_\{([^{}]*)\}/g, '_$1')
    if (next === out) break
    out = next
  }
  return out
    .replace(/\\cdot|\\times/g, '*')
    .replace(/\\div/g, '/')
    .replace(/\\pm/g, '±')
    .replace(/\\leq\b/g, '≤')
    .replace(/\\geq\b/g, '≥')
    .replace(/\\neq\b/g, '≠')
    .replace(/\\pi\b/g, 'π')
    .replace(/\\theta\b/g, 'θ')
    .replace(/\\alpha\b/g, 'α')
    .replace(/\\beta\b/g, 'β')
    .replace(/\s+/g, '')
}

function numeric(input: string) {
  // Strip `$` delimiters too so a student's `$5$` compares against `5`.
  const stripped = input.replace(/[$,%\s]/g, '').trim()
  if (!stripped) return null
  const value = Number(stripped)
  return Number.isFinite(value) ? value : null
}

function localMatch(studentAnswer: string, acceptedAnswers: string[]) {
  const studentNorm = normalize(studentAnswer)
  const studentPlain = normalize(latexToPlain(studentAnswer))
  const studentNum = numeric(latexToPlain(studentAnswer))

  for (const accepted of acceptedAnswers) {
    if (studentNorm === normalize(accepted)) return { matched: true, matchType: 'exact' }

    const acceptedPlain = normalize(latexToPlain(accepted))
    if (studentPlain && acceptedPlain && studentPlain === acceptedPlain) {
      return { matched: true, matchType: 'latex-plain' }
    }

    const acceptedNum = numeric(latexToPlain(accepted))
    if (
      studentNum !== null &&
      acceptedNum !== null &&
      Math.abs(studentNum - acceptedNum) < 0.0001
    ) {
      return { matched: true, matchType: 'numeric' }
    }
  }

  return { matched: false }
}

async function semanticMatch(input: z.infer<typeof BodySchema>) {
  if (!process.env.GEMINI_API_KEY) return null

  const prompt = [
    'Return strict JSON: {"isCorrect": boolean, "reasoning": string}.',
    'Decide whether the student answer is semantically equivalent to one accepted answer.',
    `Question: ${input.questionText}`,
    `Accepted answers: ${JSON.stringify(input.acceptedAnswers)}`,
    `Student answer: ${input.studentAnswer}`,
  ].join('\n')

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 512,
          responseMimeType: 'application/json',
        },
      }),
    },
  )

  if (!response.ok) return null
  const json = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
  }
  const text =
    json.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .filter(Boolean)
      .join('') ?? ''
  if (!text) return null
  const parsed = JSON.parse(text) as { isCorrect?: unknown; reasoning?: unknown }
  return { isCorrect: Boolean(parsed.isCorrect), reasoning: String(parsed.reasoning ?? '') }
}

export async function POST(request: NextRequest) {
  const auth = await requireUser(request)
  if (!auth.ok) return auth.response

  const rate = await rateLimit({
    key: `user:${auth.value.id}:exercises-validate-answer`,
    limit: VALIDATE_ANSWER_RATE_LIMIT_MAX,
    windowMs: VALIDATE_ANSWER_RATE_LIMIT_WINDOW_MS,
  })
  if (!rate.allowed) return rateLimitExceededResponse(rate)

  const parsed = BodySchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success) {
    return Response.json({ success: false, error: 'Validation failed' }, { status: 400 })
  }

  const quota = await enforceUserChatQuota(auth.value.id)
  if (!quota.ok) return quota.response

  const exact = localMatch(parsed.data.studentAnswer, parsed.data.acceptedAnswers)
  if (exact.matched) {
    return Response.json({
      success: true,
      data: { isCorrect: true, matchType: exact.matchType },
    })
  }

  const semantic = await semanticMatch(parsed.data).catch(() => null)
  return Response.json({
    success: true,
    data: {
      isCorrect: semantic?.isCorrect ?? false,
      matchType: semantic ? 'semantic' : 'none',
      reasoning: semantic?.reasoning,
    },
  })
}
