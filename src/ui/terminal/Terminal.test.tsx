import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Terminal, type TermEntry } from './Terminal'
import { FeedbackCard } from './FeedbackCard'

const noComplete = () => ({ line: '', options: [] as string[] })

function setup(over: Partial<React.ComponentProps<typeof Terminal>> = {}) {
  const onRun = vi.fn()
  const utils = render(
    <Terminal entries={[]} cwdLabel="~/project" branch="main" onRun={onRun} onComplete={noComplete} {...over} />,
  )
  return { onRun, ...utils, input: screen.getByLabelText('Terminal input') as HTMLInputElement }
}

describe('Terminal', () => {
  it('runs a command on Enter and clears the input', async () => {
    const { onRun, input } = setup()
    await userEvent.type(input, 'git status{Enter}')
    expect(onRun).toHaveBeenCalledWith('git status')
    expect(input.value).toBe('')
  })

  it('walks history with ArrowUp and restores the draft with ArrowDown', async () => {
    const { input } = setup()
    await userEvent.type(input, 'a{Enter}b{Enter}draft')
    await userEvent.keyboard('{ArrowUp}')
    expect(input.value).toBe('b')
    await userEvent.keyboard('{ArrowUp}')
    expect(input.value).toBe('a')
    await userEvent.keyboard('{ArrowDown}{ArrowDown}')
    expect(input.value).toBe('draft')
  })

  it('keeps a blank output line visible at one line height', () => {
    const entries: TermEntry[] = [
      { prompt: { cwd: '~', branch: null }, input: 'git log', lines: [[{ text: 'a' }], [{ text: '' }], [], [{ text: 'b' }]] },
    ]
    const { container } = setup({ entries })
    const rows = [...container.querySelectorAll('.term-entry .term-line')].slice(1)
    expect(rows.map((r) => r.textContent)).toEqual(['a', '\u00a0', '\u00a0', 'b'])
  })

  it('includes inputs from entries in history', async () => {
    const entries: TermEntry[] = [{ prompt: { cwd: '~', branch: null }, input: 'ls', lines: [] }]
    const { input } = setup({ entries })
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowUp}')
    expect(input.value).toBe('ls')
  })

  it('completes with Tab and lists multiple options', async () => {
    const onComplete = vi.fn(() => ({ line: 'git status', options: [] as string[] }))
    const { input } = setup({ onComplete })
    await userEvent.type(input, 'git st{Tab}')
    expect(onComplete).toHaveBeenCalledWith('git st')
    expect(input.value).toBe('git status')
    expect(input).toHaveFocus()
  })

  it('shows options when ambiguous and hides them on next key', async () => {
    const onComplete = () => ({ line: 'git s', options: ['status', 'stash'] })
    const { input } = setup({ onComplete })
    await userEvent.type(input, 'git s{Tab}')
    expect(screen.getByText('status stash')).toBeInTheDocument()
    await userEvent.type(input, 't')
    expect(screen.queryByText('status stash')).toBeNull()
  })

  it('Ctrl+L asks the parent to clear', async () => {
    const { onRun, input } = setup()
    await userEvent.click(input)
    await userEvent.keyboard('{Control>}l{/Control}')
    expect(onRun).toHaveBeenCalledWith('clear')
  })

  it('renders past entries with prompt, with and without branch', () => {
    const entries: TermEntry[] = [
      { prompt: { cwd: '~/p', branch: 'main' }, input: 'git status', lines: [[{ text: 'On branch main' }]] },
      { prompt: { cwd: '~', branch: null }, input: 'ls', lines: [] },
    ]
    setup({ entries })
    expect(screen.getByText('~/p')).toBeInTheDocument()
    expect(screen.getByText('On branch main')).toBeInTheDocument()
    expect(document.querySelectorAll('.t-branch').length).toBe(2) // past main + live main; null branch omitted
  })

  it('renders suggestions as buttons that run, and hides the row when empty', async () => {
    const { onRun, rerender } = setup({ suggestions: ['git init'] })
    await userEvent.click(screen.getByRole('button', { name: 'git init' }))
    expect(onRun).toHaveBeenCalledWith('git init')
    rerender(<Terminal entries={[]} cwdLabel="~" branch={null} onRun={onRun} onComplete={noComplete} suggestions={[]} />)
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('feedback card pill click runs the command', async () => {
    const entries: TermEntry[] = [
      { prompt: { cwd: '~', branch: null }, input: 'git stauts', lines: [], explain: { kind: 'tip', text: 'Did you mean `git status`?' } },
    ]
    const { onRun } = setup({ entries })
    await userEvent.click(screen.getByRole('button', { name: 'git status' }))
    expect(onRun).toHaveBeenCalledWith('git status')
  })

  it('has a log region and default title', () => {
    setup()
    expect(screen.getByRole('log')).toHaveAttribute('aria-live', 'polite')
    expect(screen.getByText('Terminal')).toBeInTheDocument()
  })

  it('works with a stateful parent', async () => {
    function Host() {
      const [entries, set] = useState<TermEntry[]>([])
      return (
        <Terminal
          entries={entries}
          cwdLabel="~"
          branch={null}
          onRun={(l) => set((e) => [...e, { prompt: { cwd: '~', branch: null }, input: l, lines: [[{ text: 'ok' }]] }])}
          onComplete={noComplete}
        />
      )
    }
    render(<Host />)
    const input = screen.getByLabelText('Terminal input')
    await userEvent.type(input, 'x{Enter}')
    await userEvent.keyboard('{ArrowUp}')
    expect((input as HTMLInputElement).value).toBe('x')
  })

  it('keeps history across a parent clear', async () => {
    function Host() {
      const [entries, set] = useState<TermEntry[]>([])
      return (
        <Terminal
          entries={entries}
          cwdLabel="~"
          branch={null}
          onRun={(l) =>
            set((e) => (l === 'clear' ? [] : [...e, { prompt: { cwd: '~', branch: null }, input: l, lines: [] }]))
          }
          onComplete={noComplete}
        />
      )
    }
    render(<Host />)
    const input = screen.getByLabelText('Terminal input') as HTMLInputElement
    await userEvent.type(input, 'a{Enter}b{Enter}')
    await userEvent.keyboard('{Control>}l{/Control}')
    await userEvent.type(input, 'x{Enter}')
    await userEvent.keyboard('{ArrowUp}')
    expect(input.value).toBe('x')
    await userEvent.keyboard('{ArrowUp}')
    expect(input.value).toBe('b')
    await userEvent.keyboard('{ArrowUp}')
    expect(input.value).toBe('a')
  })

  it('records a feedback card pill click in history', async () => {
    const entries: TermEntry[] = [
      { prompt: { cwd: '~', branch: null }, input: 'git stauts', lines: [], explain: { kind: 'tip', text: 'Try `git status`' } },
    ]
    const { input } = setup({ entries })
    await userEvent.click(screen.getByRole('button', { name: 'git status' }))
    await userEvent.click(input)
    await userEvent.keyboard('{ArrowUp}')
    expect(input.value).toBe('git status')
  })

  it('has no axe violations', async () => {
    const entries: TermEntry[] = [
      { prompt: { cwd: '~', branch: null }, input: 'ls', lines: [[{ text: 'a', tone: 'muted' }]], explain: { kind: 'ok', text: 'Nice `ls`' } },
    ]
    const { container } = setup({ entries, suggestions: ['git init'] })
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})

describe('FeedbackCard', () => {
  it('labels each kind for screen readers', () => {
    const { rerender } = render(<FeedbackCard explain={{ kind: 'ok', text: 'x' }} />)
    expect(screen.getByText('Success')).toBeInTheDocument()
    rerender(<FeedbackCard explain={{ kind: 'warn', text: 'x' }} />)
    expect(screen.getByText('Warning')).toBeInTheDocument()
    rerender(<FeedbackCard explain={{ kind: 'tip', text: 'x' }} />)
    expect(screen.getByText('Tip')).toBeInTheDocument()
  })
})
