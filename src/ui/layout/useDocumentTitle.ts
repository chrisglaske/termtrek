import { useEffect } from 'react'

export const DEFAULT_DESCRIPTION =
  'Learn Git by using it. A free, in-browser course with a real terminal, a live repo map and a simulated team server. No account, nothing saved about you.'

function metaDescription(): HTMLMetaElement | null {
  return document.querySelector<HTMLMetaElement>('meta[name="description"]')
}

const SITE = 'https://termtrek.work'

/** The static index.html names "/" for every route; point it at the page the visitor is on. */
export function syncCanonical(pathname: string): void {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : '/'
  const url = SITE + path
  document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.setAttribute('href', url)
  document.querySelector<HTMLMetaElement>('meta[property="og:url"]')?.setAttribute('content', url)
}

export function useDocumentTitle(title: string, description?: string): void {
  useEffect(() => {
    document.title = title
    syncCanonical(window.location.pathname)
  }, [title])
  useEffect(() => {
    if (!description) return
    const meta = metaDescription()
    if (!meta) return
    meta.setAttribute('content', description)
    return () => meta.setAttribute('content', DEFAULT_DESCRIPTION)
  }, [description])
}
