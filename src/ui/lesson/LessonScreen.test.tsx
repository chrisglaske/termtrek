import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import App from '../App'
import { STORAGE_KEY } from '../../progress/store'
import { allLessons, findLesson } from '../../lessons/course'
import { buildWorld } from '../../engine/setup'
import { RepoPanel } from './LessonScreen'

const course = vi.hoisted(() => ({ lastOut: false }))
vi.mock('../../lessons/course', async (orig) => {
  const m = await orig<typeof import('../../lessons/course')>()
  return { ...m, nextLesson: (id: string) => (course.lastOut ? undefined : m.nextLesson(id)) }
})

const ID = 'first-commit'

function open(id = ID) {
  const user = userEvent.setup()
  const utils = render(
    <MemoryRouter initialEntries={[`/learn/${id}`]}>
      <App />
    </MemoryRouter>,
  )
  return { user, ...utils }
}

const lesson = () => {
  const l = findLesson(ID)
  if (!l) throw new Error('lesson missing')
  return l
}
const step = (i: number) => {
  const s = lesson().steps[i]
  if (!s) throw new Error('missing step')
  return s
}
const input = () => screen.getByRole('textbox', { name: 'Terminal input' })
const nextBtn = () => screen.getByRole('button', { name: 'Next step' })

describe('LessonScreen', () => {
  beforeEach(() => {
    localStorage.clear()
    course.lastOut = false
  })

  it('shows the lesson header, step and sidebar', () => {
    open()
    expect(screen.getByText('Beginner, 5 min')).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument()
    const bar = screen.getByRole('progressbar', { name: 'Lesson progress' })
    expect(bar).toHaveAttribute('aria-valuemax', '2')
    expect(screen.getByRole('heading', { level: 2, name: step(0).title })).toBeInTheDocument()
    const course = screen.getByRole('navigation', { name: 'Course' })
    expect(within(course).getByRole('link', { name: /Your first commit/ })).toHaveAttribute('aria-current', 'page')
    expect(within(course).getAllByText('Coming next').length).toBe(2)
    expect(screen.getByRole('tab', { name: 'Your repo' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows assumes', () => {
    open('see-what-changed')
    expect(screen.getByText('Assumes: You can stage and commit changes.')).toBeInTheDocument()
  })

  it('leaves assumes out when a lesson has none', () => {
    open('what-is-git')
    expect(screen.queryByText(/^Assumes:/)).toBeNull()
  })

  it('completes a step when the solution is typed, keeping focus in the terminal', async () => {
    const { user, container } = open()
    expect(input()).toHaveFocus()
    expect(nextBtn()).toBeDisabled()
    await user.type(input(), 'git add notes.txt{Enter}')
    const ok = container.querySelector('.fb-ok')
    expect(ok).not.toBeNull()
    expect(ok).toHaveTextContent(/Ready to save/)
    expect(nextBtn()).toBeEnabled()
    expect(input()).toHaveFocus()
    expect(screen.getByText(/Press Enter in the terminal or select/)).toBeInTheDocument()
    await user.click(nextBtn())
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: step(1).title })).toBeInTheDocument()
    expect(input()).toHaveFocus()
  })

  it('advances when Enter is pressed on an empty line after a step is done', async () => {
    const { user } = open()
    await user.type(input(), 'git add notes.txt{Enter}')
    await user.keyboard('{Enter}')
    expect(screen.getByText('Step 2 of 2')).toBeInTheDocument()
    expect(input()).toHaveFocus()
    expect(screen.queryByText(/Press Enter in the terminal or select/)).toBeNull()
  })

  it('walks the hint ladder to Show me, which runs the solution', async () => {
    const { user, container } = open()
    const hints = step(0).hints
    await user.click(screen.getByRole('button', { name: 'Hint' }))
    expect(screen.getByText(hints[0])).toBeInTheDocument()
    expect(screen.queryByText(/^Show me/)).toBeNull()
    for (let i = 1; i < hints.length; i++) await user.click(screen.getByRole('button', { name: 'Hint' }))
    const row = screen.getByText(/^Show me/).closest('.showme')
    expect(row).not.toBeNull()
    await user.click(within(row as HTMLElement).getByRole('button', { name: 'git add notes.txt' }))
    const log = screen.getByRole('log')
    expect(log).toHaveTextContent('git add notes.txt')
    expect(container.querySelector('.fb-ok')).not.toBeNull()
    expect(nextBtn()).toBeEnabled()
    expect(nextBtn()).toHaveFocus()
  })

  it('runs a two-command Show me and completes the lesson', async () => {
    const { user } = open('see-what-changed')
    const last = findLesson('see-what-changed')!.steps[1]!
    await user.type(input(), 'git diff{Enter}')
    await user.click(nextBtn())
    for (let i = 0; i < last.hints.length; i++) await user.click(screen.getByRole('button', { name: 'Hint' }))
    const row = screen.getByText(/^Show me/).closest('.showme') as HTMLElement
    const cmd = last.solution.join(' && ')
    await user.click(within(row).getByRole('button', { name: cmd }))
    expect(screen.getByRole('log')).toHaveTextContent('git diff --staged')
    expect(screen.getByRole('heading', { name: 'Lesson complete' })).toHaveFocus()
  })

  it('saves completion and shows Lesson complete', async () => {
    const { user } = open()
    await user.type(input(), 'git add notes.txt{Enter}')
    await user.keyboard('{Enter}')
    await user.type(input(), 'git commit -m "Add notes"{Enter}')
    expect(screen.getByRole('heading', { name: 'Lesson complete' })).toBeInTheDocument()
    expect(input()).toHaveFocus()
    expect(screen.getByRole('status')).toHaveTextContent('Lesson complete')
    expect(screen.queryByRole('button', { name: 'Next step' })).toBeNull()
    expect(screen.getByRole('link', { name: /Next lesson/ })).toHaveAttribute('href', '/learn/good-messages')
    expect(screen.getByRole('link', { name: 'Back to course' })).toHaveAttribute('href', '/#course')
    const saved = localStorage.getItem(STORAGE_KEY) ?? ''
    expect(saved).toContain(ID)
    const course = screen.getByRole('navigation', { name: 'Course' })
    expect(within(course).getByText('(completed)')).toBeInTheDocument()
  })

  it('says so when the last lesson out is finished', async () => {
    // Typing the Show me lines only works for a lesson with no editor or Remote panel steps.
    const last = allLessons().filter((l) => l.steps.every((s) => !s.solve && s.solution.length > 0)).at(-1)!
    course.lastOut = true
    const { user } = open(last.id)
    const steps = last.steps
    for (const [i, s] of steps.entries()) {
      if (i > 0) await user.keyboard('{Enter}')
      for (const line of s.solution) await user.type(input(), `${line}{Enter}`)
    }
    expect(screen.getByRole('heading', { name: 'Lesson complete' })).toBeInTheDocument()
    expect(screen.getByText("You've finished every lesson that's out so far.")).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Next lesson/ })).toBeNull()
  })

  it('resets the lesson after confirming', async () => {
    const { user } = open()
    await user.type(input(), 'git add notes.txt{Enter}')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    await user.click(screen.getByRole('button', { name: 'Lesson options' }))
    await user.click(screen.getByRole('button', { name: 'Reset this lesson' }))
    expect(confirm).toHaveBeenCalledWith('Start this lesson over? Your progress on other lessons is kept.')
    expect(nextBtn()).toBeDisabled()
    expect(screen.getByRole('log')).not.toHaveTextContent('git add')
    confirm.mockRestore()
  })

  it('opens a file in an editor tab with code', async () => {
    const { user } = open()
    await user.type(input(), 'code notes.txt{Enter}')
    const tab = screen.getByRole('tab', { name: 'notes.txt' })
    expect(tab).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.getByRole('textbox', { name: 'Edit notes.txt' })).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(screen.queryByRole('tab', { name: 'notes.txt' })).toBeNull()
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true')
    expect(input()).toHaveFocus()
  })

  it('opens COMMIT_EDITMSG for git commit and waits for it', async () => {
    const { user } = open()
    await user.type(input(), 'git add notes.txt{Enter}')
    await user.keyboard('{Enter}')
    await user.type(input(), 'git commit{Enter}')
    expect(screen.getByRole('tab', { name: 'COMMIT_EDITMSG' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: 'Edit COMMIT_EDITMSG' })).toHaveFocus()
    await user.click(screen.getByRole('tab', { name: 'Terminal' }))
    expect(input()).toBeDisabled()
    expect(screen.getByText('hint: Waiting for your editor to close the file...')).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: 'COMMIT_EDITMSG' }))
    const msg = screen.getByRole('textbox', { name: 'Edit COMMIT_EDITMSG' })
    await user.type(msg, 'Add meeting notes')
    await user.click(screen.getByRole('button', { name: 'Save and close' }))
    expect(screen.queryByRole('tab', { name: 'COMMIT_EDITMSG' })).toBeNull()
    expect(input()).toBeEnabled()
    expect(input()).toHaveFocus()
    expect(screen.queryByText('hint: Waiting for your editor to close the file...')).toBeNull()
    expect(screen.getByRole('log')).toHaveTextContent('Add meeting notes')
    expect(screen.getByRole('heading', { name: 'Lesson complete' })).toBeInTheDocument()
  })

  it('shows the step success inside the editor tab when a Save completes the step', async () => {
    const { user } = open('merge-conflicts')
    await user.type(input(), 'git merge launch-date{Enter}')
    await user.click(nextBtn())
    await user.type(input(), 'code notes.txt{Enter}')
    await user.click(screen.getByRole('button', { name: /Keep incoming/ }))
    await user.click(screen.getByRole('button', { name: 'Save' }))
    const panel = screen.getByRole('tabpanel', { name: 'notes.txt' })
    expect(panel.querySelector('.fb-ok')).toHaveTextContent(/Conflict fixed in the file/)
    expect(within(panel).getByText(/Conflict fixed in the file/)).toBeInTheDocument()
  })

  it('keeps a file open when it is reopened after closing its tab', async () => {
    const { user } = open()
    await user.type(input(), 'code notes.txt{Enter}')
    screen.getByRole('tab', { name: 'notes.txt' }).focus()
    await user.keyboard('{Delete}')
    expect(screen.queryByRole('tab', { name: 'notes.txt' })).toBeNull()
    await user.type(input(), 'code notes.txt{Enter}')
    expect(screen.getByRole('tab', { name: 'notes.txt' })).toHaveAttribute('aria-selected', 'true')
  })

  it('shows the terminal when the Learn card runs a command, and Next focuses it', async () => {
    const { user, container } = open()
    await user.type(input(), 'code notes.txt{Enter}')
    const learn = container.querySelector('.lesson-learn') as HTMLElement
    await user.click(within(learn).getByRole('button', { name: 'git add notes.txt' }))
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true')
    expect(container.querySelector('.fb-ok')).toHaveTextContent(/Ready to save/)
    await user.click(screen.getByRole('tab', { name: 'notes.txt' }))
    await user.click(nextBtn())
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true')
    expect(input()).toHaveFocus()
  })

  it('sends Learn card commands to the open commit message instead of the log', async () => {
    const { user, container } = open()
    await user.type(input(), 'git add notes.txt{Enter}')
    await user.keyboard('{Enter}')
    await user.type(input(), 'git commit{Enter}')
    await user.click(screen.getByRole('tab', { name: 'Terminal' }))
    const count = container.querySelectorAll('.term-entry').length
    const learn = container.querySelector('.lesson-learn') as HTMLElement
    await user.click(within(learn).getByRole('button', { name: 'git commit -m "Add meeting notes"' }))
    expect(container.querySelectorAll('.term-entry')).toHaveLength(count)
    expect(screen.getByRole('tab', { name: 'COMMIT_EDITMSG' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('textbox', { name: 'Edit COMMIT_EDITMSG' })).toHaveFocus()
  })

  it('moves between workspace tabs with the arrow keys', async () => {
    const { user } = open()
    await user.type(input(), 'code notes.txt{Enter}')
    screen.getByRole('tab', { name: 'notes.txt' }).focus()
    await user.keyboard('{ArrowLeft}')
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveFocus()
    expect(screen.getByRole('tab', { name: 'Terminal' })).toHaveAttribute('aria-selected', 'true')
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'notes.txt' })).toHaveAttribute('aria-selected', 'true')
  })

  it('has no axe violations', async () => {
    const { container } = open()
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})

describe('RepoPanel Remote tab', () => {
  const config = { 'user.name': 'Sam', 'user.email': 's@x.com' }
  const SERVER = { slug: 'team/notes', commits: [{ message: 'Add notes', files: { 'notes.txt': 'one\n' } }] }

  it('no Remote tab without a server', () => {
    render(<RepoPanel world={buildWorld({ config, run: [] })} />)
    expect(screen.getAllByRole('tab')).toHaveLength(1)
    expect(screen.queryByRole('tab', { name: /Remote/ })).toBeNull()
  })

  it('Remote tab with arrow-key navigation', async () => {
    const user = userEvent.setup()
    render(<RepoPanel world={buildWorld({ config, remote: SERVER, run: [] })} />)
    const repo = screen.getByRole('tab', { name: 'Your repo' })
    const remote = screen.getByRole('tab', { name: 'Remote' })
    expect(repo).toHaveAttribute('tabindex', '0')
    expect(remote).toHaveAttribute('tabindex', '-1')
    repo.focus()
    await user.keyboard('{ArrowRight}')
    expect(remote).toHaveFocus()
    expect(remote).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByText('team/notes')).toBeInTheDocument()
    await user.keyboard('{ArrowRight}')
    expect(repo).toHaveFocus()
    await user.keyboard('{ArrowLeft}')
    expect(remote).toHaveFocus()
  })

  it('activity dot appears after a step event and clears when the tab is opened', async () => {
    const user = userEvent.setup()
    const w = buildWorld({ config, remote: SERVER, run: [] })
    const { rerender } = render(<RepoPanel world={w} />)
    expect(screen.queryByRole('img', { name: 'new activity' })).toBeNull()
    const r = w.remote!
    const next = { ...w, remote: { ...r, activity: [...r.activity, { seq: 9, who: 'teammate' as const, text: '**Alex Kim** pushed' }] } }
    rerender(<RepoPanel world={next} />)
    expect(screen.getByRole('img', { name: 'new activity' })).toBeInTheDocument()
    await user.click(screen.getByRole('tab', { name: /Remote/ }))
    expect(screen.queryByRole('img', { name: 'new activity' })).toBeNull()
    expect(screen.getByText('Alex Kim', { selector: 'strong' })).toBeInTheDocument()
  })

  it('activity dot ignores the learner\'s own events', () => {
    const w = buildWorld({ config, remote: SERVER, run: [] })
    const { rerender } = render(<RepoPanel world={w} />)
    const r = w.remote!
    const yours = { ...w, remote: { ...r, activity: [...r.activity, { seq: 8, who: 'you' as const, text: 'You pushed' }] } }
    rerender(<RepoPanel world={yours} />)
    expect(screen.queryByRole('img', { name: 'new activity' })).toBeNull()
    const theirs = { ...w, remote: { ...r, activity: [...yours.remote.activity, { seq: 9, who: 'teammate' as const, text: '**Alex Kim** pushed' }] } }
    rerender(<RepoPanel world={theirs} />)
    expect(screen.getByRole('img', { name: 'new activity' })).toBeInTheDocument()
  })
})
