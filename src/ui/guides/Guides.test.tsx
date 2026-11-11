import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import App from '../App'

function at(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  )
}
const noContrast = { rules: { 'color-contrast': { enabled: false } } }

describe('guide page', () => {
  beforeEach(() => localStorage.clear())

  it('swaps steps when the system changes and does not store the choice', async () => {
    const user = userEvent.setup()
    at('/guides/install-git')
    expect(screen.getByRole('button', { name: 'macOS' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('xcode-select --install')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Windows' }))
    expect(screen.getByRole('button', { name: 'Windows' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'macOS' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.queryByText('xcode-select --install')).toBeNull()
    expect(screen.getByText('Open Git Bash')).toBeInTheDocument()
    expect(localStorage.length).toBe(0)
  })

  it('checks a step without saving it', async () => {
    const user = userEvent.setup()
    at('/guides/set-your-name')
    const box = screen.getByRole('checkbox', { name: 'Set your name' })
    expect(box).not.toBeChecked()
    await user.click(box)
    expect(box).toBeChecked()
    expect(localStorage.length).toBe(0)
  })

  it('shows the intro line, related lessons and the check', () => {
    at('/guides/sign-in-to-github')
    expect(screen.getByText('This page is not simulated. You do these steps on your own computer.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Clone a repo' })).toHaveAttribute('href', '/learn/clone-a-repo')
    expect(screen.getByRole('heading', { name: 'Check it worked' })).toBeInTheDocument()
    expect(screen.getAllByText('ssh -T git@github.com').length).toBeGreaterThan(0)
  })

  it('groups the sign-in routes and mentions the username', () => {
    at('/guides/sign-in-to-github')
    expect(screen.getByText(/Option A: HTTPS with a token/)).toBeInTheDocument()
    expect(screen.getByText(/Option B: SSH key/)).toBeInTheDocument()
    expect(screen.getByText(/enter your GitHub username/)).toBeInTheDocument()
  })

  it('has no axe violations on the index and a guide', async () => {
    const a = at('/guides')
    expect(await axe(a.container, noContrast)).toHaveNoViolations()
    a.unmount()
    const b = at('/guides/sign-in-to-github')
    expect(await axe(b.container, noContrast)).toHaveNoViolations()
  })
})
