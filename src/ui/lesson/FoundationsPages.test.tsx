import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import App from '../App'
import { STORAGE_KEY } from '../../progress/store'
import { findLesson } from '../../lessons/course'

const CONVERTED = [
  'what-is-git',
  'introduce-yourself',
  'create-a-repo',
  'check-the-status',
  'good-messages',
  'read-the-history',
  'see-what-changed',
  'ignore-files',
]

const input = () => screen.getByRole('textbox', { name: 'Terminal input' })
const continueBtn = () => screen.getByRole('button', { name: 'Continue' })

function open(id: string) {
  return render(
    <MemoryRouter initialEntries={[`/learn/${id}`]}>
      <App />
    </MemoryRouter>,
  )
}

describe('Foundations lessons as calm pages', () => {
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
          if (page.kind === 'finish') {
            expect(screen.getByRole('heading', { level: 2, name: page.title })).toBeInTheDocument()
            break
          }
          expect(screen.getByRole('heading', { level: 2, name: page.title })).toBeInTheDocument()
          if (page.kind === 'do') {
            await user.type(input(), `${lesson.steps[page.step]!.solution[0]}{Enter}`)
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

  it('read-the-history shows the whole history as a graph, and stays accessible', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = open('read-the-history')
    await user.click(continueBtn())
    await user.type(input(), 'git log{Enter}')
    vi.setSystemTime(Date.now() + 1000)
    await user.click(continueBtn())
    expect(screen.getByRole('img', { name: /4 commits in a row/ })).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })
})
