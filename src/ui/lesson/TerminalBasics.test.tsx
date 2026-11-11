import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import App from '../App'
import { findLesson } from '../../lessons/course'

function open() {
  const user = userEvent.setup()
  const utils = render(
    <MemoryRouter initialEntries={['/learn/terminal-basics']}>
      <App />
    </MemoryRouter>,
  )
  return { user, ...utils }
}

const input = () => screen.getByRole('textbox', { name: 'Terminal input' })
const continueBtn = () => screen.getByRole('button', { name: 'Continue' })

describe('Terminal basics lesson', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.useRealTimers())

  it('binds every runner step to one do page, in order', () => {
    const l = findLesson('terminal-basics')!
    expect(l.pages!.flatMap((p) => (p.kind === 'do' ? [p.step] : []))).toEqual(l.steps.map((_, i) => i))
  })

  it('shows the folder tree and a skip link to the next lesson on page 1', async () => {
    const { user, container } = open()
    expect(screen.getByRole('heading', { level: 1, name: 'Terminal basics' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Skip to What is Git\?/ })).toHaveAttribute('href', '/learn/what-is-git')
    await user.click(continueBtn())
    await user.click(continueBtn())
    expect(screen.queryByRole('link', { name: /Skip to What is Git/ })).toBeNull()
    expect(screen.getByText('you are here')).toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('shows new folders in the tree as they are made', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(
      <MemoryRouter initialEntries={['/learn/terminal-basics']}>
        <App />
      </MemoryRouter>,
    )
    const go = async (line: string) => {
      await user.type(input(), `${line}{Enter}`)
      vi.setSystemTime(Date.now() + 1000)
      await user.click(continueBtn())
    }
    await user.click(continueBtn())
    await user.click(continueBtn())
    for (const line of ['pwd', 'ls', 'cd projects', 'cd website', 'cat notes.txt']) await go(line)
    await user.type(input(), 'mkdir drafts{Enter}')
    expect(screen.getAllByText('drafts/').length).toBeGreaterThan(0)
  })
})
