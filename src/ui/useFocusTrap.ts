import { useEffect } from 'react'
import type { RefObject } from 'react'

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/** Keeps Tab and Shift+Tab inside `ref` while active, then returns focus to where it was. */
export function useFocusTrap(ref: RefObject<HTMLElement | null>, active: boolean,
  fallback?: RefObject<HTMLElement | null>,
): void {
  useEffect(() => {
    const root = ref.current
    if (!active || !root) return
    const before = document.activeElement
    const items = () => Array.from(root.querySelectorAll<HTMLElement>(FOCUSABLE))
    if (items().length === 0) {
      if (!root.hasAttribute('tabindex')) root.tabIndex = -1
      root.focus()
    } else items()[0]?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return
      const list = items()
      const first = list[0]
      const last = list[list.length - 1]
      if (!first || !last) {
        e.preventDefault()
        root.focus()
        return
      }
      const cur = document.activeElement
      if (e.shiftKey && (cur === first || cur === root || !root.contains(cur))) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && (cur === last || !root.contains(cur))) {
        e.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      if (before instanceof HTMLElement) before.focus()
      // The opener may be hidden by now (a closed mobile menu); focus a visible stand-in.
      if (document.activeElement !== before) fallback?.current?.focus()
    }
  }, [ref, active, fallback])
}
