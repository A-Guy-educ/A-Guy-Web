#!/usr/bin/env tsx
/**
 * README Link Validator
 *
 * Validates all internal links in README files to ensure they point to
 * existing files. Helps prevent broken cross-references when files move.
 *
 * Run: pnpm tsx scripts/validate-readme-links.ts
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const ROOT_DIR = path.join(__dirname, '..')

interface BrokenLink {
  file: string
  linkText: string
  linkUrl: string
  lineNumber: number
}

/**
 * Check if a URL is external
 */
function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//')
}

/**
 * Check if a URL is an anchor link (same page)
 */
function isAnchorLink(url: string): boolean {
  return url.startsWith('#')
}

/**
 * Extract line number from file content
 */
function findLineNumber(content: string, searchText: string): number {
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].includes(searchText)) {
      return i + 1
    }
  }
  return 0
}

/**
 * Validate all links in a README file
 */
function validateReadmeLinks(filepath: string): BrokenLink[] {
  const brokenLinks: BrokenLink[] = []
  const content = fs.readFileSync(filepath, 'utf-8')

  // Extract all markdown links: [text](url)
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  let match

  while ((match = linkRegex.exec(content)) !== null) {
    const [fullMatch, linkText, linkUrl] = match

    // Skip external URLs and anchor links
    if (isExternalUrl(linkUrl) || isAnchorLink(linkUrl)) {
      continue
    }

    // Remove anchor from URL (everything after #)
    const urlWithoutAnchor = linkUrl.split('#')[0]

    // Skip empty URLs (pure anchor links like #section)
    if (!urlWithoutAnchor) {
      continue
    }

    // Resolve the target path relative to the README file
    const readmeDir = path.dirname(filepath)
    const targetPath = path.resolve(readmeDir, urlWithoutAnchor)

    // Check if target file exists
    if (!fs.existsSync(targetPath)) {
      const lineNumber = findLineNumber(content, fullMatch)
      brokenLinks.push({
        file: filepath,
        linkText,
        linkUrl,
        lineNumber,
      })
    }
  }

  return brokenLinks
}

/**
 * Recursively find all README files
 */
function findReadmeFiles(dir: string, relativePath = ''): string[] {
  const results: string[] = []
  const ignorePatterns = ['node_modules', '.next', 'dist', 'build', '.git']

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name)
      const relPath = relativePath ? path.join(relativePath, entry.name) : entry.name

      if (entry.isDirectory()) {
        if (ignorePatterns.includes(entry.name)) {
          continue
        }
        results.push(...findReadmeFiles(fullPath, relPath))
      } else if (entry.isFile()) {
        if (entry.name === 'README.md' || entry.name === 'readme.md') {
          results.push(relPath)
        }
      }
    }
  } catch (error) {
    // Skip directories we can't read
  }

  return results
}

/**
 * Validate all README files
 */
function validateAllReadmes(): void {
  console.log('🔍 Scanning README files for broken links...')

  const readmes = findReadmeFiles(ROOT_DIR)

  console.log(`📚 Checking ${readmes.length} README files`)

  const allBrokenLinks: BrokenLink[] = []

  for (const readme of readmes) {
    const fullPath = path.join(ROOT_DIR, readme)
    const brokenLinks = validateReadmeLinks(fullPath)

    if (brokenLinks.length > 0) {
      allBrokenLinks.push(...brokenLinks)
    }
  }

  if (allBrokenLinks.length === 0) {
    console.log('✅ All README links are valid!')
    return
  }

  // Report broken links
  console.error(`\n❌ Found ${allBrokenLinks.length} broken link(s):\n`)

  // Group by file
  const linksByFile: Record<string, BrokenLink[]> = {}
  for (const link of allBrokenLinks) {
    if (!linksByFile[link.file]) {
      linksByFile[link.file] = []
    }
    linksByFile[link.file].push(link)
  }

  // Print grouped results
  for (const [file, links] of Object.entries(linksByFile)) {
    console.error(`📄 ${file}:`)
    for (const link of links) {
      console.error(`   Line ${link.lineNumber}: [${link.linkText}](${link.linkUrl})`)
    }
    console.error('')
  }

  console.error(`\n💡 Fix these broken links and run the validator again.`)
  process.exit(1)
}

// Run
try {
  validateAllReadmes()
} catch (error) {
  console.error('❌ Failed to validate README links:', error)
  process.exit(1)
}
