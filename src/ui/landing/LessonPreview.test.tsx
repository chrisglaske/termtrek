import { act, fireEvent, render as rtlRender, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import { HowItWorks } from './LessonPreview'
import { previewFrames } from './previewFrames'
import { getStatus } from '../../engine/git/repoState'

// The Try it mode links into the real lesson, so the preview needs a router around it.
const render = (ui: React.ReactElement) => rtlRender(ui, { wrapper: MemoryRouter })

const STEPS = ['Understand the idea', 'Type it yourself', 'See what changed', 'Get unstuck fast']

function reduceMotion(reduce: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: reduce && query.includes('prefers-reduced-motion'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

const stepButton = (name: string) => screen.getByRole('button', { name })
const pressed = () => STEPS.filter((n) => stepButton(n).getAttribute('aria-pressed') === 'true')
const preview = () => screen.getByRole('img', { name: /^A TermTrek lesson: you type git add notes\.txt/ })
const tryArea = () => screen.getByRole('group', { name: 'Try the first lesson step' })
const input = () => screen.getByRole('textbox', { name: 'Terminal input' })
const box = (title: string) => document.querySelector(`.lp section[aria-label="${title}"]`)
const play = () => fireEvent.click(screen.getByRole('button', { name: 'Play the lesson preview' }))
const pause = () => fireEvent.click(screen.getByRole('button', { name: 'Pause the lesson preview' }))
const type = (text: string) => fireEvent.change(input(), { target: { value: text } })
const enter = (text: string) => {
  type(text)
  fireEvent.keyDown(input(), { key: 'Enter' })
}
const startTrying = () => fireEvent.click(screen.getByRole('button', { name: 'Try it' }))

describe('previewFrames', () => {
  it('plays the first-commit stage page through the real engine', () => {
    const frames = previewFrames()
    expect(frames).toHaveLength(4)
    expect(getStatus(frames[0]!.world)?.staged).toEqual([])
    expect(getStatus(frames[2]!.world)?.staged[0]?.path).toBe('notes.txt')
    expect(frames[2]!.staged).toBe(true)
    expect(frames[1]!.typed).toBe('git add notes.txt')
    expect(frames[3]!.typed).toBe('status')
    expect(frames[3]!.hint).toBe(true)
    expect(frames[3]!.entries.some((e) => e.explain?.text.includes('Did you mean'))).toBe(true)
  })

  it('runs the slip from the staged world, so the file stays in Staged', () => {
    const frames = previewFrames()
    expect(getStatus(frames[3]!.world)?.staged[0]?.path).toBe('notes.txt')
    expect(frames[3]!.from).toBe(frames[2]!.world)
  })
})

describe('HowItWorks', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    delete (window as { matchMedia?: unknown }).matchMedia
  })

  it('steps through the four parts on a timer, jumps on click, and pauses', () => {
    const { unmount } = render(<HowItWorks />)
    expect(pressed()).toEqual(['Understand the idea'])
    expect(preview()).toHaveTextContent('Choose the file')
    act(() => vi.advanceTimersByTime(3200))
    expect(pressed()).toEqual(['Type it yourself'])
    fireEvent.click(stepButton('Get unstuck fast'))
    expect(pressed()).toEqual(['Get unstuck fast'])
    fireEvent.click(screen.getByRole('button', { name: 'Pause the lesson preview' }))
    expect(screen.getByRole('button', { name: 'Play the lesson preview' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(20000))
    expect(pressed()).toEqual(['Get unstuck fast'])
    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('types the command, then shows the staged file and its caption', () => {
    render(<HowItWorks />)
    fireEvent.click(stepButton('Type it yourself'))
    act(() => vi.advanceTimersByTime(4 * 70))
    expect(preview().querySelector('.t-input')?.textContent).toBe('git ')
    act(() => vi.advanceTimersByTime(4200))
    expect(pressed()).toEqual(['See what changed'])
    expect(preview()).toHaveTextContent('notes.txt moved from Folder to Staged.')
    expect(preview()).toHaveTextContent('Staged. notes.txt is chosen, but not saved yet.')
  })

  it('shows the did-you-mean card after status is typed', () => {
    render(<HowItWorks />)
    fireEvent.click(stepButton('Get unstuck fast'))
    act(() => vi.advanceTimersByTime(2000))
    expect(preview()).toHaveTextContent(/Did you mean git status\?/)
  })

  it('starts on "See what changed" with no timer under reduced motion', () => {
    reduceMotion(true)
    render(<HowItWorks />)
    expect(pressed()).toEqual(['See what changed'])
    expect(preview()).toHaveTextContent('notes.txt moved from Folder to Staged.')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('keeps everything inside the preview out of the tab order', () => {
    render(<HowItWorks />)
    for (const name of STEPS) {
      fireEvent.click(stepButton(name))
      act(() => vi.advanceTimersByTime(3000))
      expect(preview().querySelectorAll('input,button,a,[tabindex]')).toHaveLength(0)
    }
  })
})

describe('HowItWorks timing', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('pauses the typing too', () => {
    render(<HowItWorks />)
    fireEvent.click(stepButton('Type it yourself'))
    act(() => vi.advanceTimersByTime(4 * 70))
    pause()
    act(() => vi.advanceTimersByTime(2000))
    expect(preview().querySelector('.t-input')?.textContent).toBe('git ')
    play()
    act(() => vi.advanceTimersByTime(70))
    expect(preview().querySelector('.t-input')?.textContent).toBe('git a')
  })

  it('resumes with the time that was left, so the bar and the timer agree', () => {
    render(<HowItWorks />)
    act(() => vi.advanceTimersByTime(2000))
    pause()
    act(() => vi.advanceTimersByTime(10000))
    play()
    act(() => vi.advanceTimersByTime(1100))
    expect(pressed()).toEqual(['Understand the idea'])
    act(() => vi.advanceTimersByTime(150))
    expect(pressed()).toEqual(['Type it yourself'])
  })

  it('keeps the time that was left while the tab is hidden', () => {
    render(<HowItWorks />)
    const setHidden = (hidden: boolean) => {
      Object.defineProperty(document, 'hidden', { configurable: true, get: () => hidden })
      act(() => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
    }
    act(() => vi.advanceTimersByTime(2000))
    setHidden(true)
    act(() => vi.advanceTimersByTime(10000))
    setHidden(false)
    act(() => vi.advanceTimersByTime(1250))
    expect(pressed()).toEqual(['Type it yourself'])
    delete (document as { hidden?: unknown }).hidden
  })

  it('keeps the file in Staged when the slip follows the staging', () => {
    render(<HowItWorks />)
    fireEvent.click(stepButton('See what changed'))
    act(() => vi.advanceTimersByTime(3600))
    expect(pressed()).toEqual(['Get unstuck fast'])
    act(() => vi.advanceTimersByTime(2000))
    expect(box('Staged')).toHaveTextContent('notes.txt')
  })
})

describe('HowItWorks try mode', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => {
    vi.useRealTimers()
    vi.restoreAllMocks()
    delete (window as { matchMedia?: unknown }).matchMedia
  })

  it('stops the preview and hands the terminal to the visitor', () => {
    render(<HowItWorks />)
    act(() => vi.advanceTimersByTime(3200 + 4200))
    startTrying()
    expect(screen.queryByRole('img', { name: /^A TermTrek lesson/ })).toBeNull()
    expect(tryArea()).toHaveTextContent('Choose the file')
    expect(input()).toHaveFocus()
    expect(pressed()).toEqual(['Type it yourself'])
    expect(box('Folder')).toHaveTextContent('notes.txt')
    act(() => vi.advanceTimersByTime(20000))
    expect(pressed()).toEqual(['Type it yourself'])
    expect(screen.queryByRole('button', { name: /lesson preview$/ })).toBeNull()
  })

  it('marks each letter on the command card as it is typed', () => {
    render(<HowItWorks />)
    startTrying()
    type('git a')
    expect(tryArea().querySelectorAll('.cc-line .cc-ok')).toHaveLength(5)
  })

  it('passes on git add notes.txt and links into the real lesson', () => {
    render(<HowItWorks />)
    startTrying()
    enter('git add notes.txt')
    expect(tryArea()).toHaveTextContent('Staged. notes.txt is chosen, but not saved yet.')
    expect(tryArea()).toHaveTextContent('notes.txt moved from Folder to Staged.')
    expect(box('Staged')).toHaveTextContent('notes.txt')
    const link = screen.getByRole('link', { name: 'Continue in the real lesson' })
    expect(link).toHaveAttribute('href', '/learn/first-commit')
    expect(link).toHaveFocus()
    expect(pressed()).toEqual(['See what changed'])
  })

  it('counts any command that stages the file', () => {
    render(<HowItWorks />)
    startTrying()
    enter('git add .')
    expect(screen.getByRole('link', { name: 'Continue in the real lesson' })).toBeInTheDocument()
  })

  it("nudges with the lesson's own words", () => {
    render(<HowItWorks />)
    startTrying()
    enter('notes.txt')
    expect(tryArea()).toHaveTextContent('That is the file name on its own.')
    expect(pressed()).toEqual(['Get unstuck fast'])
    expect(screen.queryByRole('link', { name: 'Continue in the real lesson' })).toBeNull()
    type('git')
    expect(pressed()).toEqual(['Get unstuck fast'])
  })

  it('asks "Did you mean" for a command without git', () => {
    render(<HowItWorks />)
    startTrying()
    enter('status')
    expect(tryArea()).toHaveTextContent(/Did you mean git status\?/)
    expect(pressed()).toEqual(['Get unstuck fast'])
  })

  it('goes back to the playing preview with Watch again', () => {
    render(<HowItWorks />)
    startTrying()
    enter('git add notes.txt')
    fireEvent.click(screen.getByRole('button', { name: 'Watch again' }))
    expect(preview()).toBeInTheDocument()
    expect(pressed()).toEqual(['Understand the idea'])
    expect(screen.getByRole('button', { name: 'Try it' })).toBeInTheDocument()
    act(() => vi.advanceTimersByTime(3200))
    expect(pressed()).toEqual(['Type it yourself'])
    // A fresh try starts from the lesson's start again.
    startTrying()
    expect(box('Folder')).toHaveTextContent('notes.txt')
  })

  it('saves nothing', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem')
    render(<HowItWorks />)
    startTrying()
    enter('status')
    enter('git add notes.txt')
    expect(set).not.toHaveBeenCalled()
  })

  it('works the same under reduced motion', () => {
    reduceMotion(true)
    render(<HowItWorks />)
    startTrying()
    expect(input()).toHaveFocus()
    enter('git add notes.txt')
    expect(screen.getByRole('link', { name: 'Continue in the real lesson' })).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Watch again' }))
    // Back to the still picture, which does not play on its own.
    expect(preview()).toBeInTheDocument()
    expect(pressed()).toEqual(['See what changed'])
    act(() => vi.advanceTimersByTime(20000))
    expect(pressed()).toEqual(['See what changed'])
  })
})

describe('HowItWorks accessibility', () => {
  it('has no axe violations', async () => {
    const { container } = render(<HowItWorks />)
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })

  it('has no axe violations while trying', async () => {
    const { container } = render(<HowItWorks />)
    startTrying()
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
    enter('status')
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
    enter('git add notes.txt')
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
