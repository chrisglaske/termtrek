import { Link } from 'react-router'
import { guides } from '../../guides/guides'
import { Nav } from '../layout/Nav'
import { useDocumentTitle } from '../layout/useDocumentTitle'
import './Guides.css'

export function GuidesIndex(): React.JSX.Element {
  useDocumentTitle('Guides · TermTrek', 'Step-by-step guides for your own computer: install Git, set your name and sign in to GitHub on macOS or Windows.')
  return (
    <>
      <Nav />
      <main id="main" className="guides-main" tabIndex={-1}>
        <h1>On your computer</h1>
        <p className="guides-lead">The course runs in your browser. These guides help you set up the real thing, on macOS or Windows.</p>
        <ul className="guides-list">
          {guides.map((g) => (
            <li key={g.id}>
              <Link to={`/guides/${g.id}`} className="guides-card">
                <span className="guides-card-title">{g.title}</span>
                <span className="guides-card-sum">{g.summary}</span>
                <span className="guides-card-min">About {g.minutes} minutes</span>
              </Link>
            </li>
          ))}
        </ul>
      </main>
    </>
  )
}
