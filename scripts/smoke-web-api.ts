import 'dotenv/config'

import { del } from '@vercel/blob'
import { MongoClient, ObjectId } from 'mongodb'

type SmokeTarget = {
  name: string
  url: string
  dbName?: string
}

type UploadedMedia = SmokeTarget & {
  id: string
  filename: string
  url?: string
}

const PDF_BYTES = Buffer.from(
  '%PDF-1.1\n' +
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n' +
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n' +
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] >>\nendobj\n' +
    'trailer\n<< /Root 1 0 R >>\n%%EOF\n',
)

const runId = `smoke-${Date.now()}`
const uploadedMedia: UploadedMedia[] = []
const contextKeys: Array<SmokeTarget & { contextKey: string }> = []

function splitEnv(value: string | undefined) {
  return (value || '')
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean)
}

function currentDbName() {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return undefined

  try {
    const parsed = new URL(databaseUrl)
    return parsed.pathname.replace(/^\//, '') || undefined
  } catch {
    return undefined
  }
}

function inferDbName(url: string) {
  const host = new URL(url).hostname
  if (host.includes('a-guy-dev')) return 'A-Guy-Dev'
  if (host === 'a-guy-web.vercel.app' || host === 'www.aguy.co.il' || host === 'aguy.co.il') {
    return 'A-Guy'
  }
  return currentDbName()
}

function smokeTargets(): SmokeTarget[] {
  const urls = splitEnv(process.env.SMOKE_BASE_URLS)
  const dbNames = splitEnv(process.env.SMOKE_DB_NAMES)

  if (urls.length > 0) {
    return urls.map((url, index) => ({
      name: new URL(url).hostname,
      url: url.replace(/\/$/, ''),
      dbName: dbNames[index] || inferDbName(url),
    }))
  }

  const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/$/, '')
  return [{ name: new URL(baseUrl).hostname, url: baseUrl, dbName: currentDbName() }]
}

function assertOk(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function jsonFetch(url: string, init?: RequestInit) {
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(30_000) })
  const text = await response.text()
  let json: unknown = null

  try {
    json = text ? JSON.parse(text) : null
  } catch {
    // Some checks only need status or HTML text.
  }

  return { response, text, json }
}

function record(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {}
}

function hasTeacherProfiles(json: unknown) {
  const body = record(json)
  return Array.isArray(body.profiles) || Array.isArray(body.docs)
}

function mongoUrlForDb(dbName: string) {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) return null

  const parsed = new URL(databaseUrl)
  parsed.pathname = `/${dbName}`
  return parsed.toString()
}

async function smokeTarget(target: SmokeTarget) {
  const results: string[] = []
  const jsonHeaders = { 'Content-Type': 'application/json' }

  let result = await jsonFetch(`${target.url}/api/agent/chat-quota`)
  assertOk(result.response.ok, `${target.name}: chat quota returned ${result.response.status}`)
  assertOk(record(result.json).allowed === true, `${target.name}: chat quota denied`)
  results.push('quota')

  const contextKey = `${runId}:${target.name}`
  contextKeys.push({ ...target, contextKey })
  result = await jsonFetch(`${target.url}/api/agent/conversation`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ contextKey }),
  })
  assertOk(result.response.ok, `${target.name}: conversation returned ${result.response.status}`)
  assertOk(record(result.json).success === true, `${target.name}: conversation did not succeed`)
  const cookie = result.response.headers.get('set-cookie')?.split(';')[0] || ''
  results.push('conversation')

  result = await jsonFetch(`${target.url}/api/agent/chat`, {
    method: 'POST',
    headers: { ...jsonHeaders, ...(cookie ? { Cookie: cookie } : {}) },
    body: JSON.stringify({
      contextKeyOverride: contextKey,
      message: 'smoke test: say ok',
      acknowledgment: 'ok',
    }),
  })
  assertOk(result.response.ok, `${target.name}: chat returned ${result.response.status}`)
  assertOk(record(result.json).success === true, `${target.name}: chat did not succeed`)
  assertOk(typeof record(result.json).message === 'string', `${target.name}: chat returned no text`)
  results.push('chat')

  result = await jsonFetch(`${target.url}/api/exercises/validate-answer`, {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({
      questionId: `${runId}-q`,
      questionText: 'What is 2+2?',
      acceptedAnswers: ['4'],
      studentAnswer: '4',
    }),
  })
  assertOk(result.response.ok, `${target.name}: answer check returned ${result.response.status}`)
  assertOk(
    record(record(result.json).data).isCorrect === true,
    `${target.name}: answer check failed`,
  )
  results.push('validate-answer')

  result = await jsonFetch(`${target.url}/api/teacher-profiles`)
  assertOk(
    result.response.ok,
    `${target.name}: teacher profiles returned ${result.response.status}`,
  )
  assertOk(hasTeacherProfiles(result.json), `${target.name}: teacher profiles shape changed`)
  results.push('teacher-profiles')

  result = await jsonFetch(`${target.url}/api/exercises/import?lessonId=000000000000000000000000`, {
    method: 'POST',
  })
  assertOk(
    result.response.status === 400 || result.response.status === 404,
    `${target.name}: import route returned ${result.response.status}`,
  )
  results.push('import-safe')

  const form = new FormData()
  form.append('file', new Blob([PDF_BYTES], { type: 'application/pdf' }), `${runId}.pdf`)
  result = await jsonFetch(`${target.url}/api/media`, {
    method: 'POST',
    headers: cookie ? { Cookie: cookie } : undefined,
    body: form,
  })
  const doc = record(record(result.json).doc)
  assertOk(result.response.ok, `${target.name}: media upload returned ${result.response.status}`)
  assertOk(typeof doc.id === 'string', `${target.name}: media upload returned no id`)
  assertOk(typeof doc.filename === 'string', `${target.name}: media upload returned no filename`)
  uploadedMedia.push({
    ...target,
    id: doc.id,
    filename: doc.filename,
    url: typeof doc.url === 'string' ? doc.url : undefined,
  })
  results.push('media-upload')

  const fileResponse = await fetch(
    `${target.url}/api/media/file/${encodeURIComponent(doc.filename)}`,
    {
      redirect: 'manual',
      signal: AbortSignal.timeout(30_000),
    },
  )
  assertOk(
    [200, 302, 307, 308].includes(fileResponse.status),
    `${target.name}: media file returned ${fileResponse.status}`,
  )
  results.push('media-file')

  const viewerResponse = await fetch(
    `${target.url}/api/pdfjs-viewer?file=${encodeURIComponent(`/api/media/file/${doc.filename}`)}`,
    { signal: AbortSignal.timeout(30_000) },
  )
  const viewerText = await viewerResponse.text()
  assertOk(viewerResponse.ok, `${target.name}: PDF viewer returned ${viewerResponse.status}`)
  assertOk(/pdf|viewer/i.test(viewerText), `${target.name}: PDF viewer returned unexpected content`)
  results.push('pdf-viewer')

  return results
}

async function cleanup() {
  const cleaned: string[] = []
  const targets = smokeTargets()

  if (process.env.DATABASE_URL) {
    for (const target of targets) {
      if (!target.dbName) continue

      const url = mongoUrlForDb(target.dbName)
      if (!url) continue

      const client = new MongoClient(url)
      await client.connect()
      const db = client.db()
      const ids = uploadedMedia
        .filter((item) => item.name === target.name && ObjectId.isValid(item.id))
        .map((item) => new ObjectId(item.id))

      const mediaQuery =
        ids.length > 0
          ? { $or: [{ _id: { $in: ids } }, { filename: { $regex: '^\\d+-?smoke-' } }] }
          : { filename: { $regex: '^\\d+-?smoke-' } }

      const mediaResult = await db.collection('media').deleteMany(mediaQuery)
      const conversationResult = await db
        .collection('conversations')
        .deleteMany({ contextKey: { $regex: '^smoke-' } })
      cleaned.push(`${target.name}:media:${mediaResult.deletedCount}`)
      cleaned.push(`${target.name}:conversations:${conversationResult.deletedCount}`)
      await client.close()
    }
  }

  if (process.env.BLOB_READ_WRITE_TOKEN) {
    const urls = uploadedMedia.map((item) => item.url).filter((url): url is string => Boolean(url))
    if (urls.length > 0) {
      await del(urls)
      cleaned.push(`blob:${urls.length}`)
    }
  }

  return cleaned
}

async function main() {
  const targets = smokeTargets()
  const summary: Array<{ target: string; ok: boolean; results?: string[]; error?: string }> = []
  let failed = false

  try {
    for (const target of targets) {
      try {
        const results = await smokeTarget(target)
        summary.push({ target: target.name, ok: true, results })
      } catch (error) {
        failed = true
        summary.push({
          target: target.name,
          ok: false,
          error: error instanceof Error ? error.message : String(error),
        })
      }
    }
  } finally {
    const cleaned = await cleanup().catch((error) => [
      `cleanup-error:${error instanceof Error ? error.message : String(error)}`,
    ])

    console.log(JSON.stringify({ runId, summary, cleaned }, null, 2))
  }

  if (failed) process.exit(1)
}

void main()
