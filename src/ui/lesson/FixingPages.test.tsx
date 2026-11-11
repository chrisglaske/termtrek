import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import App from '../App'
import { STORAGE_KEY } from '../../progress/store'
import { findLesson } from '../../lessons/course'

const CONVERTED = ['unstage', 'discard-changes', 'amend', 'undo-a-commit', 'rewind-with-reset', 'get-it-back']

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

describe('Fixing mistakes lessons as calm pages', () => {
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
            const step = lesson.steps[page.step]!
            await user.type(input(), typed(step.solution[0]!))
            const edit = step.solve?.find((a) => a.type === 'editor-done')
            if (edit) {
              const msg = screen.getByRole('textbox', { name: 'Edit COMMIT_EDITMSG' })
              if (edit.type === 'editor-done' && edit.text) {
                await user.clear(msg)
                await user.type(msg, edit.text)
              }
              await user.click(screen.getByRole('button', { name: 'Save and close' }))
            }
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

  describe('the rewind visual', () => {
    const toPage = async (user: ReturnType<typeof userEvent.setup>, title: string, lessonId: string) => {
      const lesson = findLesson(lessonId)!
      for (const page of lesson.pages!) {
        if (page.title === title) return
        if (page.kind === 'do') {
          await user.type(input(), typed(lesson.steps[page.step]!.solution[0]!))
          vi.setSystemTime(Date.now() + 1000)
        }
        await user.click(continueBtn())
      }
    }

    it('draws a reset-away commit dashed and labelled as recoverable', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const { container } = open('get-it-back')
      // Before the reset: four commits in a row, nothing left behind.
      expect(screen.getByRole('img', { name: /4 commits, HEAD at/ })).not.toHaveAccessibleName(/no longer on/)
      expect(container.querySelectorAll('.rw-lost')).toHaveLength(0)
      await toPage(user, 'They are still there', 'get-it-back')
      expect(container.querySelectorAll('.rw-lost')).toHaveLength(2)
      expect(container.querySelectorAll('.rw-node')).toHaveLength(2)
      expect(screen.getAllByText('recoverable')).toHaveLength(2)
      expect(screen.getByText('main · HEAD')).toBeInTheDocument()
      expect(screen.getByRole('img', { name: /2 newer commits are still saved but no longer on main/ })).toBeInTheDocument()
      expect(await axe(container)).toHaveNoViolations()
    })

    it('shows the commits again once they are restored', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const { container } = open('get-it-back')
      await toPage(user, 'Bring back the two commits', 'get-it-back')
      await user.type(input(), typed('git reset --hard HEAD@{1}'))
      expect(container.querySelectorAll('.rw-lost')).toHaveLength(0)
      expect(container.querySelectorAll('.rw-node')).toHaveLength(4)
    })

    it('draws one commit dashed after reset --soft', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      const { container } = open('rewind-with-reset')
      await toPage(user, 'Undo a commit, keep the work staged', 'rewind-with-reset')
      await user.type(input(), typed('git reset --soft HEAD~1'))
      expect(container.querySelectorAll('.rw-lost')).toHaveLength(1)
      expect(screen.getByText('recoverable')).toBeInTheDocument()
    })
  })
})
