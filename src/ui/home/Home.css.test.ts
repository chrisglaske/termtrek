import { describe, expect, it } from 'vitest'
import css from './Home.css?raw'

describe('Home.css', () => {
  it('draws the done check in the readable green, not the bright fill green', () => {
    const rule = /\.home-l\.d \.home-dot\s*\{([^}]*)\}/.exec(css)?.[1] ?? ''
    expect(rule).toContain('color: var(--ok-ink)')
    expect(rule).not.toMatch(/color:\s*var\(--ok\)/)
  })
})
