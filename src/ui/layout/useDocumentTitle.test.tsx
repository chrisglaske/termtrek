import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useDocumentTitle } from './useDocumentTitle'

function Page({ title }: { title: string }) {
  useDocumentTitle(title)
  return null
}

describe('useDocumentTitle canonical', () => {
  it('points canonical and og:url at the current route', () => {
    document.head.innerHTML =
      '<link rel="canonical" href="https://termtrek.work/" /><meta property="og:url" content="https://termtrek.work/" />'
    window.history.pushState({}, '', '/guides/install-git/')
    render(<Page title="Install Git" />)
    expect(document.querySelector('link[rel="canonical"]')?.getAttribute('href')).toBe('https://termtrek.work/guides/install-git')
    expect(document.querySelector('meta[property="og:url"]')?.getAttribute('content')).toBe('https://termtrek.work/guides/install-git')
  })
})
