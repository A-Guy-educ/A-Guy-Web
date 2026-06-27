import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'
import { createHmac } from 'node:crypto'
import { createServer as createHttpServer, type Server as HttpServer } from 'node:http'
import { createServer as createNetServer } from 'node:net'
import { resolve } from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'

const doormanPath = resolve(process.cwd(), 'doorman/doorman.ts')
const verifyKeyHex = 'a'.repeat(64)

const children: ChildProcessWithoutNullStreams[] = []
const servers: HttpServer[] = []

afterEach(async () => {
  await Promise.all([...children.splice(0).map(stopChild), ...servers.splice(0).map(closeServer)])
})

function getFreePort(): Promise<number> {
  return new Promise((resolvePort, reject) => {
    const server = createNetServer()
    server.once('error', reject)
    server.listen(0, '127.0.0.1', () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('failed to allocate port')))
        return
      }
      const port = address.port
      server.close(() => resolvePort(port))
    })
  })
}

function mintTicket(identity: { r: string; p: number }): string {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const subject = `${identity.r}#${identity.p}:${exp}`
  const s = createHmac('sha256', Buffer.from(verifyKeyHex, 'hex'))
    .update(subject)
    .digest('hex')
    .slice(0, 32)

  return Buffer.from(JSON.stringify({ ...identity, e: exp, s })).toString('base64url')
}

async function startDoorman(
  env: Record<string, string>,
): Promise<{ child: ChildProcessWithoutNullStreams; port: number }> {
  const [port, nextPort] = await Promise.all([getFreePort(), getFreePort()])
  const backend = createHttpServer((req, res) => {
    res.setHeader('Content-Type', 'text/plain')
    res.end(`proxied ${req.url}`)
  })
  await new Promise<void>((resolveListen, rejectListen) => {
    backend.once('error', rejectListen)
    backend.listen(nextPort, '127.0.0.1', () => {
      backend.off('error', rejectListen)
      resolveListen()
    })
  })
  servers.push(backend)

  const child = spawn(process.execPath, ['--experimental-strip-types', doormanPath], {
    cwd: process.cwd(),
    env: {
      ...process.env,
      PORT: String(port),
      NEXT_INTERNAL_PORT: String(nextPort),
      KODY_PREVIEW_VERIFY_KEY: verifyKeyHex,
      ...env,
    },
    stdio: ['pipe', 'pipe', 'pipe'],
  })
  child.stdin.end()
  children.push(child)

  await new Promise<void>((resolveReady, rejectReady) => {
    let stderr = ''
    const timeout = setTimeout(() => {
      rejectReady(new Error(`doorman did not start: ${stderr}`))
    }, 5000)

    child.stdout.on('data', (chunk: Buffer) => {
      if (chunk.toString('utf8').includes('listening')) {
        clearTimeout(timeout)
        resolveReady()
      }
    })
    child.stderr.on('data', (chunk: Buffer) => {
      stderr += chunk.toString('utf8')
    })
    child.once('exit', (code) => {
      clearTimeout(timeout)
      rejectReady(new Error(`doorman exited early with code ${code}: ${stderr}`))
    })
  })

  return { child, port }
}

function stopChild(child: ChildProcessWithoutNullStreams): Promise<void> {
  return new Promise((resolveStop) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolveStop()
      return
    }

    const timeout = setTimeout(() => {
      child.kill('SIGKILL')
      resolveStop()
    }, 1000)
    child.once('exit', () => {
      clearTimeout(timeout)
      resolveStop()
    })
    child.kill('SIGTERM')
  })
}

function closeServer(server: HttpServer): Promise<void> {
  return new Promise((resolveClose, rejectClose) => {
    server.close((error) => {
      if (error) {
        rejectClose(error)
        return
      }
      resolveClose()
    })
  })
}

describe('preview doorman', () => {
  it('accepts PR tickets and proxies the first response without kp', async () => {
    const { port } = await startDoorman({
      KODY_REPO_CONTEXT: 'owner/repo',
      KODY_PR: '42',
    })
    const ticket = mintTicket({ r: 'owner/repo', p: 42 })

    const res = await fetch(`http://127.0.0.1:${port}/lesson?tab=one&kp=${ticket}`, {
      redirect: 'manual',
    })

    expect(res.status).toBe(200)
    expect(res.headers.get('set-cookie')).toContain('kody_preview_session=1')
    expect(res.headers.get('set-cookie')).toContain('Partitioned')
    expect(res.headers.get('referrer-policy')).toBe('no-referrer')
    expect(res.headers.get('cache-control')).toBe('no-store')
    await expect(res.text()).resolves.toBe('proxied /lesson?tab=one')
  })

  it('rejects PR tickets minted for another PR', async () => {
    const { port } = await startDoorman({
      KODY_REPO_CONTEXT: 'owner/repo',
      KODY_PR: '42',
    })
    const ticket = mintTicket({ r: 'owner/repo', p: 43 })

    const res = await fetch(`http://127.0.0.1:${port}/?kp=${ticket}`, {
      redirect: 'manual',
    })

    expect(res.status).toBe(401)
  })
})
