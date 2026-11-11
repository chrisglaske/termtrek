// Phones and narrow tablets: don't pop the on-screen keyboard or jump the page on load.
export function isWide(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 980px)').matches
}
