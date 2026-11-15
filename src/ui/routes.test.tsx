import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import App from './App'
import { STORAGE_KEY } from '../progress/store'
import { allLessons } from '../lessons/course'
import { PLAYGROUND } from '../lessons/playground'

// Real React.lazy and Suspense here, not the synchronous stand-in from setup.ts.
vi.unmock('./lazyRoute')

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('routes', () => {
  beforeEach(() => localStorage.clear())

  it('keeps focus on the page when a lazy route finishes loading', async () => {
    const user = userEvent.setup()
    at('/')
    await user.click(screen.getAllByRole('link', { name: 'Setup guides' })[0]!)
    await screen.findByRole('heading', { level: 1, name: 'Setup guides' })
    await waitFor(() => expect(document.activeElement).toBe(document.getElementById('main')))
    expect(document.getElementById('main')).not.toBeNull()
  })

  it('shows not found for an unknown lesson id', async () => {
    // index.html carries these; the not-found page points them at the home page.
    document.head.insertAdjacentHTML('beforeend', '<link rel="canonical" href="https://termtrek.work/"><meta property="og:url" content="https://termtrek.work/">')
    window.history.pushState({}, '', '/learn/does-not-exist')
    at('/learn/does-not-exist')
    window.history.pushState({}, '', '/')
    expect(await screen.findByRole('heading', { name: "We couldn't find that page." })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the course' })).toHaveAttribute('href', '/learn')
    expect(document.title).toBe('Page not found · TermTrek')
    expect(document.querySelector('meta[name="robots"]')).toHaveAttribute('content', 'noindex')
    expect(document.querySelector('link[rel="canonical"]')).toHaveAttribute('href', 'https://termtrek.work/')
    expect(document.querySelector('meta[property="og:url"]')).toHaveAttribute('content', 'https://termtrek.work/')
  })

  it('opens the playground', async () => {
    at('/playground')
    await waitFor(() => expect(document.title).toBe('Playground · TermTrek'))
    expect(screen.queryByRole('heading', { name: "We couldn't find that page." })).toBeNull()
    expect(document.title).toBe('Playground · TermTrek')
    expect(allLessons().some((l) => l.id === PLAYGROUND.id)).toBe(false)
  })

  it('lists the guides', async () => {
    at('/guides')
    expect(screen.getAllByRole('link', { name: /minutes/ })).toHaveLength(3)
    expect(await screen.findByRole('heading', { level: 1, name: 'Setup guides' })).toBeInTheDocument()
    expect(document.title).toBe('Setup guides · TermTrek')
  })

  it('opens a guide and shows not found for an unknown one', async () => {
    at('/guides/install-git')
    expect(await screen.findByRole('heading', { level: 1, name: 'Install Git' })).toBeInTheDocument()
    expect(document.title).toBe('Install Git · TermTrek')
    expect(screen.getByText('xcode-select --install')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'All setup guides' })).toHaveAttribute('href', '/guides')
  })

  it('shows not found for an unknown guide', async () => {
    at('/guides/nope')
    expect(await screen.findByRole('heading', { name: "We couldn't find that page." })).toBeInTheDocument()
  })

  it('shows not found for an unknown path', () => {
    at('/nope')
    expect(screen.getByRole('heading', { name: "We couldn't find that page." })).toBeInTheDocument()
  })

  it('opens a lesson by id', async () => {
    at('/learn/first-commit')
    expect(await screen.findByRole('heading', { level: 1, name: 'Your first commit' })).toBeInTheDocument()
    expect(document.title).toBe('Your first commit · TermTrek')
  })

  it('shows the welcome Home page at /learn on a first visit', async () => {
    at('/learn')
    expect(await screen.findByRole('heading', { level: 1, name: 'Learn Git by doing it' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Start the course' })).toHaveAttribute('href', '/learn/terminal-basics')
    expect(screen.getByRole('link', { name: /Skip to Git/ })).toHaveAttribute('href', '/learn/what-is-git')
  })

  it('offers Continue with the last lesson when progress exists', async () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completed: { 'terminal-basics': { at: '2026-11-09T00:00:00.000Z' } }, lastLesson: 'check-the-status' }))
    at('/learn')
    expect(await screen.findByRole('heading', { level: 1, name: 'Pick up where you left off' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/learn/check-the-status')
    expect(screen.getByText(/^1 of \d+ lessons done\.$/)).toBeInTheDocument()
  })

  it('falls back to the first unfinished lesson when lastLesson is a stale id', async () => {
    const completed = { 'terminal-basics': { at: '2026-11-09T00:00:00.000Z' }, 'what-is-git': { at: '2026-11-09T00:00:00.000Z' } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completed, lastLesson: 'gone' }))
    at('/learn')
    expect(await screen.findByRole('link', { name: 'Continue' })).toHaveAttribute('href', '/learn/introduce-yourself')
  })

  it('lists every launch lesson, with the current section open and the others collapsed', async () => {
    at('/learn')
    expect(document.title).toBe('Your course · TermTrek')
    expect(await screen.findByRole('button', { name: /Foundations/ })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: /Branching/ })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByRole('link', { name: 'Terminal basics' })).toHaveAttribute('href', '/learn/terminal-basics')
  })

  it('shows the landing page at /', () => {
    at('/')
    expect(screen.getByRole('heading', { level: 1, name: 'See what Git is doing.' })).toBeInTheDocument()
    for (const a of screen.getAllByRole('link', { name: 'Start the course' })) expect(a).toHaveAttribute('href', '/learn')
    expect(screen.getByRole('link', { name: 'TermTrek home' })).toHaveAttribute('href', '/')
    expect(document.title).toBe('TermTrek: learn Git by using it')
  })
})
