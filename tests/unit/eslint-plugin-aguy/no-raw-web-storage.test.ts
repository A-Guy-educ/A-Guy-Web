/**
 * @fileType test
 * @domain eslint | shared-device
 * @ai-summary Tests for the no-raw-web-storage ESLint rule: browser storage only through src/client/state/, Windows paths included.
 */

import { describe } from 'vitest'
import { RuleTester } from 'eslint'

const rule = require('../../../eslint-plugin-aguy/rules/no-raw-web-storage.mjs')

const ruleTester = new RuleTester({
  languageOptions: {
    ecmaVersion: 2022,
    sourceType: 'module',
  },
})

const COMPONENT = '/repo/src/ui/web/my-feature/Widget.tsx'
const rawStorage = (name: string) => ({ messageId: 'rawStorage', data: { name } })

describe('no-raw-web-storage ESLint rule', () => {
  ruleTester.run('no-raw-web-storage', rule.default ?? rule, {
    valid: [
      {
        name: 'the storage layer owns browser storage',
        code: `localStorage.setItem('a-guy:x', '1')`,
        filename: '/repo/src/client/state/localStorage/myFeature.ts',
      },
      {
        name: 'storage layer on a Windows path',
        code: `window.localStorage.getItem('a-guy:x')`,
        filename: 'C:\\repo\\src\\client\\state\\learningState\\learningStateSync.ts',
      },
      {
        name: 'grandfathered file',
        code: `localStorage.getItem('payload-theme')`,
        filename: '/repo/src/ui/web/providers/Theme/ThemeSelector/index.tsx',
      },
      {
        name: 'a property that merely shares the name',
        code: `config.localStorage.enabled = true`,
        filename: COMPONENT,
      },
      {
        name: 'feature detection without access',
        code: `const ok = typeof localStorage !== 'undefined'`,
        filename: COMPONENT,
      },
    ],
    invalid: [
      {
        name: 'direct localStorage call in a component',
        code: `localStorage.setItem('answers', '1')`,
        filename: COMPONENT,
        errors: [rawStorage('localStorage')],
      },
      {
        name: 'window.localStorage chain is reported once',
        code: `window.localStorage.getItem('answers')`,
        filename: COMPONENT,
        errors: [rawStorage('localStorage')],
      },
      {
        name: 'sessionStorage too',
        code: `globalThis.sessionStorage.removeItem('x')`,
        filename: COMPONENT,
        errors: [rawStorage('sessionStorage')],
      },
      {
        name: 'aliasing the storage object',
        code: `const store = window.localStorage`,
        filename: COMPONENT,
        errors: [rawStorage('localStorage')],
      },
      {
        name: 'Windows paths outside the storage layer are still checked',
        code: `localStorage.setItem('answers', '1')`,
        filename: 'C:\\repo\\src\\app\\(frontend)\\page.tsx',
        errors: [rawStorage('localStorage')],
      },
    ],
  })
})
