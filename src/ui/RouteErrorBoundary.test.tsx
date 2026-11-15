import { render, screen } from '@testing-library/react'
import { lazy, Suspense } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { RouteErrorBoundary } from './RouteErrorBoundary'
import { reloadOnce } from './chunkRecovery'

describe('RouteErrorBoundary', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows a calm message with a Reload button when a page fails to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const Broken = lazy(() => Promise.reject(new Error('Failed to fetch dynamically imported module')))
    render(
      <RouteErrorBoundary>
        <Suspense fallback={<p>loading</p>}>
          <Broken />
        </Suspense>
      </RouteErrorBoundary>,
    )
    expect(await screen.findByRole('button', { name: 'Reload' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(/updated|could not load/i)
  })
})

describe('reloadOnce', () => {
  it('reloads with a flag in the address, and never twice', () => {
    const go = vi.fn()
    expect(reloadOnce('https://termtrek.work/learn', go)).toBe(true)
    expect(go).toHaveBeenCalledWith('https://termtrek.work/learn?reloaded=1')
    go.mockClear()
    expect(reloadOnce('https://termtrek.work/learn?reloaded=1', go)).toBe(false)
    expect(go).not.toHaveBeenCalled()
  })
})
