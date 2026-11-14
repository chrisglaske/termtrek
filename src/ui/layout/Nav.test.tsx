import { render, screen } from '@testing-library/react'
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
})
