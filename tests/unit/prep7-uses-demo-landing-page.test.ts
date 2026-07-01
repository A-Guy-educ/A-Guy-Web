import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const here = path.dirname(fileURLToPath(import.meta.url))
const projectRoot = path.resolve(here, '../..')
const prep7Path = path.join(projectRoot, 'src/app/(frontend)/prep7/page.tsx')
const source = fs.readFileSync(prep7Path, 'utf8')

describe('prep7 landing page', () => {
  it('imports the shared DemoLandingPage component from the homepage package', () => {
    expect(source).toMatch(
      /import\s+\{[^}]*DemoLandingPage[^}]*\}\s+from\s+['"]@\/ui\/web\/homepage\/DemoLandingPage['"]/,
    )
  })

  it('renders <DemoLandingPage /> instead of inlining bespoke sections', () => {
    expect(source).toMatch(/<DemoLandingPage\s*\/>/)
  })

  it('does not carry bespoke Hero / WhoIsAguy / CourseFeatures / Benefits / Bonuses / Footer components', () => {
    expect(source).not.toMatch(/function\s+Hero\s*\(/)
    expect(source).not.toMatch(/function\s+WhoIsAguy\s*\(/)
    expect(source).not.toMatch(/function\s+CourseFeatures\s*\(/)
    expect(source).not.toMatch(/function\s+Benefits\s*\(/)
    expect(source).not.toMatch(/function\s+Bonuses\s*\(/)
    expect(source).not.toMatch(/function\s+Footer\s*\(/)
  })
})
