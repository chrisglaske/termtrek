import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import App from '../App'
import { STORAGE_KEY } from '../../progress/store'
import { findLesson } from '../../lessons/course'

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
  beforeEach(() => localStorage.clear())

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
    const { user } = open('start-a-project')
    const steps = findLesson('start-a-project')!.steps
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

  it('has no axe violations', async () => {
    const { container } = open()
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
