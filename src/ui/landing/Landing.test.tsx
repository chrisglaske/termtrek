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

  it('links the guides band to /guides and the footer to /playground', () => {
    open()
    expect(screen.getByRole('link', { name: 'See the guides' })).toHaveAttribute('href', '/guides')
    const footer = screen.getByRole('navigation', { name: 'Footer' })
    expect(within(footer).getByRole('link', { name: 'Playground' })).toHaveAttribute('href', '/playground')
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
    expect(within(suggestions()).getByRole('button', { name: 'git switch -c new-idea' })).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
  })

  it('walks the branch tour from the first commit to a merged branch', async () => {
    const { user, container } = open()
    const click = (name: string) => user.click(within(suggestions()).getByRole('button', { name }))
    const noWarn = () => expect(container.querySelector('.fb-warn')).toBeNull()
    await click('git add notes.txt')
    await click('git commit -m "Update notes.txt"')
    await click('git switch -c new-idea')
    expect(container.querySelector('.demo-map svg')?.textContent).toContain('new-idea')
    noWarn()
    await click('echo "- Try a dark theme" >> notes.txt')
    await click('git add notes.txt')
    await click('git commit -m "Update notes.txt"')
    await click('git switch main')
    await click('git merge new-idea')
    noWarn()
    expect(screen.getByText(/Fast-forward/)).toBeInTheDocument()
    await click('git log --oneline --all')
    await click('git branch -d new-idea')
    noWarn()
    expect(screen.getByText(/Deleted branch new-idea/)).toBeInTheDocument()
    expect(container.querySelector('.demo-map svg')?.textContent).not.toContain('new-idea')
  })

  it('points code to the lessons and cancels an editor commit with a tip', async () => {
    const { user } = open()
    await user.type(input(), 'code notes.txt{Enter}')
    expect(screen.getByText(/The editor opens inside lessons\./)).toBeInTheDocument()
    await user.type(input(), 'git add notes.txt{Enter}')
    await user.type(input(), 'git commit{Enter}')
    expect(screen.getByText('Aborting commit due to empty commit message.')).toBeInTheDocument()
    expect(screen.queryByText(/Waiting for your editor/)).toBeNull()
    expect(screen.getByText(/This demo has no editor/)).toBeInTheDocument()
    expect(input()).toBeEnabled()
  })

  it('does not say main moved forward when a merge commit is made', async () => {
    const { user, container } = open()
    const run = async (line: string) => user.type(input(), `${line}{Enter}`)
    await run('git add notes.txt')
    await run('git commit -m "Update notes.txt"')
    await run('git switch -c new-idea')
    await run('echo one > notes.txt')
    await run('git commit -am "Idea side"')
    await run('git switch main')
    await run('echo two > notes.txt')
    await run('git commit -am "Main side"')
    await run('git merge new-idea')
    await run('echo both > notes.txt')
    await run('git add notes.txt')
    await run('git commit -m "Merge new-idea"')
    const cards = Array.from(container.querySelectorAll('.fb-ok')).map((e) => e.textContent ?? '')
    const last = cards[cards.length - 1] ?? ''
    expect(last).toMatch(/merge commit/i)
    expect(last).not.toMatch(/moved forward/)
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
