import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ProgressProvider } from '../../progress/ProgressContext'
import { ISSUES_URL, SOURCE_URL } from '../layout/links'
import { axe } from 'vitest-axe'
import { Landing } from './Landing'
import { TOUR_SETUP, demoSuggestions, tourFrames } from './HeroDemo'
import { createWorld } from '../../engine/world'
import { runLine } from '../../engine/interpreter'
import { course } from '../../lessons/course'
import { courseStats, formatHours, formatHoursShort, sectionStats } from '../../lessons/courseStats'

function open(path = '/') {
  const user = userEvent.setup()
  const utils = render(
    <MemoryRouter initialEntries={[path]}>
      <ProgressProvider>
        <Landing />
      </ProgressProvider>
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
    const footer = screen.getByRole('contentinfo')
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
    await user.click(within(suggestions()).getByRole('button', { name: 'git commit -m "docs: update notes.txt"' }))
    expect(within(suggestions()).getByRole('button', { name: 'git switch -c new-idea' })).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
  })

  it('walks the branch tour from the first commit to a merged branch', async () => {
    const { user, container } = await openTerminal()
    const click = (name: string) => user.click(within(suggestions()).getByRole('button', { name }))
    const noWarn = () => expect(container.querySelector('.fb-warn')).toBeNull()
    await click('git add notes.txt')
    await click('git commit -m "docs: update notes.txt"')
    await click('git switch -c new-idea')
    expect(container.querySelector('.demo-map svg')?.textContent).toContain('new-idea')
    noWarn()
    await click('echo "- Try a dark theme" >> notes.txt')
    await click('git add notes.txt')
    await click('git commit -m "docs: update notes.txt"')
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
    await run('git commit -m "docs: update notes.txt"')
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
    expect(screen.getAllByRole('link', { name: 'Source on GitHub' })[0]).toHaveAttribute('href', 'https://github.com/chrisglaske/devcore')
  })

  it('renders the course rail from the course data', () => {
    const { container } = open()
    const rail = container.querySelector('#course')
    expect(rail).not.toBeNull()
    for (const s of course) {
      expect(within(rail as HTMLElement).getByRole('heading', { name: s.title })).toBeInTheDocument()
    }
    expect(within(rail as HTMLElement).getAllByText('Available now').length).toBe(course.filter((s) => s.status === 'launch').length)
    expect(within(rail as HTMLElement).getAllByText('Coming next').length).toBe(course.filter((s) => s.status === 'later').length)
    expect(within(rail as HTMLElement).getByText('git reflog')).toBeInTheDocument()
  })

  it('shows the real course size from the lesson data', () => {
    open()
    const course_ = document.getElementById('course') as HTMLElement
    const stats = courseStats()
    const row = within(course_).getByRole('list', { name: 'Course size' })
    expect(row).toHaveTextContent(`${stats.lessons} lessons`)
    expect(row).toHaveTextContent(`${formatHoursShort(stats.minutes)} at your own pace`)
    expect(row).toHaveTextContent(`${stats.live} sections live, ${stats.later} coming`)
    for (const s of course.filter((x) => x.status === 'launch')) {
      const t = sectionStats(s)
      expect(within(course_).getByText(`${t.lessons} lessons · ${formatHours(t.minutes)}`)).toBeInTheDocument()
    }
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

  it('answers six questions in a short FAQ, the first of each column open', () => {
    open()
    expect(screen.getByRole('heading', { name: 'Questions people ask first.' })).toBeInTheDocument()
    const faq = document.getElementById('faq') as HTMLElement
    const details = Array.from(faq.querySelectorAll('details'))
    expect(details.map((d) => d.querySelector('summary')?.textContent)).toEqual([
      'Is it really free?',
      'Do I need to install anything?',
      "What's the difference between Git and GitHub?",
      'Are these real Git commands?',
      'I use an AI assistant to code. Is this for me?',
      'Can I use it on my phone?',
    ])
    expect(details.map((d) => d.open)).toEqual([true, false, false, true, false, false])
    expect(within(faq).getByRole('link', { name: 'the guides' })).toHaveAttribute('href', '/guides')
    const course_ = document.getElementById('course') as HTMLElement
    const privacy = document.getElementById('privacy') as HTMLElement
    expect(course_.compareDocumentPosition(faq) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(faq.compareDocumentPosition(privacy) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('says privacy honestly: no sign-in, anonymous visit counts', () => {
    open()
    const priv = document.getElementById('privacy') as HTMLElement
    expect(within(priv).getByRole('heading', { name: 'Learn in private.' })).toBeInTheDocument()
    expect(priv.textContent).toContain('No sign-in and no account. Your lessons run entirely in your browser, and all we see is an anonymous count of page visits. The code is public, so anyone can check.')
    expect(priv.textContent).not.toContain("couldn't watch")
    expect(priv.textContent).not.toContain('no server')
  })

  it('uses the updated privacy copy', () => {
    open()
    expect(screen.getByText('No tracking cookies')).toBeInTheDocument()
    expect(screen.getByText(/anonymous page-visit counts/)).toBeInTheDocument()
  })

  it('shows how lessons work with a live preview of a real lesson page', () => {
    open()
    const how = document.getElementById('how') as HTMLElement
    expect(within(how).getByRole('img', { name: /^A TermTrek lesson: you type git add notes\.txt/ })).toHaveTextContent('Choose the file')
    expect(within(how).getAllByRole('button', { pressed: true })).toHaveLength(1)
  })

  it('has a fuller footer with grouped links and a backup button', async () => {
    const { user } = open()
    const foot = screen.getByRole('contentinfo')
    expect(foot).toHaveTextContent('A free, hands-on Git course that runs in your browser. No account, no tracking cookies.')
    for (const n of ['Learn', 'Project', 'About']) {
      const nav = within(foot).getByRole('navigation', { name: n })
      expect(nav).toHaveAttribute('aria-labelledby')
      expect(nav).not.toHaveAttribute('aria-label')
    }
    expect(foot).toHaveTextContent('© 2026 TermTrek · Free and open source')
    expect(within(foot).getAllByRole('heading', { level: 2 }).map((h) => h.textContent)).toEqual(['Learn', 'Project', 'About'])
    const link = (name: string) => within(foot).getByRole('link', { name })
    expect(link('Course')).toHaveAttribute('href', '#course')
    expect(link('Playground')).toHaveAttribute('href', '/playground')
    expect(link('Guides')).toHaveAttribute('href', '/guides')
    expect(link('Source on GitHub')).toHaveAttribute('href', SOURCE_URL)
    expect(link('Report a problem')).toHaveAttribute('href', ISSUES_URL)
    expect(link('Suggest a lesson')).toHaveAttribute('href', ISSUES_URL)
    expect(link('Privacy')).toHaveAttribute('href', '#privacy')
    expect(link('License (AGPL-3.0)')).toHaveAttribute('href', `${SOURCE_URL}/blob/main/LICENSE`)
    const backup = within(foot).getByRole('button', { name: 'Back up progress' })
    await user.click(backup)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(backup).toHaveFocus()
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

describe('hero demo commit messages', () => {
  it('uses Conventional Commit messages in the tour', () => {
    const commits = tourFrames().map((f) => f.cmd).filter((c) => c.startsWith('git commit'))
    expect(commits).toHaveLength(3)
    for (const c of commits) expect(c).toMatch(/^git commit -am "(feat|fix|docs|chore): [a-z]/)
    const repo = createWorld(TOUR_SETUP)
    let w = runLine(repo, 'echo "- x" >> notes.txt').world
    w = runLine(w, 'git add notes.txt').world
    expect(demoSuggestions(w)).toContain('git commit -m "docs: update notes.txt"')
    w = runLine(repo, 'echo hi > fresh.txt').world
    w = runLine(w, 'git add fresh.txt').world
    expect(demoSuggestions(w)).toContain('git commit -m "docs: add fresh.txt"')
  })
})
