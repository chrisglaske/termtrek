import { Link } from 'react-router'
import { Nav } from './layout/Nav'
import { useDocumentTitle } from './layout/useDocumentTitle'
import './buttons.css'
import './Page.css'

export function NotFound(): React.JSX.Element {
  useDocumentTitle('Page not found · TermTrek')
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
