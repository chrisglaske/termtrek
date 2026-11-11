import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RichText } from './RichText'
import { ThemeToggle } from './ThemeToggle'

describe('RichText', () => {
  it('renders a button pill when onCommand is given', async () => {
    const onCommand = vi.fn()
    render(<RichText text="Run `git status` now" onCommand={onCommand} />)
    await userEvent.click(screen.getByRole('button', { name: 'git status' }))
    expect(onCommand).toHaveBeenCalledWith('git status')
  })

  it('renders a code element without onCommand', () => {
    const { container } = render(<RichText text="Run `git status` now" />)
    expect(screen.queryByRole('button')).toBeNull()
    expect(container.querySelector('code.cmd')?.textContent).toBe('git status')
  })

  it('makes only runnable commands clickable', async () => {
    const onCommand = vi.fn()
    const { container } = render(<RichText text="Run `ls -a` or `git log`, then open `notes.txt` with `-m` and `.gitignore`" onCommand={onCommand} />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['ls -a', 'git log'])
    expect([...container.querySelectorAll('code.cmd')].map((c) => c.textContent)).toEqual(['notes.txt', '-m', '.gitignore'])
    await userEvent.click(screen.getByRole('button', { name: 'ls -a' }))
    expect(onCommand).toHaveBeenCalledWith('ls -a')
  })

  it('renders partial commands that end in a flag needing a value as plain code', () => {
    const { container } = render(<RichText text="Use `git commit -m` or `git config --global`, but `git diff --staged` runs" onCommand={vi.fn()} />)
    expect(screen.getAllByRole('button').map((b) => b.textContent)).toEqual(['git diff --staged'])
    expect([...container.querySelectorAll('code.cmd')].map((c) => c.textContent)).toEqual(['git commit -m', 'git config --global'])
  })

  it('renders bold and never injects HTML', () => {
    const { container } = render(<RichText text="**bold** <img src=x>" />)
    expect(container.querySelector('strong')?.textContent).toBe('bold')
    expect(container.querySelector('img')).toBeNull()
    expect(container.textContent).toContain('<img src=x>')
  })

  it('renders unclosed markers literally', () => {
    const { container } = render(<RichText text={'a `b and **c'} />)
    expect(container.querySelector('code')).toBeNull()
    expect(container.querySelector('strong')).toBeNull()
    expect(container.textContent).toBe('a `b and **c')
  })

  it('splits paragraphs and line breaks', () => {
    const { container } = render(<RichText text={'one\ntwo\n\nthree'} />)
    expect(container.querySelectorAll('p')).toHaveLength(2)
    expect(container.querySelectorAll('br')).toHaveLength(1)
  })
})

describe('ThemeToggle', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme
    localStorage.clear()
  })

  it('switches to the opposite theme', async () => {
    render(<ThemeToggle />)
    await userEvent.click(screen.getByRole('button', { name: 'Switch between light and dark theme' }))
    expect(document.documentElement.dataset.theme).toBe('dark')
    await userEvent.click(screen.getByRole('button', { name: 'Switch between light and dark theme' }))
    expect(document.documentElement.dataset.theme).toBe('light')
  })
})
