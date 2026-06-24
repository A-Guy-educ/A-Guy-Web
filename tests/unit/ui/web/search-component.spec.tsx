// @vitest-environment jsdom
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { Search } from '@/ui/web/search/Component'
import * as nextNavigation from 'next/navigation'

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}))

describe('Search component', () => {
  let pushMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    pushMock = vi.fn()
    vi.clearAllMocks()
    vi.spyOn(nextNavigation, 'useRouter').mockImplementation(() => ({ push: pushMock }))
  })

  it('renders search input with correct placeholder', () => {
    render(<Search />)
    expect(screen.getByPlaceholderText('Search')).toBeTruthy()
  })

  it('renders hidden submit button', () => {
    render(<Search />)
    const button = screen.getByRole('button', { name: /submit/i })
    expect(button.getAttribute('type')).toBe('submit')
  })

  it('has input with name="search" for FormData extraction', () => {
    render(<Search />)
    const input = screen.getByRole('textbox')
    expect(input.getAttribute('name')).toBe('search')
  })

  it('navigates to /search when form is submitted with empty input', async () => {
    render(<Search />)
    const form = screen.getByRole('textbox').closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/search')
    })
  })

  it('navigates to /search?q=value when form is submitted with search term', async () => {
    render(<Search />)
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'test query' } })
    const form = input.closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/search?q=test query')
    })
  })

  it('updates input value when user types', () => {
    render(<Search />)
    const input = screen.getByRole('textbox') as HTMLInputElement

    fireEvent.change(input, { target: { value: 'hello' } })
    expect(input.value).toBe('hello')
  })

  it('uses FormData to extract search value from named input', async () => {
    render(<Search />)
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: ' FormData test ' } })
    const form = input.closest('form')!
    fireEvent.submit(form)

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/search?q= FormData test ')
    })
  })

  it('handles form submission via button click', async () => {
    render(<Search />)
    const input = screen.getByRole('textbox')

    fireEvent.change(input, { target: { value: 'button test' } })
    const button = screen.getByRole('button', { name: /submit/i })
    fireEvent.click(button)

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/search?q=button test')
    })
  })

  it('prevents default form submission and uses router.push instead', async () => {
    render(<Search />)
    const input = screen.getByRole('textbox')
    const form = input.closest('form')!

    fireEvent.change(input, { target: { value: 'prevent test' } })
    fireEvent.submit(form)

    await waitFor(() => {
      expect(pushMock).toHaveBeenCalledWith('/search?q=prevent test')
    })
  })
})
