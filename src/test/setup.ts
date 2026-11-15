import '@testing-library/jest-dom/vitest'
import { beforeEach, expect, vi } from 'vitest'
import * as axeMatchers from 'vitest-axe/matchers'

expect.extend(axeMatchers)

// Pages load on demand in the app. Here they resolve before each test, so a render shows the page at once.
const pendingPages: Promise<unknown>[] = []
vi.mock('../ui/lazyRoute', async () => {
  const { createElement } = await import('react')
  return {
    lazyRoute: (load: () => Promise<{ default: React.ComponentType }>) => {
      let Page: React.ComponentType | undefined
      const loading = load().then((m) => {
        Page = m.default
      })
      pendingPages.push(loading)
      return function TestPage(props: object) {
        if (!Page) throw loading
        return createElement(Page, props)
      }
    },
  }
})
beforeEach(async () => {
  await Promise.all(pendingPages)
})
