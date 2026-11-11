import { useEffect } from 'react'

export const DEFAULT_DESCRIPTION =
  'Learn Git by using it. A free, in-browser course with a real terminal, a live repo map and a simulated team server. No account, nothing saved about you.'

function metaDescription(): HTMLMetaElement | null {
  return document.querySelector<HTMLMetaElement>('meta[name="description"]')
}

export function useDocumentTitle(title: string, description?: string): void {
  useEffect(() => {
    document.title = title
  }, [title])
  useEffect(() => {
    if (!description) return
    const meta = metaDescription()
    if (!meta) return
    meta.setAttribute('content', description)
    return () => meta.setAttribute('content', DEFAULT_DESCRIPTION)
  }, [description])
}
