import { describe, expect, it } from 'vitest'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

describe('CSP frame ancestors', () => {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const projectRoot = path.resolve(__dirname, '../..')
  const nextConfigPath = path.join(projectRoot, 'next.config.js')

  function getGeneralCsp(): string {
    const configContent = fs.readFileSync(nextConfigPath, 'utf8')
    const match = configContent.match(
      /source:\s*'\/\(\(\?!api\/pdfjs-viewer\)\.\*\)'[\s\S]*?Content-Security-Policy[\s\S]*?value:\s*"([^"]+)"/,
    )

    expect(match).not.toBeNull()
    return match![1]
  }

  it('does not restrict which preview hosts can embed pages', () => {
    const csp = getGeneralCsp()

    expect(csp).not.toContain('frame-ancestors')
    expect(csp).not.toContain('kody-dashboard-aguy.vercel.app')
    expect(csp).not.toContain('kody-dashboard-sable.vercel.app')
  })
})
