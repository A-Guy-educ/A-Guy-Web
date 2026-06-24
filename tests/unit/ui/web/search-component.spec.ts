/**
 * Unit tests for Search component (#401)
 *
 * Tests that the Search component:
 * - Uses handleSubmit with FormData instead of debounced useEffect
 * - Submits to /search?q=<query> on form submit
 * - Input has proper name and value attributes for FormData extraction
 *
 * @fileType unit-test
 * @domain web
 * @ai-summary Unit test verifying search form submission behavior
 */
import { describe, expect, it } from 'vitest'
import { readFileSync } from 'fs'
import path from 'path'

describe('Search component submission (#401)', () => {
  const componentPath = path.resolve(process.cwd(), 'src/ui/web/search/Component.tsx')

  it('should have a Search component file', () => {
    expect(() => readFileSync(componentPath, 'utf-8')).not.toThrow()
  })

  it('should NOT use useDebounce hook (replaced with handleSubmit)', () => {
    const content = readFileSync(componentPath, 'utf-8')

    // The old implementation used useDebounce - it should no longer be present
    const usesUseDebounce = content.includes('useDebounce')

    expect(usesUseDebounce).toBe(false)
  })

  it('should NOT use useEffect for navigation (replaced with handleSubmit)', () => {
    const content = readFileSync(componentPath, 'utf-8')

    // The old implementation used useEffect to navigate on keystroke
    // Check that useEffect is not imported
    const hasUseEffectImport = content.includes('useEffect')

    expect(hasUseEffectImport).toBe(false)
  })

  it('should have handleSubmit function using FormData', () => {
    const content = readFileSync(componentPath, 'utf-8')

    // The new implementation should use FormData to extract the query
    const hasFormData = content.includes('FormData')
    const hasHandleSubmit = content.includes('handleSubmit')
    const hasFormDataGet = content.includes("formData.get('search')")

    expect(hasFormData).toBe(true)
    expect(hasHandleSubmit).toBe(true)
    expect(hasFormDataGet).toBe(true)
  })

  it('should navigate to /search with query parameter', () => {
    const content = readFileSync(componentPath, 'utf-8')

    // The component should navigate to /search?q=<query>
    const navigatesToSearch = content.includes('router.push(`/search') && content.includes('?q=')

    expect(navigatesToSearch).toBe(true)
  })

  it('should have Input with name="search" attribute', () => {
    const content = readFileSync(componentPath, 'utf-8')

    // The Input should have name="search" for FormData extraction
    const hasInputWithName = content.includes('name="search"')

    expect(hasInputWithName).toBe(true)
  })

  it('should have Input with value={value} attribute', () => {
    const content = readFileSync(componentPath, 'utf-8')

    // The Input should have value={value} to work with FormData
    const hasInputWithValue = content.includes('value={value}')

    expect(hasInputWithValue).toBe(true)
  })

  it('should have form with onSubmit handler', () => {
    const content = readFileSync(componentPath, 'utf-8')

    // The form should have onSubmit={handleSubmit}
    const hasFormOnSubmit = content.includes('onSubmit={handleSubmit}')

    expect(hasFormOnSubmit).toBe(true)
  })
})
