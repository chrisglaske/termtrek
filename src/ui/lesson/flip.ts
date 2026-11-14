/**
 * Where an element rests inside `base`, measured at its center: a slide already playing on it is taken out,
 * so measuring a chip mid-flight never starts a new, bigger slide. `unit` turns the element's own
 * transform units into screen pixels (an SVG drawn larger or smaller than its viewBox).
 */
export function restingPos(el: Element, base: DOMRect, unit = 1): { left: number; top: number } {
  const r = el.getBoundingClientRect()
  let tx = 0
  let ty = 0
  if (typeof el.getAnimations === 'function' && el.getAnimations().length > 0 && typeof DOMMatrixReadOnly === 'function') {
    const t = getComputedStyle(el).transform
    if (t && t !== 'none') {
      const m = new DOMMatrixReadOnly(t)
      tx = m.e * unit
      ty = m.f * unit
    }
  }
  return { left: (r.left + r.right) / 2 - tx - base.left, top: (r.top + r.bottom) / 2 - ty - base.top }
}
