import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import { Nav } from './Nav'
import { SOURCE_URL } from './links'

function renderNav() {
  return render(
    <MemoryRouter>
      <Nav />
    </MemoryRouter>,
  )
}

describe('Nav', () => {
  it('links to the source on GitHub', async () => {
    const { container } = renderNav()
    const link = screen.getByRole('link', { name: /source code on github/i })
    expect(link).toHaveAttribute('href', SOURCE_URL)
    expect(link).toHaveAttribute('target', '_blank')
    expect(link.getAttribute('rel')).toContain('noopener')
    expect(link).toHaveTextContent('GitHub')
    expect(await axe(container)).toHaveNoViolations()
  })

  it('closes the menu on a click or focus outside it', async () => {
    render(
      <MemoryRouter>
        <Nav />
        <button type="button">outside</button>
      </MemoryRouter>,
    )
    const menu = screen.getByRole('button', { name: 'Menu' })
    await userEvent.click(menu)
    expect(menu).toHaveAttribute('aria-expanded', 'true')
    await userEvent.click(screen.getByRole('button', { name: 'outside' }))
    expect(menu).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(menu)
    act(() => screen.getByRole('button', { name: 'outside' }).focus())
    expect(menu).toHaveAttribute('aria-expanded', 'false')
  })
})
