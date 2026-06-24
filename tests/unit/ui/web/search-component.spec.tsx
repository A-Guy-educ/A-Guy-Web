// @vitest-environment jsdom
import { cleanup, render, screen, fireEvent } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Search } from '@/ui/web/search/Component'

const mockRouterPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}))

afterEach(() => {
  cleanup()
  mockRouterPush.mockClear()
})

describe('Search component', () => {
  it('renders search input with correct placeholder', () => {
    render(<Search />)
    expect(screen.getByPlaceholderText('Search')).toBeTruthy()
  })

  it('renders search input with id="search"', () => {
    render(<Search />)
    expect(screen.getByRole('textbox', { name: 'Search' })).toBeTruthy()
  })

  it('renders submit button', () => {
    render(<Search />)
    expect(screen.getByRole('button', { name: 'submit' })).toBeTruthy()
  })

  it('updates input value on change', () => {
    render(<Search />)
    const input = screen.getByRole('textbox', { name: 'Search' })
    fireEvent.change(input, { target: { value: 'test query' } })
    expect((input as HTMLInputElement).value).toEqual('test query')
  })

  it('navigates to search page with query on form submit', () => {
    render(<Search />)
    const input = screen.getByRole('textbox', { name: 'Search' })
    fireEvent.change(input, { target: { value: 'test query' } })
    const form = input.closest('form')
    fireEvent.submit(form!)
    expect(mockRouterPush).toHaveBeenCalledWith('/search?q=test query')
  })

  it('navigates to search page without query when input is empty', () => {
    render(<Search />)
    const input = screen.getByRole('textbox', { name: 'Search' })
    const form = input.closest('form')
    fireEvent.submit(form!)
    expect(mockRouterPush).toHaveBeenCalledWith('/search')
  })

  it('handles special characters in search query', () => {
    render(<Search />)
    const input = screen.getByRole('textbox', { name: 'Search' })
    fireEvent.change(input, { target: { value: 'hello world!' } })
    const form = input.closest('form')
    fireEvent.submit(form!)
    expect(mockRouterPush).toHaveBeenCalledWith('/search?q=hello world!')
  })

  it('preserves whitespace in search query', () => {
    render(<Search />)
    const input = screen.getByRole('textbox', { name: 'Search' })
    fireEvent.change(input, { target: { value: '  test query  ' } })
    const form = input.closest('form')
    fireEvent.submit(form!)
    expect(mockRouterPush).toHaveBeenCalledWith('/search?q=  test query  ')
  })

  it('reads search value from FormData using name attribute', () => {
    render(<Search />)
    const input = screen.getByRole('textbox', { name: 'Search' })
    // Verify the input has name="search" for FormData extraction
    expect((input as HTMLInputElement).name).toEqual('search')
  })
})
