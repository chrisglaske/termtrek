import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode, useEffect, useRef } from 'react'
import { Link, MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { RouteChange } from './RouteChange'

function Page({ name, to }: { name: string; to: string }): React.JSX.Element {
  const navigate = useNavigate()
  return (
    <main id="main" tabIndex={-1}>
      <h1>{name}</h1>
      <Link to={to}>go</Link>
      <button type="button" onClick={() => navigate(-1)}>
        back
      </button>
    </main>
  )
}

/** A page that focuses its own control when it opens, like a lesson focusing its terminal. */
function SelfFocus(): React.JSX.Element {
  const ref = useRef<HTMLButtonElement>(null)
  useEffect(() => ref.current?.focus(), [])
  return (
    <main id="main" tabIndex={-1}>
      <button type="button" ref={ref}>
        mine
      </button>
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
        <Route path="/c" element={<SelfFocus />} />
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

  it('leaves the first page alone in StrictMode too', () => {
    render(
      <StrictMode>
        <MemoryRouter initialEntries={['/a']}>
          <RouteChange />
          <Routes>
            <Route path="/a" element={<Page name="A" to="/b" />} />
          </Routes>
        </MemoryRouter>
      </StrictMode>,
    )
    expect(scrollTo).not.toHaveBeenCalled()
    expect(document.activeElement).toBe(document.body)
  })

  it('leaves the scroll to the browser on Back', async () => {
    app()
    await userEvent.click(screen.getByRole('link', { name: 'go' }))
    scrollTo.mockClear()
    await userEvent.click(screen.getByRole('button', { name: 'back' }))
    expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument()
    expect(scrollTo).not.toHaveBeenCalled()
  })

  it('does not pull focus to the top of the page for a #hash link', async () => {
    app()
    await userEvent.click(screen.getByRole('link', { name: 'go' }))
    await userEvent.click(screen.getByRole('link', { name: 'go' }))
    expect(screen.getByRole('heading', { name: 'A' })).toBeInTheDocument()
    expect(document.activeElement).not.toBe(document.getElementById('main'))
  })

  it('lets a page that focuses its own control keep that focus', async () => {
    render(
      <MemoryRouter initialEntries={['/a']}>
        <RouteChange />
        <Routes>
          <Route path="/a" element={<Page name="A" to="/c" />} />
          <Route path="/c" element={<SelfFocus />} />
        </Routes>
      </MemoryRouter>,
    )
    await userEvent.click(screen.getByRole('link', { name: 'go' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'mine' }))
  })
})
