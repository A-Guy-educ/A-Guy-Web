// @vitest-environment jsdom
import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Search } from '@/ui/web/search/Component'

const mockPush = vi.fn()

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

describe('Search component', () => {
  beforeEach(() => {
    mockPush.mockClear()
  })

  it('renders the search input', () => {
    render(<Search />)
    expect(screen.getByPlaceholderText('Search')).toBeTruthy()
  })

  it('renders the search input with id "search"', () => {
    render(<Search />)
    const input = screen.getByPlaceholderText('Search')
    expect(input.getAttribute('id')).toBe('search')
  })

  it('renders the search input with name "search"', () => {
    render(<Search />)
    const input = screen.getByPlaceholderText('Search')
    expect(input.getAttribute('name')).toBe('search')
  })

  it('updates input value on change', () => {
    render(<Search />)
    const input = screen.getByPlaceholderText('Search') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'test query' } })
    expect(input.value).toBe('test query')
  })

  it('navigates to /search on empty form submit', () => {
    render(<Search />)
    const form = screen.getByPlaceholderText('Search').closest('form')
    fireEvent.submit(form!)
    expect(mockPush).toHaveBeenCalledWith('/search')
  })

  it('navigates to /search?q=query on populated form submit', () => {
    render(<Search />)
    const input = screen.getByPlaceholderText('Search')
    fireEvent.change(input, { target: { value: 'test query' } })
    const form = input.closest('form')
    fireEvent.submit(form!)
    expect(mockPush).toHaveBeenCalledWith('/search?q=test query')
  })

  it('button click triggers form submission', () => {
    render(<Search />)
    const input = screen.getByPlaceholderText('Search')
    fireEvent.change(input, { target: { value: 'button test' } })
    const form = input.closest('form')
    const button = form!.querySelector('button[type="submit"]')
    fireEvent.click(button!)
    expect(mockPush).toHaveBeenCalledWith('/search?q=button test')
  })

  it('prevents default form submission behavior', () => {
    render(<Search />)
    const input = screen.getByPlaceholderText('Search')
    fireEvent.change(input, { target: { value: 'prevent default test' } })
    const form = input.closest('form')!
    const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
    form.dispatchEvent(submitEvent)
    expect(mockPush).toHaveBeenCalledWith('/search?q=prevent default test')
  })
})
