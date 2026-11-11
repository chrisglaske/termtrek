import { act, fireEvent, render, screen, within } from '@testing-library/react'
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

/** Opens the landing with the practice terminal showing, as after a click on "Try it yourself". */
async function openTerminal() {
  const utils = open()
  await utils.user.click(screen.getByRole('button', { name: 'Try it yourself' }))
  return utils
}

const graph = () => screen.getByRole('img', { name: /^Commit graph of a practice repo/ })
const PROMISES = ['No account, no install, free forever', 'Your progress never leaves your device', 'Open source']

function reduceMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

const suggestions = () => screen.getByRole('group', { name: 'Suggested commands' })
const input = () => screen.getByRole('textbox', { name: 'Terminal input' })

describe('Landing', () => {
  beforeEach(() => localStorage.clear())

  it('shows the hero heading, keeps the brand line in the lede, and keeps the promises', () => {
    const { container } = open()
    expect(screen.getByRole('heading', { level: 1, name: 'See what Git is doing.' })).toBeInTheDocument()
    const lede = container.querySelector('.hero .lede')
    expect(lede?.querySelector('strong')).toHaveTextContent(/^Learn Git by using it\.$/)
    const hero = container.querySelector('.hero') as HTMLElement
    const items = within(hero).getAllByRole('listitem').filter((li) => li.closest('.promise'))
    expect(items.map((li) => li.textContent)).toEqual(PROMISES)
    expect(within(hero).getByRole('link', { name: 'Start the course' })).toHaveAttribute('href', '/learn')
  })

  it('makes the live repo map the hero, labelled and driven by the real engine', () => {
    open()
    expect(screen.getByRole('heading', { level: 2, name: 'Your repo' })).toBeInTheDocument()
    expect(graph()).toHaveAccessibleName(/Last command: git switch -c homepage\. 2 commits on main and homepage\. HEAD is on homepage at [0-9a-f]{7}\./)
    expect(graph().textContent).toContain('homepage · HEAD')
    expect(screen.queryByRole('textbox', { name: 'Terminal input' })).toBeNull()
  })

  describe('hero map playback', () => {
    beforeEach(() => vi.useFakeTimers())
    afterEach(() => {
      vi.useRealTimers()
      delete (window as { matchMedia?: unknown }).matchMedia
    })

    it('steps through a branch and a merge, then can be paused', () => {
      open()
      for (let i = 0; i < 5; i++) act(() => vi.advanceTimersByTime(6000))
      expect(graph()).toHaveAccessibleName(/Last command: git merge homepage\. 6 commits on main and homepage\. HEAD is on main at/)
      expect(graph().textContent).toContain('main · HEAD')
      expect(screen.getByText("Merge made by the 'ort' strategy.")).toBeInTheDocument()
      fireEvent.click(screen.getByRole('button', { name: 'Pause the demo' }))
      expect(screen.getByRole('button', { name: 'Play the demo' })).toHaveTextContent('Play')
      act(() => vi.advanceTimersByTime(30000))
      expect(graph()).toHaveAccessibleName(/Last command: git merge homepage\./)
    })

    it('starts on the finished merge and stays still when motion is reduced', () => {
      reduceMotion(true)
      open()
      expect(graph()).toHaveAccessibleName(/Last command: git merge homepage\./)
      expect(screen.getByRole('button', { name: 'Play the demo' })).toBeInTheDocument()
      act(() => vi.advanceTimersByTime(30000))
      expect(graph()).toHaveAccessibleName(/Last command: git merge homepage\./)
    })
  })

  it('links the guides band to /guides and the footer to /playground', () => {
    open()
    expect(screen.getByRole('link', { name: 'See the guides' })).toHaveAttribute('href', '/guides')
    const footer = screen.getByRole('navigation', { name: 'Footer' })
    expect(within(footer).getByRole('link', { name: 'Playground' })).toHaveAttribute('href', '/playground')
  })

  it('opens the practice terminal from the hero map, with its explanation and focus', async () => {
    await openTerminal()
    expect(screen.getByText(/This is a practice repo\./)).toBeInTheDocument()
    expect(input()).toHaveFocus()
    expect(screen.queryByRole('button', { name: 'Try it yourself' })).toBeNull()
  })

  it('runs the real engine when a suggestion is clicked', async () => {
    const { user } = await openTerminal()
    await user.click(within(suggestions()).getByRole('button', { name: 'git status' }))
    expect(screen.getByText('Changes not staged for commit:')).toBeInTheDocument()
  })

  it('offers a did-you-mean card when git is left off', async () => {
    const { user } = await openTerminal()
    await user.type(input(), 'status{Enter}')
    const card = screen.getByText(/Did you mean/).closest('.fb')
    expect(card).toHaveClass('fb-warn')
    expect(within(card as HTMLElement).getByRole('button', { name: 'git status' })).toBeInTheDocument()
  })

  it('moves the suggestions along as the repo changes', async () => {
    const { user } = await openTerminal()
    await user.click(within(suggestions()).getByRole('button', { name: 'git add notes.txt' }))
    await user.click(within(suggestions()).getByRole('button', { name: 'git commit -m "Update notes.txt"' }))
    expect(within(suggestions()).getByRole('button', { name: 'git switch -c new-idea' })).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
  })

  it('walks the branch tour from the first commit to a merged branch', async () => {
    const { user, container } = await openTerminal()
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
    const { user } = await openTerminal()
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
    const { user, container } = await openTerminal()
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
    expect(screen.getByRole('heading', { level: 1, name: 'See what Git is doing.' })).toBeInTheDocument()
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

  it('has no axe violations with the practice terminal open', async () => {
    const { container } = await openTerminal()
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
