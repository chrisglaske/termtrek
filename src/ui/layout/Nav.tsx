import { useState } from 'react'
import { Link } from 'react-router'
import { BackupDialog } from '../BackupDialog'
import { ThemeToggle } from '../ThemeToggle'
import { Logo } from './Logo'
import './Nav.css'

export function Nav(): React.JSX.Element {
  const [backup, setBackup] = useState(false)
  return (
    <>
      <a className="skip-link" href="#main">
        Skip to main content
      </a>
      <header className="nav">
        <nav className="nav-inner" aria-label="Main">
          <Link className="nav-logo" to="/">
            <Logo size={30} />
            <span className="nav-wordmark">TermTrek</span>{' '}
            <span className="sr-only">home</span>
          </Link>
          <Link className="nav-link" to="/learn">
            Course
          </Link>
          <div className="nav-right">
            <button type="button" className="nav-link nav-backup" onClick={() => setBackup(true)}>
              Back up progress
            </button>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      {backup && <BackupDialog onClose={() => setBackup(false)} />}
    </>
  )
}
