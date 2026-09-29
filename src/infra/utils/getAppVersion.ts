import { readFile } from 'fs/promises'
import { join } from 'path'
import { cache } from 'react'

// React `cache` dedupes the package.json read across the whole request tree, so
// Header + Footer (and anything else that wants the version) share one fs hit
// instead of one each.
export const getAppVersion = cache(async (): Promise<string> => {
  try {
    const packageJson = await readFile(join(process.cwd(), 'package.json'), 'utf-8')
    const { version } = JSON.parse(packageJson)
    return version || 'dev'
  } catch {
    return 'dev'
  }
})
