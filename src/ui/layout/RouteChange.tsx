import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router'

/**
 * On a new page: start at the top and move focus to the page, so the
 * visitor (and a screen reader) lands at its start. Back and Forward keep the
 * browser's own scroll position, and a `#hash` keeps its own scrolling and
 * focus. This runs before the page's own effects (it renders first), so a
 * page that focuses something itself (a lesson title, the terminal) wins.
 */
export function RouteChange(): null {
  const { pathname, hash } = useLocation()
  const how = useNavigationType()
  // Compare with the last page rather than "first run": StrictMode runs effects twice.
  const last = useRef(pathname)
  useEffect(() => {
    if (last.current === pathname) return
    last.current = pathname
    if (hash) return
    if (how !== 'POP') document.scrollingElement?.scrollTo?.({ top: 0, behavior: 'instant' })
    document.getElementById('main')?.focus({ preventScroll: true })
  }, [pathname, hash, how])
  return null
}
