import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import { Landing } from './Landing'
import { course } from '../../lessons/course'

function open(path = '/') {
  const user = userEvent.setup()
  const utils = render(
    <MemoryRouter initialEntries={[path]}>
      <Landing />
    </MemoryRouter>,
  )
  return { user, ...utils }
}

const suggestions = () => screen.getByRole('group', { name: 'Suggested commands' })
const input = () => screen.getByRole('textbox', { name: 'Terminal input' })

describe('Landing', () => {
  beforeEach(() => localStorage.clear())

  it('shows the hero heading', () => {
    open()
    expect(screen.getByRole('heading', { level: 1, name: 'Learn Git by using it.' })).toBeInTheDocument()
  })

  it('opens the demo with the practice-repo explanation and does not take focus', () => {
    open()
    expect(screen.getByText(/This is a practice repo\./)).toBeInTheDocument()
    expect(input()).not.toHaveFocus()
  })

  it('runs the real engine when a suggestion is clicked', async () => {
    const { user } = open()
    await user.click(within(suggestions()).getByRole('button', { name: 'git status' }))
    expect(screen.getByText('Changes not staged for commit:')).toBeInTheDocument()
  })

  it('offers a did-you-mean card when git is left off', async () => {
    const { user } = open()
    await user.type(input(), 'status{Enter}')
    const card = screen.getByText(/Did you mean/).closest('.fb')
    expect(card).toHaveClass('fb-warn')
    expect(within(card as HTMLElement).getByRole('button', { name: 'git status' })).toBeInTheDocument()
  })

  it('moves the suggestions along as the repo changes', async () => {
    const { user } = open()
    await user.click(within(suggestions()).getByRole('button', { name: 'git add notes.txt' }))
    await user.click(within(suggestions()).getByRole('button', { name: 'git commit -m "Update notes.txt"' }))
    expect(within(suggestions()).getByRole('button', { name: 'echo "more" >> notes.txt' })).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
  })

  it('links the calls to action', () => {
    open()
    const starts = screen.getAllByRole('link', { name: 'Start the course' })
    expect(starts.length).toBeGreaterThan(0)
    for (const a of starts) expect(a).toHaveAttribute('href', '/learn')
    expect(screen.getByRole('link', { name: "See what you'll learn" })).toHaveAttribute('href', '#course')
    expect(screen.getByRole('link', { name: 'Source code' })).toHaveAttribute('href', 'https://github.com/chrisglaske/devcore')
  })

  it('renders the course rail from the course data', () => {
    const { container } = open()
    const rail = container.querySelector('#course')
    expect(rail).not.toBeNull()
    for (const s of course) {
      expect(within(rail as HTMLElement).getByRole('heading', { name: s.title })).toBeInTheDocument()
    }
    expect(within(rail as HTMLElement).getAllByText('At launch').length).toBe(course.filter((s) => s.status === 'launch').length)
    expect(within(rail as HTMLElement).getAllByText('Coming next').length).toBe(course.filter((s) => s.status === 'later').length)
    expect(within(rail as HTMLElement).getByText('git reflog')).toBeInTheDocument()
  })

  it('scrolls to the course when opened at /#course', () => {
    const spy = vi.fn()
    Element.prototype.scrollIntoView = spy
    try {
      open('/#course')
      expect(spy).toHaveBeenCalled()
      expect(spy.mock.contexts[0]).toHaveAttribute('id', 'course')
    } finally {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView
    }
  })

  it('still renders when the link has a malformed hash', () => {
    open('/#%')
    expect(screen.getByRole('heading', { level: 1, name: 'Learn Git by using it.' })).toBeInTheDocument()
  })

  it('uses the updated privacy copy', () => {
    open()
    expect(screen.getByText('No tracking cookies')).toBeInTheDocument()
    expect(screen.getByText(/anonymous page-visit counts/)).toBeInTheDocument()
    expect(screen.getByText(/TermTrek has no server and no sign-in\. Your lessons run entirely in your browser/)).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = open()
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
