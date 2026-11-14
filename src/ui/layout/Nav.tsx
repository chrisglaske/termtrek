import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { BackupDialog } from '../BackupDialog'
import { ThemeToggle } from '../ThemeToggle'
import { Logo } from './Logo'
import { SOURCE_URL } from './links'
import './Nav.css'

export function Nav(): React.JSX.Element {
  const [backup, setBackup] = useState(false)
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  const menuButton = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    setOpen(false)
  }, [pathname])
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') {
        setOpen(false)
        menuButton.current?.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])
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
          <button
            ref={menuButton}
            type="button"
            className="nav-link nav-menu-button"
            aria-expanded={open}
            aria-controls="nav-menu"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
          <div id="nav-menu" className={open ? 'nav-menu is-open' : 'nav-menu'}>
            <Link className="nav-link" to="/learn" onClick={() => setOpen(false)}>
              Home
            </Link>
            <Link className="nav-link" to="/playground" onClick={() => setOpen(false)}>
              Playground
            </Link>
            <Link className="nav-link" to="/guides" onClick={() => setOpen(false)}>
              Guides
            </Link>
            <button
              type="button"
              className="nav-link nav-backup"
              onClick={() => {
                setOpen(false)
                setBackup(true)
              }}
            >
              Back up progress
            </button>
          </div>
          <div className="nav-right">
            <a
              className="nav-gh"
              href={SOURCE_URL}
              target="_blank"
              rel="noopener"
              aria-label="TermTrek source code on GitHub"
            >
              <svg width="17" height="17" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" focusable="false">
                <path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0 0 16 8c0-4.42-3.58-8-8-8z" />
              </svg>
              <span className="nav-gh-label">GitHub</span>
            </a>
            <ThemeToggle />
          </div>
        </nav>
      </header>
      {backup && <BackupDialog returnFocusTo={menuButton} onClose={() => setBackup(false)} />}
    </>
  )
}
