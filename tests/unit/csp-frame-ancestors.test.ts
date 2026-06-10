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

  function getDirective(csp: string, directive: string): string[] {
    const match = csp.match(new RegExp(`${directive}\\s+([^;]+)`))

    expect(match).not.toBeNull()
    return match![1].split(/\s+/)
  }

  it('only allows the site and Kody dashboard hosts to embed pages', () => {
    const frameAncestors = getDirective(getGeneralCsp(), 'frame-ancestors')

    expect(frameAncestors).toEqual([
      "'self'",
      'https://kody-dashboard-aguy.vercel.app',
      'https://kody-dashboard-sable.vercel.app',
    ])
  })

  it('does not allow every site to embed pages', () => {
    const frameAncestors = getDirective(getGeneralCsp(), 'frame-ancestors')

    expect(frameAncestors).not.toContain('*')
  })
})
