import { Component } from 'react'
import type { ReactNode } from 'react'
import './RouteErrorBoundary.css'

/** Catches a page that fails to load (for example after a new version went live) and offers a reload. */
export class RouteErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError(): { failed: boolean } {
    return { failed: true }
  }

  render(): ReactNode {
    if (!this.state.failed) return this.props.children
    return (
      <main id="main" className="reb" tabIndex={-1}>
        <h1>TermTrek was updated</h1>
        <p>This page could not load, most likely because a newer version is out. Reload to get it.</p>
        <button type="button" className="reb-btn" onClick={() => window.location.reload()}>
          Reload
        </button>
      </main>
    )
  }
}
