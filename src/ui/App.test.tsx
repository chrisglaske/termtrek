import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { MemoryRouter } from 'react-router'
import App from './App'
import { Nav } from './layout/Nav'

describe('App', () => {
  it('renders the TermTrek wordmark', () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>,
    )
    expect(screen.getAllByText('TermTrek').length).toBeGreaterThan(0)
  })
})

describe('index.html meta description', () => {
  it('has a description of 70 to 160 characters matching the runtime default', async () => {
    const { DEFAULT_DESCRIPTION } = await import('./layout/useDocumentTitle')
    const html = (await import('../../index.html?raw')).default
    const m = /<meta name="description" content="([^"]*)"/.exec(html)
    expect(m).not.toBeNull()
    const content = m?.[1] ?? ''
    expect(content.length).toBeGreaterThanOrEqual(70)
    expect(content.length).toBeLessThanOrEqual(160)
    expect(content).toBe(DEFAULT_DESCRIPTION)
  })
})

describe('Nav', () => {
  const renderNav = () =>
    render(
      <MemoryRouter>
        <Nav />
      </MemoryRouter>,
    )

  it('nav links point at the right routes', () => {
    renderNav()
    expect(screen.getByRole('link', { name: 'Home' })).toHaveAttribute('href', '/learn')
    expect(screen.getByRole('link', { name: 'Playground' })).toHaveAttribute('href', '/playground')
    expect(screen.getByRole('link', { name: 'Guides' })).toHaveAttribute('href', '/guides')
  })

  it('menu button toggles the links', async () => {
    const user = userEvent.setup()
    renderNav()
    const button = screen.getByRole('button', { name: 'Menu' })
    expect(button).toHaveAttribute('aria-expanded', 'false')
    const menuId = button.getAttribute('aria-controls') ?? ''
    expect(document.getElementById(menuId)).toContainElement(screen.getByRole('link', { name: 'Guides' }))
    await user.click(button)
    expect(button).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(button).toHaveAttribute('aria-expanded', 'false')
    expect(button).toHaveFocus()
  })

  it('axe finds no violations with the menu open', async () => {
    const user = userEvent.setup()
    const { container } = renderNav()
    await user.click(screen.getByRole('button', { name: 'Menu' }))
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
