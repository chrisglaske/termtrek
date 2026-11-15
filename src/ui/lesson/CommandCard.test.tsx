import { render, screen } from '@testing-library/react'
import { CommandCard, fitSize, place } from './CommandCard'

const parts = [
  { text: 'git', say: 'use Git' },
  { text: 'status', say: 'show the state' },
]

describe('CommandCard', () => {
  afterEach(() => vi.restoreAllMocks())

  it('shows no scroll hint when the command fits', () => {
    render(<CommandCard parts={parts} />)
    expect(screen.queryByText(/Scroll sideways/)).toBeNull()
  })

  /** Lays the card out: the command line is `line` px wide, the box `box` px, and a label pokes 5px past the box. */
  const layout = (line: number, box: number) => {
    const is = (el: HTMLElement, c: string) => el.classList.contains(c)
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return is(this, 'cc-line') ? line : is(this, 'cc-box') ? Math.max(line, box + 5) : 0
    })
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockImplementation(function (this: HTMLElement) {
      return is(this, 'cc-line') ? line : is(this, 'cc-box') ? box : 0
    })
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: box, height: 20, left: 0, top: 0, right: box, bottom: 20, x: 0, y: 0, toJSON: () => ({}) })
  }

  it('tells the learner to scroll when the command is wider than the card', () => {
    layout(500, 300)
    render(<CommandCard parts={parts} />)
    expect(screen.getByText(/Scroll sideways to see all of it/)).toBeInTheDocument()
  })

  it('fits the command again when extra letters are typed past its end', () => {
    layout(200, 300)
    const { rerender } = render(<CommandCard parts={parts} typed="git status" />)
    const measured = vi.mocked(HTMLElement.prototype.getBoundingClientRect)
    measured.mockClear()
    rerender(<CommandCard parts={parts} typed="git statusxx" />)
    expect(measured).toHaveBeenCalled()
  })

  it('shows no scroll hint when only a label reaches past the command', () => {
    layout(114, 116)
    render(<CommandCard parts={parts} />)
    expect(screen.queryByText(/Scroll sideways/)).toBeNull()
  })
})

describe('place', () => {
  const rect = (left: number, width: number) => ({ left, width, right: left + width }) as DOMRect
  /** Every way a label layout can go wrong: a label off its wire, off the card, on another label, or a wire through it. */
  const problems = (tokens: DOMRect[], labels: number[], width: number) => {
    const placed = place(tokens, labels, { left: 0, width } as DOMRect)
    const out: string[] = []
    for (const [i, p] of placed.entries()) {
      const w = labels[i]!
      if (p.x !== tokens[i]!.left + tokens[i]!.width / 2) out.push(`connector ${i} moved off its token`)
      if (p.x < p.left || p.x > p.left + w) out.push(`label ${i} is not under its connector`)
      if (p.left < 0 || p.left + w > width + 0.01) out.push(`label ${i} leaves the card`)
      for (const [j, q] of placed.entries()) {
        if (i === j) continue
        const v = labels[j]!
        if (q.row < p.row && p.x > q.left - 4 && p.x < q.left + v + 4) out.push(`connector ${i} runs through label ${j}`)
        if (q.row === p.row && p.left < q.left + v && q.left < p.left + w) out.push(`labels ${i} and ${j} overlap`)
      }
    }
    return out
  }

  it('keeps every connector out of the labels on the "git push -u origin main" card', () => {
    // Measured at 1280px: four tokens, two labels wider than their tokens, in a 485px card.
    const tokens = [rect(139, 72), rect(220, 18), rect(247, 54), rect(310, 36)]
    expect(problems(tokens, [110, 139, 80, 69], 485)).toEqual([])
  })

  it('picks the layout with the fewest problems when none is clean', () => {
    // Five wide labels in a 190px card: no layout is perfect, and the centred one is the worst.
    const tokens = [rect(4, 10), rect(23, 21), rect(53, 44), rect(106, 52), rect(167, 10)]
    const labels = [86, 146, 102, 51, 113]
    const clashes = problems(tokens, labels, 190).filter((p) => /runs through|overlap/.test(p))
    expect(clashes.length).toBeLessThanOrEqual(2)
  })

  it('never crosses a connector through a label when the labels fit the card', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let n = 0; n < 400; n++) {
      const count = 2 + Math.floor(rnd() * 5)
      const tokens: DOMRect[] = []
      let at = 10
      for (let i = 0; i < count; i++) {
        const w = 10 + Math.floor(rnd() * 90)
        tokens.push(rect(at, w))
        at += w + 9
      }
      const labels = tokens.map(() => 40 + Math.floor(rnd() * 130))
      // Room for each label to start at its own connector.
      const width = Math.max(at, ...tokens.map((t, i) => t.left + t.width / 2 - 6 + labels[i]!)) + 1
      expect(problems(tokens, labels, width), JSON.stringify({ tokens: tokens.map((t) => [t.left, t.width]), labels, width })).toEqual([])
    }
  })
  it('keeps connector lines out of other labels', () => {
    const origin = { left: 0, width: 300 } as DOMRect
    // The second label drops a row; the third must not sit where the second one's connector runs.
    const tokens = [rect(20, 20), rect(50, 20), rect(90, 20)]
    const labels = [40, 60, 80]
    const placed = place(tokens, labels, origin)
    for (const [i, p] of placed.entries()) {
      for (const [j, q] of placed.entries()) {
        if (i !== j && q.row < p.row) {
          expect(p.x > q.left - 4 && p.x < q.left + labels[j]! + 4).toBe(false)
        }
      }
    }
  })

  it('keeps "save what is chosen" clear of the "-m" connector on the commit page', () => {
    // git commit -m "Add meeting notes": the first label is wider than its token and reaches past "-m".
    const origin = { left: 0, width: 300 } as DOMRect
    const tokens = [rect(10, 78), rect(96, 16), rect(120, 148)]
    const labels = [105, 78, 66]
    const placed = place(tokens, labels, origin)
    for (const [i, p] of placed.entries()) {
      for (const [j, q] of placed.entries()) {
        if (i === j) continue
        const w = labels[j]!
        if (q.row < p.row) expect(p.x > q.left - 4 && p.x < q.left + w + 4, `connector ${i} runs through label ${j}`).toBe(false)
        if (q.row === p.row) expect(p.left < q.left + w && q.left < p.left + labels[i]!, `labels ${i} and ${j} overlap`).toBe(false)
      }
    }
    // Every connector still starts at its own token.
    expect(placed.map((p) => p.x)).toEqual([49, 104, 194])
  })
})

describe('fitSize', () => {
  it('keeps the normal size when the command fits', () => {
    expect(fitSize(16, 300, 485)).toBe(16)
  })

  it('shrinks a long command so it fits on one line', () => {
    // make-a-branch: the echo command is 590px of text at 16px in a 457px space.
    const size = fitSize(16, 590, 457)
    expect(size).toBeLessThan(16)
    expect((590 * size) / 16).toBeLessThanOrEqual(457)
  })

  it('never goes below 12px; the card scrolls instead', () => {
    expect(fitSize(16, 2000, 300)).toBe(12)
  })
})
