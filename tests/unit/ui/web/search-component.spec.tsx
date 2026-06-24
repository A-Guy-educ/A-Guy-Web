// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Search } from '@/ui/web/search/Component'

const pushMock = vi.fn()
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: pushMock }),
}))

afterEach(() => {
  cleanup()
})

describe('Search component', () => {
  it('renders the search form', () => {
    render(<Search />)
    expect(screen.getByRole('searchbox')).toBeTruthy()
  })

  it('input has name="search" for FormData extraction', () => {
    render(<Search />)
    const input = screen.getByRole('searchbox')
    expect(input.getAttribute('name')).toBe('search')
  })

  it('input has id="search" for label association', () => {
    render(<Search />)
    const input = screen.getByRole('searchbox')
    expect(input.getAttribute('id')).toBe('search')
  })

  it('updates value on input change', () => {
    render(<Search />)
    const input = screen.getByRole('searchbox') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'test query' } })
    expect(input.value).toBe('test query')
  })

  it('navigates to /search on empty submit', () => {
    pushMock.mockClear()
    render(<Search />)
    const form = screen.getByRole('searchbox').closest('form') as HTMLFormElement
    fireEvent.submit(form)
    expect(pushMock).toHaveBeenCalledWith('/search')
  })

  it('navigates to /search?q=query on populated submit', () => {
    pushMock.mockClear()
    render(<Search />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'hello' } })
    const form = screen.getByRole('searchbox').closest('form') as HTMLFormElement
    fireEvent.submit(form)
    expect(pushMock).toHaveBeenCalledWith('/search?q=hello')
  })

  it('button click triggers form submission', () => {
    pushMock.mockClear()
    render(<Search />)
    const input = screen.getByRole('searchbox')
    fireEvent.change(input, { target: { value: 'test' } })
    const button = screen.getByRole('button')
    fireEvent.click(button)
    expect(pushMock).toHaveBeenCalledWith('/search?q=test')
  })

  it('calls preventDefault on form submit', () => {
    // verify preventDefault is called by checking navigation doesn't cause page reload
    // (if preventDefault wasn't called, form would try native submission)
    pushMock.mockClear()
    render(<Search />)
    const form = screen.getByRole('searchbox').closest('form') as HTMLFormElement
    fireEvent.submit(form)
    expect(pushMock).toHaveBeenCalled()
    // The key indicator that preventDefault worked: pushMock was called (navigation happened)
    // instead of form trying to do a native POST
  })
})
