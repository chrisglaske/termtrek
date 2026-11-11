import { Fragment, useLayoutEffect, useRef, useState } from 'react'
import type { CommandPart } from '../../lessons/schema'

interface Placed {
  /** Centre of the token, where the connector starts. */
  x: number
  /** Left edge of the label, kept inside the card. */
  left: number
  /** Which row of labels (0 = closest), so wide labels never overlap. */
  row: number
}

const ROW_H = 24
const GAP = 10
const LINE = 12

/**
 * Places each label under its token, pushing a label to a lower row when it would touch another label
 * or when a connector line would have to run through a label.
 */
export function place(tokens: DOMRect[], labels: number[], origin: DOMRect): Placed[] {
  const done: Array<Placed & { w: number }> = []
  tokens.forEach((t, i) => {
    const w = labels[i] ?? 0
    const x = t.left - origin.left + t.width / 2
    const left = Math.max(0, Math.min(x - w / 2, origin.width - w))
    let row = 0
    let free = -1
    // Rows past the number of labels placed so far cannot help.
    for (; row <= done.length; row++) {
      const touches = done.some((d) => d.row === row && left < d.left + d.w + GAP && d.left < left + w + GAP)
      if (touches) continue
      if (free < 0) free = row
      // This connector runs through every row above its label; it must miss the labels there.
      const wireHits = done.some((d) => d.row < row && x > d.left - 4 && x < d.left + d.w + 4)
      // An earlier, lower connector must not run through this label.
      const lowerWire = done.some((d) => d.row > row && d.x > left - 4 && d.x < left + w + 4)
      if (!wireHits && !lowerWire) break
    }
    // When no row is clear of every connector, take the nearest row that at least keeps labels apart.
    if (row > done.length) row = free
    done.push({ x, left, row, w })
  })
  return done.map(({ x, left, row }) => ({ x, left, row }))
}

/** The command exactly as it is typed, on one line, with what each part means written under it. */
export function CommandCard({ parts }: { parts: CommandPart[] }): React.JSX.Element {
  const boxRef = useRef<HTMLDivElement>(null)
  const [placed, setPlaced] = useState<Placed[] | null>(null)
  const [minW, setMinW] = useState(0)
  const [scrolls, setScrolls] = useState(false)
  const full = parts.map((p) => p.text).join(' ')

  useLayoutEffect(() => {
    const box = boxRef.current
    if (!box) return
    const measure = () => {
      const origin = box.getBoundingClientRect()
      const toks = Array.from(box.querySelectorAll<HTMLElement>('.cc-tok')).map((el) => el.getBoundingClientRect())
      const widths = Array.from(box.querySelectorAll<HTMLElement>('.cc-say')).map((el) => el.offsetWidth)
      if (origin.width === 0) return
      // A label wider than the command itself widens the box so it is never clipped.
      setMinW(Math.max(0, ...widths))
      setPlaced(place(toks, widths, origin))
      setScrolls(box.scrollWidth > box.clientWidth + 1)
    }
    measure()
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null
    ro?.observe(box)
    void document.fonts?.ready.then(measure)
    return () => ro?.disconnect()
  }, [full])

  const rows = placed ? Math.max(...placed.map((p) => p.row)) + 1 : 1
  return (
    <div className="cc">
      <p className="cc-k">Type this, then press Enter</p>
      <div className="cc-box" ref={boxRef} style={minW ? { minWidth: minW } : undefined}>
        <code className="cc-line" aria-label={full}>
          {parts.map((p, i) => (
            <Fragment key={i}>
              {i > 0 && ' '}
              <span className="cc-tok">{p.text}</span>
            </Fragment>
          ))}
        </code>
        <ul className={placed ? 'cc-says' : 'cc-says cc-flow'} aria-label="What each part means" style={placed ? { height: LINE + rows * ROW_H } : undefined}>
          {parts.map((p, i) => {
            const at = placed?.[i]
            const top = at ? LINE + at.row * ROW_H : 0
            return (
              <li key={i}>
                {at && <i className="cc-wire" aria-hidden="true" style={{ left: at.x, height: top + 2 }} />}
                <span className="cc-say" style={at ? { left: at.left, top } : undefined}>
                  <span className="sr-only">{p.text}: </span>
                  {p.say}
                </span>
              </li>
            )
          })}
        </ul>
      </div>
      {scrolls && <p className="cc-more">The command is wider than the screen. Scroll sideways to see all of it.</p>}
    </div>
  )
}
