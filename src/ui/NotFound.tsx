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
 * engines not to index this one, and point the canonical at the home page.
 */
function useNoIndex(): void {
  useEffect(() => {
    const meta = document.createElement('meta')
    meta.name = 'robots'
    meta.content = 'noindex'
    document.head.append(meta)
    const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')
    const before = canonical?.getAttribute('href')
    canonical?.setAttribute('href', 'https://termtrek.work/')
    return () => {
      meta.remove()
      if (before != null) canonical?.setAttribute('href', before)
    }
  }, [])
}
