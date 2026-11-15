const FLAG = 'reloaded'

/**
 * Reload the page once with a flag in the address, so a loop is impossible and nothing is stored.
 * Returns false (and does nothing) when the flag is already there.
 */
export function reloadOnce(href: string, go: (url: string) => void): boolean {
  const url = new URL(href)
  if (url.searchParams.has(FLAG)) return false
  url.searchParams.set(FLAG, '1')
  go(url.toString())
  return true
}

/** A page's code can vanish after a new deploy. Reload once to pick up the new version. */
export function installChunkRecovery(): void {
  window.addEventListener('vite:preloadError', (e) => {
    if (reloadOnce(window.location.href, (u) => window.location.replace(u))) e.preventDefault()
  })
  // Drop the flag once the page has been fine for a while, so a later failure may reload again.
  if (new URL(window.location.href).searchParams.has(FLAG)) {
    window.setTimeout(() => {
      const url = new URL(window.location.href)
      url.searchParams.delete(FLAG)
      window.history.replaceState(window.history.state, '', url.pathname + url.search + url.hash)
    }, 10000)
  }
}
