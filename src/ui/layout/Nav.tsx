import { useEffect, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router'
import { BackupDialog } from '../BackupDialog'
import { ThemeToggle } from '../ThemeToggle'
import { Logo } from './Logo'
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
            <ThemeToggle />
          </div>
        </nav>
      </header>
      {backup && <BackupDialog returnFocusTo={menuButton} onClose={() => setBackup(false)} />}
    </>
  )
}
