export type ThemePref = 'light' | 'dark' | 'system'

const KEY = 'termtrek.theme'

function isPref(v: unknown): v is ThemePref {
  return v === 'light' || v === 'dark' || v === 'system'
}

export function getThemePref(storage?: Storage): ThemePref {
  try {
    const v = (storage ?? window.localStorage).getItem(KEY)
    return isPref(v) ? v : 'system'
  } catch {
    return 'system'
  }
}

export function setThemePref(pref: ThemePref, storage?: Storage): void {
  const root = document.documentElement
  if (pref === 'system') delete root.dataset.theme
  else root.dataset.theme = pref
  try {
    const s = storage ?? window.localStorage
    if (pref === 'system') s.removeItem(KEY)
    else s.setItem(KEY, pref)
  } catch {
    // storage unavailable (privacy mode): the choice just won't persist
  }
}

export function effectiveTheme(pref: ThemePref): 'light' | 'dark' {
  if (pref !== 'system') return pref
  try {
    return typeof window.matchMedia === 'function' && window.matchMedia('(prefers-color-scheme: dark)').matches
      ? 'dark'
      : 'light'
  } catch {
    return 'light'
  }
}
