import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import App from '../App'
import { STORAGE_KEY } from '../../progress/store'
import { findLesson } from '../../lessons/course'

const CONVERTED = [
  'clone-a-repo',
  'push-your-work',
  'share-a-project',
  'fetch-and-pull',
  'push-a-branch',
  'open-a-pull-request',
  'merge-and-clean-up',
  'update-your-branch',
]

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

/** Does a do page's step the way a learner would: types the command, or clicks on the server's website. */
async function solve(user: User, lessonId: string, step: number) {
  const s = findLesson(lessonId)!.steps[step]!
  if (s.solve?.some((a) => a.type === 'pr-open')) return user.click(screen.getByRole('button', { name: 'Create pull request' }))
  if (s.solve?.some((a) => a.type === 'pr-merge')) return user.click(screen.getByRole('button', { name: 'Create a merge commit' }))
  await user.type(input(), typed(s.solution[0]!))
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

const side = (name: RegExp) => screen.getByRole('region', { name })

describe('Team lessons as calm pages', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
  })
  afterEach(() => vi.useRealTimers())

  for (const id of CONVERTED) {
    describe(id, () => {
      const lesson = findLesson(id)!

      it('binds every step to exactly one do page, in order, with one command each (or clicks on the server)', () => {
        const pages = lesson.pages!
        expect(pages.length).toBeGreaterThanOrEqual(6)
        expect(pages.length).toBeLessThanOrEqual(14)
        expect(new Set(pages.map((p) => p.id)).size).toBe(pages.length)
        expect(pages.at(-1)!.kind).toBe('finish')
        expect(pages.flatMap((p) => (p.kind === 'do' ? [p.step] : []))).toEqual(lesson.steps.map((_, i) => i))
        lesson.steps.forEach((s, i) => {
          const p = pages.find((x) => x.kind === 'do' && x.step === i)
          if (p?.kind !== 'do') throw new Error(`${id} step ${i} has no do page`)
          if (s.solve?.some((a) => a.type === 'pr-open' || a.type === 'pr-merge')) {
            expect(p.on, `${id} step ${i}`).toBe('server')
            expect(p.command).toEqual([])
          } else {
            expect(s.solution, `${id} step ${i}`).toHaveLength(1)
            expect(p.on).not.toBe('server')
            expect(p.command.map((c) => c.text).join(' ')).toBe(s.solution[0])
          }
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

  it('introduces the server before the clone, then shows both copies matching', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = open('clone-a-repo')
    expect(within(side(/^Your computer/)).getByText('No copy yet')).toBeInTheDocument()
    expect(within(side(/^Server/)).getByText('Add the launch date')).toBeInTheDocument()
    expect(screen.getByText('The server has 2 commits. Your computer has no copy yet.')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
    await toPage(user, 'clone-a-repo', 'Clone the project')
    await user.type(input(), typed('git clone https://git.example.com/team/notes.git'))
    expect(screen.getByText("Your main and the server's match.")).toBeInTheDocument()
  })

  it('shows origin/main lagging until the fetch, then main catching up on the pull', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    open('fetch-and-pull')
    const server = within(side(/^Server/))
    expect(server.getByText('Add the venue')).toBeInTheDocument()
    expect(server.getByText('only here')).toBeInTheDocument()
    expect(screen.getByText("The server's main has 1 commit your main does not have yet.")).toBeInTheDocument()
    await toPage(user, 'fetch-and-pull', 'Fetch')
    expect(within(side(/^Your computer/)).queryByText('Add the venue')).toBeNull()
    await user.type(input(), typed('git fetch'))
    const mine = within(side(/^Your computer/))
    expect(mine.getByText('Add the venue')).toBeInTheDocument()
    expect(mine.getByText('origin/main')).toBeInTheDocument()
    await toPage(user, 'fetch-and-pull', 'Pull')
    await user.type(input(), typed('git pull'))
    expect(screen.getByText("Your main and the server's match.")).toBeInTheDocument()
  })

  it('opens a pull request with clicks on the server page, then shows the review as a card', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const { container } = open('open-a-pull-request')
    await toPage(user, 'open-a-pull-request', 'Open a pull request')
    // No terminal on a page you pass with clicks; the heading has focus.
    expect(screen.queryByRole('textbox', { name: 'Terminal input' })).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'Open a pull request' })).toHaveFocus()
    expect(screen.getByRole('group', { name: "The server's website" })).toBeInTheDocument()
    expect(continueBtn()).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Create pull request' }))
    expect(continueBtn()).toBeEnabled()
    expect(screen.getByText(/Pull request #1 is open/)).toBeInTheDocument()
    // The site goes away once the step is done, so nothing can be merged early.
    expect(screen.queryByRole('group', { name: "The server's website" })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Create a merge commit' })).toBeNull()
    expect(await axe(container)).toHaveNoViolations()
    await toPage(user, 'open-a-pull-request', 'Alex asked for a change')
    const card = screen.getByRole('region', { name: 'Pull request #1: Add a home page' })
    expect(card).toHaveTextContent('Alex Kim asked for changes')
    expect(card).toHaveTextContent('1 commit, 1 file changed')
    await toPage(user, 'open-a-pull-request', 'Push it')
    await user.type(input(), typed('git push'))
    expect(screen.getByRole('region', { name: 'Pull request #1: Add a home page' })).toHaveTextContent('2 commits')
  })

  it('merges the pull request on the server page, then the server branch goes away', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    open('merge-and-clean-up')
    expect(screen.getByRole('region', { name: 'Pull request #1: Add a home page' })).toHaveTextContent('Alex Kim approved it')
    await toPage(user, 'merge-and-clean-up', 'Merge the pull request')
    await user.click(screen.getByRole('button', { name: 'Create a merge commit' }))
    expect(screen.getByText(/Merged on the server/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Delete branch' })).toBeNull()
    await toPage(user, 'merge-and-clean-up', 'Delete the server copy')
    expect(screen.getByText('Your computer has no homepage branch.')).toBeInTheDocument()
    await user.type(input(), typed('git push origin --delete homepage'))
    expect(screen.getByText('The server has no homepage branch.')).toBeInTheDocument()
  })

  it('shows the two copies of a rebased branch split before the safe force push', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    open('update-your-branch')
    await toPage(user, 'update-your-branch', 'Rebase rewrote your branch')
    expect(screen.getByText(/Your agenda and the server's have split: 2 commits only you have, 1 commit only the server has\./)).toBeInTheDocument()
    await toPage(user, 'update-your-branch', 'Push the rewritten branch')
    await user.type(input(), typed('git push --force-with-lease'))
    expect(screen.getByText("Your agenda and the server's match.")).toBeInTheDocument()
  })
})
