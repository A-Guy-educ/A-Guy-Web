// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Search } from '@/ui/web/search/Component'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: pushMock,
  }),
}))

beforeEach(() => {
  pushMock.mockClear()
})

describe('Search component', () => {
  it('renders search input and submit button', () => {
    render(<Search />)
    expect(screen.getByPlaceholderText('Search')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'submit' })).toBeTruthy()
  })

  it('navigates to search page with query when form is submitted with a term', () => {
    render(<Search />)
    const input = screen.getByPlaceholderText('Search') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'test query' } })
    fireEvent.submit(screen.getByRole('button', { name: 'submit' }))
    expect(pushMock).toHaveBeenCalledWith('/search?q=test query')
  })

  it('navigates to search page without query when form is submitted empty', () => {
    render(<Search />)
    fireEvent.submit(screen.getByRole('button', { name: 'submit' }))
    expect(pushMock).toHaveBeenCalledWith('/search')
  })

  it('uses FormData to extract the search term', () => {
    render(<Search />)
    const input = screen.getByPlaceholderText('Search') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'hello' } })

    const form = screen.getByRole('button', { name: 'submit' }).closest('form')
    const formData = new FormData(form as HTMLFormElement)
    expect(formData.get('search')).toBe('hello')
  })

  it('updates input value on change', () => {
    render(<Search />)
    const input = screen.getByPlaceholderText('Search') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'new term' } })
    expect(input.value).toBe('new term')
  })

  it('does not navigate on keystroke (no debounce navigation)', () => {
    render(<Search />)
    const input = screen.getByPlaceholderText('Search') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'partial' } })
    expect(pushMock).not.toHaveBeenCalled()
  })
})
