import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Link, MemoryRouter, Route, Routes } from 'react-router'
import { RouteChange } from './RouteChange'

function Page({ name, to }: { name: string; to: string }): React.JSX.Element {
  return (
    <main id="main" tabIndex={-1}>
      <h1>{name}</h1>
      <Link to={to}>go</Link>
    </main>
  )
}

function app() {
  return render(
    <MemoryRouter initialEntries={['/a']}>
      <RouteChange />
      <Routes>
        <Route path="/a" element={<Page name="A" to="/b" />} />
        <Route path="/b" element={<Page name="B" to="/a#top" />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('RouteChange', () => {
  const scrollTo = vi.fn()
  beforeEach(() => {
    scrollTo.mockClear()
    Object.defineProperty(document, 'scrollingElement', { configurable: true, value: { scrollTo } })
  })

  it('leaves the first page alone', () => {
    app()
    expect(scrollTo).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(document.body)
  })

  it('scrolls to the top and focuses the new page', async () => {
    app()
    await userEvent.click(screen.getByRole('link', { name: 'go' }))
    expect(screen.getByRole('heading', { name: 'B' })).toBeInTheDocument()
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: 'instant' })
    expect(document.activeElement).toBe(document.getElementById('main'))
  })

  it('keeps hash scrolling to the page', async () => {
    app()
    await userEvent.click(screen.getByRole('link', { name: 'go' }))
    scrollTo.mockClear()
    await userEvent.click(screen.getByRole('link', { name: 'go' }))
    expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument()
    expect(scrollTo).not.toHaveBeenCalled()
  })
})
