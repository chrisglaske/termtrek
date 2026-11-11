import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import App from './App'
import { STORAGE_KEY } from '../progress/store'

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}

describe('routes', () => {
  beforeEach(() => localStorage.clear())

  it('shows not found for an unknown lesson id', () => {
    at('/learn/does-not-exist')
    expect(screen.getByRole('heading', { name: "We couldn't find that page." })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Go to the course' })).toHaveAttribute('href', '/learn')
    expect(document.title).toBe('Page not found · TermTrek')
  })

  it('shows not found for an unknown path', () => {
    at('/nope')
    expect(screen.getByRole('heading', { name: "We couldn't find that page." })).toBeInTheDocument()
  })

  it('opens a lesson by id', () => {
    at('/learn/first-commit')
    expect(screen.getByRole('heading', { level: 1, name: 'Your first commit' })).toBeInTheDocument()
    expect(document.title).toBe('Your first commit · TermTrek')
  })

  it('redirects /learn to the first lesson', () => {
    at('/learn')
    expect(screen.getByRole('heading', { level: 1, name: 'What is Git?' })).toBeInTheDocument()
  })

  it('redirects /learn to the last lesson when it still exists', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completed: {}, lastLesson: 'check-the-status' }))
    at('/learn')
    expect(screen.getByRole('heading', { level: 1, name: 'Check the status' })).toBeInTheDocument()
  })

  it('falls back to the first incomplete lesson when lastLesson is a stale id', () => {
    const completed = { 'what-is-git': { at: '2026-11-09T00:00:00.000Z' } }
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ version: 1, completed, lastLesson: 'gone' }))
    at('/learn')
    expect(screen.getByRole('heading', { level: 1, name: 'Introduce yourself' })).toBeInTheDocument()
  })

  it('shows the landing page at /', () => {
    at('/')
    expect(screen.getByRole('heading', { name: 'Learn Git by using it.' })).toBeInTheDocument()
    for (const a of screen.getAllByRole('link', { name: 'Start the course' })) expect(a).toHaveAttribute('href', '/learn')
    expect(screen.getByRole('link', { name: 'TermTrek home' })).toHaveAttribute('href', '/')
    expect(document.title).toBe('TermTrek: learn Git by using it')
  })
})
