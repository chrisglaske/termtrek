import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router'

/**
 * On a new page: start at the top and move focus to the page, so the
 * visitor (and a screen reader) lands at its start. A `#hash` keeps its own
 * scrolling. This runs before the page's own effects (it renders first), so a
 * page that focuses something itself (a lesson title, the terminal) wins.
 */
export function RouteChange(): null {
  const { pathname, hash } = useLocation()
  const first = useRef(true)
  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    if (!hash) document.scrollingElement?.scrollTo?.({ top: 0, behavior: 'instant' })
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname])
  return null
}
