import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import App from '../App'
import { STORAGE_KEY } from '../../progress/store'
import { findLesson } from '../../lessons/course'

const CONVERTED = ['make-a-branch', 'switch-branches', 'checkout-explained', 'fast-forward', 'merge-commit', 'merge-conflicts', 'stash']

const input = () => screen.getByRole('textbox', { name: 'Terminal input' })
/** user-event reads `{` as a key name; `{{` types a literal brace. */
const typed = (line: string) => `${line.replace(/\{/g, '{{')}{Enter}`
const continueBtn = () => screen.getByRole('button', { name: 'Continue' })

function open(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/learn/${id}`]}>
      <App />
    </MemoryRouter>,
  )
}

type User = ReturnType<typeof userEvent.setup>

/** Does a do page's step the way a learner would, including the editor when the step needs it. */
async function solve(user: User, lessonId: string, step: number) {
  const s = findLesson(lessonId)!.steps[step]!
  await user.type(input(), typed(s.solution[0]!))
  if (s.solve?.some((a) => a.type === 'save-file')) {
    await user.click(screen.getByRole('button', { name: /Keep incoming/ }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
  }
  if (s.solve?.some((a) => a.type === 'editor-done')) await user.click(screen.getByRole('button', { name: 'Save and close' }))
}

/** Moves on from the page showing now to the page titled `title`, doing any step on the way that is still to do. */
async function toPage(user: User, lessonId: string, title: string) {
  const pages = findLesson(lessonId)!.pages!
  const at = pages.findIndex((p) => screen.queryByRole('heading', { level: 2, name: p.title }))
  for (const page of pages.slice(at)) {
    if (page.title === title) return
    if (page.kind === 'do' && continueBtn().hasAttribute('disabled')) await solve(user, lessonId, page.step)
    // A pass ignores Continue for a moment, so the same Enter does not also move on.
    vi.setSystemTime(Date.now() + 1000)
    await user.click(continueBtn())
  }
}

describe('Branching lessons as calm pages', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => vi.useRealTimers())

  for (const id of CONVERTED) {
    describe(id, () => {
      const lesson = findLesson(id)!

      it('binds every step to exactly one do page, in order, with one command each', () => {
        const pages = lesson.pages!
        expect(pages.length).toBeGreaterThanOrEqual(6)
        expect(pages.length).toBeLessThanOrEqual(14)
        expect(new Set(pages.map((p) => p.id)).size).toBe(pages.length)
        expect(pages.at(-1)!.kind).toBe('finish')
        expect(pages.flatMap((p) => (p.kind === 'do' ? [p.step] : []))).toEqual(lesson.steps.map((_, i) => i))
        lesson.steps.forEach((s, i) => {
          expect(s.solution, `${id} step ${i}`).toHaveLength(1)
          const p = pages.find((x) => x.kind === 'do' && x.step === i)
          if (p?.kind === 'do') expect(p.command.map((c) => c.text).join(' ')).toBe(s.solution[0])
        })
      })

      it('plays through the real solutions to the finish page', async () => {
        const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
        const { container } = open(id)
        let axeChecked = false
        for (const page of lesson.pages!) {
          expect(screen.getByRole('heading', { level: 2, name: page.title })).toBeInTheDocument()
          if (page.kind === 'finish') break
          if (page.kind === 'do') {
            await solve(user, id, page.step)
            expect(continueBtn()).toBeEnabled()
            if (!axeChecked) {
              expect(await axe(container)).toHaveNoViolations()
              axeChecked = true
            }
            vi.setSystemTime(Date.now() + 1000)
          }
          await user.click(continueBtn())
        }
        expect(localStorage.getItem(STORAGE_KEY) ?? '').toContain(id)
      })
    })
  }

  it('draws every branch with its label and the HEAD ring', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = open('make-a-branch')
    expect(screen.getByRole('img', { name: /Your branches: .*on main.*HEAD is on main/ })).toBeInTheDocument()
    await toPage(user, 'make-a-branch', 'You are still on main')
    expect(screen.getByRole('img', { name: /on main and homepage\. HEAD is on main/ })).toBeInTheDocument()
    expect(screen.getByText('Each label is a branch. The ring marks HEAD, where you are.')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows both sides of the conflict, then the paused merge, then the fix in the editor', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = open('merge-conflicts')
    expect(screen.getByRole('region', { name: 'Current, main' })).toHaveTextContent('We launch on Friday.')
    expect(screen.getByRole('region', { name: 'Incoming, launch-date' })).toHaveTextContent('We launch on Thursday.')
    expect(await axe(container)).toHaveNoViolations()
    await toPage(user, 'merge-conflicts', 'Run into a conflict')
    await user.type(input(), typed('git merge launch-date'))
    expect(screen.getByText(/Merging launch-date: paused, 1 file to fix/)).toBeInTheDocument()
    await toPage(user, 'merge-conflicts', 'Choose what to keep')
    // The editor only appears once the learner opens the file on this page.
    expect(screen.queryByRole('textbox', { name: 'Edit notes.txt' })).toBeNull()
    await user.type(input(), typed('code notes.txt'))
    expect((screen.getByRole('textbox', { name: 'Edit notes.txt' }) as HTMLTextAreaElement).value).toContain('<<<<<<< HEAD')
    // Saving with the markers still in does not pass the step.
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(continueBtn()).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /Keep incoming/ }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(continueBtn()).toBeEnabled()
    expect(screen.queryByRole('textbox', { name: 'Edit notes.txt' })).toBeNull()
    expect(screen.getByText(/Conflict fixed in the file/)).toBeInTheDocument()
  })

  it('shows the stash on the shelf while you visit main', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    open('stash')
    await toPage(user, 'stash', 'Go check main')
    await user.type(input(), typed('git switch main'))
    expect(screen.getByText(/On the shelf: 1 stash entry\./)).toBeInTheDocument()
  })
})
