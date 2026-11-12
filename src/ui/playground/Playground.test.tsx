import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import App from '../App'
import { STORAGE_KEY } from '../../progress/store'

function open() {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/playground']}>
      <App />
    </MemoryRouter>,
  )
  return user
}
const input = () => screen.getByRole('textbox', { name: 'Terminal input' })
const map = () => screen.getByRole('img', { name: /commits? on/ })

async function type(user: ReturnType<typeof userEvent.setup>, line: string) {
  await user.type(input(), `${line}{Enter}`)
}

describe('Playground', () => {
  beforeEach(() => localStorage.clear())

  it('playground renders with a terminal and the repo map', () => {
    open()
    expect(document.title).toBe('Playground · TermTrek')
    expect(input()).toBeInTheDocument()
    expect(map()).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'Remote' })).toBeInTheDocument()
  })

  it('playground reset restores the start', async () => {
    const user = open()
    await type(user, 'git switch -c scratch')
    expect(map().getAttribute('aria-label')).toContain('scratch')
    await user.click(screen.getByRole('button', { name: 'Reset' }))
    expect(map().getAttribute('aria-label')).not.toContain('scratch')
    expect(map().getAttribute('aria-label')).toMatch(/on main\./)
  })

  it('playground never records progress', async () => {
    const user = open()
    await type(user, 'git status')
    await type(user, '')
    const raw = localStorage.getItem(STORAGE_KEY)
    expect(raw === null || !('playground' in (JSON.parse(raw).completed ?? {}))).toBe(true)
  })

  it('suggested pill runs its command', async () => {
    const user = open()
    await user.click(screen.getByRole('button', { name: 'git switch -c idea' }))
    expect(map().getAttribute('aria-label')).toContain('idea')
  })
})
