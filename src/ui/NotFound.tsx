import { useEffect } from 'react'
import { Link } from 'react-router'
import { Nav } from './layout/Nav'
import { useDocumentTitle } from './layout/useDocumentTitle'
import './buttons.css'
import './Page.css'

export function NotFound(): React.JSX.Element {
  useDocumentTitle('Page not found · TermTrek')
  useNoIndex()
  return (
    <>
      <Nav />
      <div className="page">
        <main id="main" className="page-main" tabIndex={-1}>
          <h1>We couldn't find that page.</h1>
          <p>The link may be out of date. The course is a good place to pick up again.</p>
          <Link className="btn btn-p" to="/learn">
            Go to the course
          </Link>
        </main>
      </div>
    </>
  )
}

/**
 * The host answers unknown URLs with the app (HTTP 200), so tell search
 * engines not to index this one, and point the canonical and og:url at the home page.
 */
function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.append(meta)
    // Leaving restores both; the next page sets its own address anyway.
    const links: Array<[Element | null, string]> = [
      [document.querySelector('link[rel="canonical"]'), 'href'],
      [document.querySelector('meta[property="og:url"]'), 'content'],
    ]
    const before = links.map(([el, attr]) => el?.getAttribute(attr))
    for (const [el, attr] of links) el?.setAttribute(attr, 'https://termtrek.work/')
    return () => {
      meta.remove()
      links.forEach(([el, attr], i) => {
        const was = before[i]
        if (was != null) el?.setAttribute(attr, was)
      })
    }
  }, [])
}
