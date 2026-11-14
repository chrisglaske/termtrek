import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import { HeroLesson } from './HeroLesson'
import { firstCommit } from '../../lessons/foundations/first-commit'

function media({ fine = true, reduce = false }: { fine?: boolean; reduce?: boolean } = {}) {
  window.matchMedia = ((query: string) => ({
    matches: (fine && query.includes('pointer: fine')) || (reduce && query.includes('prefers-reduced-motion')),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

const open = () => render(<HeroLesson />, { wrapper: MemoryRouter })
const input = () => screen.getByRole('textbox', { name: 'Terminal input' })
const enter = (text: string) => {
  fireEvent.change(input(), { target: { value: text } })
  fireEvent.keyDown(input(), { key: 'Enter' })
}
/** Move 1, then the short beat before move 2. */
const stage = () => {
  enter('git add notes.txt')
  act(() => vi.advanceTimersByTime(1300))
}

describe('the lesson the hero is drawn from', () => {
  it('has exactly the two do pages the hero plays, stage then commit, on steps 0 and 1', () => {
    const doPages = (firstCommit.pages ?? []).filter((p) => p.kind === 'do')
    expect(doPages.map((p) => [p.id, p.kind === 'do' ? p.step : -1])).toEqual([
      ['stage', 0],
      ['commit', 1],
    ])
    expect(firstCommit.steps.map((st) => st.id)).toEqual(['stage', 'commit'])
  })
})

describe('HeroLesson', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    media()
  })
  afterEach(() => {
    vi.useRealTimers()
    delete (window as { matchMedia?: unknown }).matchMedia
    vi.restoreAllMocks()
  })

  it('opens on the "Choose the file" page, ready to type, with no button to press first', () => {
    open()
    expect(screen.getByText('Move 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Choose the file')).toBeInTheDocument()
    expect(input()).toHaveAttribute('placeholder', 'Type the command here')
    expect(screen.queryAllByRole('button')).toHaveLength(0)
    expect(document.querySelector('section[aria-label="Folder"]')).toHaveTextContent('notes.txt')
  })

  it('shows a "Try it" cue until the first key is typed', () => {
    open()
    expect(screen.getByText('Try it: type below')).toBeInTheDocument()
    fireEvent.input(input(), { target: { value: 'g' } })
    expect(screen.queryByText('Try it: type below')).not.toBeInTheDocument()
  })

  it('focuses the terminal on a mouse or trackpad, without scrolling', () => {
    const spy = vi.spyOn(HTMLElement.prototype, 'focus')
    open()
    expect(input()).toHaveFocus()
    expect(spy).toHaveBeenCalledWith({ preventScroll: true })
  })

  it('does not focus the terminal on a touch screen, so no keyboard pops up', () => {
    media({ fine: false })
    open()
    expect(input()).not.toHaveFocus()
  })

  it('marks the command card letters as they are typed', () => {
    open()
    fireEvent.change(input(), { target: { value: 'git a' } })
    expect(document.querySelectorAll('.cc-ok')).toHaveLength(5)
  })

  it("nudges with the lesson's own words when only the file name is typed", () => {
    open()
    enter('notes.txt')
    expect(screen.getByText(/That is the file name on its own/)).toBeInTheDocument()
    expect(screen.getByText('Choose the file')).toBeInTheDocument()
  })

  it('stages the file, puts the outcome where the command card was, then moves on to the commit page', () => {
    open()
    expect(document.querySelector('.cc')).not.toBeNull()
    enter('git add notes.txt')
    expect(document.querySelector('.cc')).toBeNull()
    expect(document.querySelector('.hl-out')).toHaveTextContent('Staged. notes.txt is chosen, but not saved yet.')
    expect(screen.queryByText('Save it')).toBeNull()
    act(() => vi.advanceTimersByTime(1300))
    expect(screen.getByText('Move 2 of 2')).toBeInTheDocument()
    expect(screen.getByText('Save it')).toBeInTheDocument()
    expect(document.querySelector('.cc')).not.toBeNull()
    expect(document.querySelector('section[aria-label="Saved"]')).not.toBeNull()
    expect(input()).toHaveFocus()
  })

  it("starts move 2 with a clean terminal, as the lesson's next page does", () => {
    open()
    enter('notes.txt')
    stage()
    expect(screen.queryByText(/That is the file name on its own/)).toBeNull()
    expect(document.querySelector('.term-log')).not.toHaveTextContent('git add notes.txt')
  })

  it('on a touch screen, keeps the keyboard up into move 2 when the visitor typed move 1', () => {
    media({ fine: false })
    open()
    expect(input()).not.toHaveFocus()
    input().focus()
    stage()
    expect(screen.getByText('Save it')).toBeInTheDocument()
    expect(input()).toHaveFocus()
  })

  it('on a touch screen, leaves focus alone on move 2 when the visitor was not typing', () => {
    media({ fine: false })
    open()
    stage()
    expect(screen.getByText('Save it')).toBeInTheDocument()
    expect(input()).not.toHaveFocus()
  })

  it('moves on at once when motion is reduced', () => {
    media({ reduce: true })
    open()
    enter('git add notes.txt')
    act(() => vi.advanceTimersByTime(0))
    expect(screen.getByText('Save it')).toBeInTheDocument()
  })

  it('commits, says so in one line with the ID, and offers the course in one row where the card was', () => {
    open()
    stage()
    enter('git commit -m "Add meeting notes"')
    expect(document.querySelector('.cc')).toBeNull()
    const out = document.querySelector('.hl-out') as HTMLElement
    expect(out.querySelector('.pf-good')).toHaveTextContent(/^✓Committed\. Your first save is done\. [0-9a-f]{7} is your commit's ID\.$/)
    // No separate report or done rows under the terminal.
    expect(document.querySelector('.pf-report')).toBeNull()
    expect(document.querySelectorAll('.pf-good')).toHaveLength(1)
    const end = out.querySelector('.hl-end') as HTMLElement
    expect(end).toHaveTextContent('You just made your first commit.')
    const start = screen.getByRole('link', { name: 'Start the course' })
    expect(end).toContainElement(start)
    expect(start).toHaveAttribute('href', '/learn')
    expect(start).toHaveFocus()
    expect(end).toContainElement(screen.getByRole('button', { name: 'Try again' }))
  })

  it('starts over with Try again', () => {
    open()
    stage()
    enter('git commit -m "Add meeting notes"')
    fireEvent.click(screen.getByRole('button', { name: 'Try again' }))
    expect(screen.getByText('Choose the file')).toBeInTheDocument()
    expect(screen.queryByText('You just made your first commit.')).toBeNull()
    expect(document.querySelector('section[aria-label="Staged"]')).not.toHaveTextContent('notes.txt')
    expect(input()).toHaveFocus()
  })

  it('saves nothing', () => {
    const set = vi.spyOn(Storage.prototype, 'setItem')
    open()
    enter('notes.txt')
    stage()
    enter('git commit -m "Add meeting notes"')
    expect(set).not.toHaveBeenCalled()
  })

  it('has no axe violations at the start, after a slip, and when finished', async () => {
    vi.useRealTimers()
    media({ reduce: true })
    const { container } = open()
    const rules = { rules: { 'color-contrast': { enabled: false } } }
    expect(await axe(container, rules)).toHaveNoViolations()
    enter('notes.txt')
    expect(await axe(container, rules)).toHaveNoViolations()
    enter('git add notes.txt')
    await screen.findByText('Save it')
    enter('git commit -m "Add meeting notes"')
    expect(await axe(container, rules)).toHaveNoViolations()
  })
})
