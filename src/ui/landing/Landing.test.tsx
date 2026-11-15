import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { ProgressProvider } from '../../progress/ProgressContext'
import { ISSUES_URL, SOURCE_URL } from '../layout/links'
import { axe } from 'vitest-axe'
import { Landing } from './Landing'
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

const PROMISES = ['No account, no install, free forever', 'Your progress never leaves your device', 'Open source']

const input = () => screen.getByRole('textbox', { name: 'Terminal input' })

describe('Landing', () => {
  beforeEach(() => localStorage.clear())

  it('points below the hero to the rest of the page', () => {
    open()
    const more = screen.getByRole('link', { name: "Scroll for more" })
    expect(more).toHaveAttribute('href', '#who')
    expect(document.getElementById('who')).toBeInTheDocument()
  })

  it('on a phone, shows a page to read with a way to send it to a computer, and no live lesson', async () => {
    window.matchMedia = ((query: string) => ({
      matches: query.includes('max-width: 560px'),
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    try {
      const { container } = open()
      expect(screen.queryByRole('textbox', { name: 'Terminal input' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Scroll for more' })).not.toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Start the course' })).not.toBeInTheDocument()
      expect(screen.getByRole('heading', { name: 'Made for your computer' })).toBeInTheDocument()
      expect(screen.getAllByRole('button', { name: 'Send to my computer' })).toHaveLength(2)
      expect(screen.getByRole('heading', { name: "Ready when you're at your computer." })).toBeInTheDocument()
      // The four lesson steps as a plain list, without the playing lesson.
      expect(screen.getByText('Get unstuck fast')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Understand the idea/ })).not.toBeInTheDocument()
      expect(await axe(container)).toHaveNoViolations()
    } finally {
      delete (window as { matchMedia?: unknown }).matchMedia
    }
  })

  it('hides the "more below" pointer once the visitor types in the hero', () => {
    open()
    const more = screen.getByRole('link', { name: "Scroll for more" })
    fireEvent.input(input(), { target: { value: 'g' } })
    expect(more).toHaveClass('more-off')
  })

  it('shows the hero heading, keeps the brand line in the lede, and keeps the promises', () => {
    const { container } = open()
    expect(screen.getByRole('heading', { level: 1, name: 'See what Git is doing.' })).toBeInTheDocument()
    const lede = container.querySelector('.hero .lede')
    expect(lede?.querySelector('strong')).toHaveTextContent(/^Learn Git by using it\.$/)
    expect(lede).toHaveTextContent(
      'Learn Git by using it. Type real commands and see exactly what each one does to your files. A free, hands-on course in your browser, from your first commit to your first merged pull request.',
    )
    const hero = container.querySelector('.hero') as HTMLElement
    const items = within(hero).getAllByRole('listitem').filter((li) => li.closest('.promise'))
    expect(items.map((li) => li.textContent)).toEqual(PROMISES)
    expect(within(hero).getByRole('link', { name: 'Start the course' })).toHaveAttribute('href', '/learn')
  })

  it('makes the hero the first lesson, ready to type, with no map tour or Try button left', () => {
    const { container } = open()
    const hero = container.querySelector('.hero') as HTMLElement
    expect(within(hero).getByRole('group', { name: 'Try the first lesson' })).toHaveTextContent('Choose the file')
    expect(within(hero).getByRole('textbox', { name: 'Terminal input' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Try it yourself' })).toBeNull()
    expect(screen.queryByRole('heading', { name: 'Your repo' })).toBeNull()
    expect(screen.queryByRole('img', { name: /^Commit graph of a practice repo/ })).toBeNull()
    expect(container.querySelector('.hero-map, .demo')).toBeNull()
  })

  it('answers a bare file name in the hero with the lesson nudge', () => {
    open()
    fireEvent.change(input(), { target: { value: 'notes.txt' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(screen.getByText(/That is the file name on its own/)).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
  })

  it('links the guides band to /guides and the footer to /playground', () => {
    open()
    expect(screen.getByRole('link', { name: 'See the guides' })).toHaveAttribute('href', '/guides')
    const footer = screen.getByRole('contentinfo')
    expect(within(footer).getByRole('link', { name: 'Playground' })).toHaveAttribute('href', '/playground')
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
    expect(within(how).queryByRole('button', { name: 'Try it' })).toBeNull()
    expect(within(how).queryByRole('textbox')).toBeNull()
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
    expect(link('Setup guides')).toHaveAttribute('href', '/guides')
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
})
