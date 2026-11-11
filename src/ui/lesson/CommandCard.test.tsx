import { render, screen } from '@testing-library/react'
import { CommandCard, place } from './CommandCard'

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

  it('tells the learner to scroll when the command is wider than the card', () => {
    vi.spyOn(HTMLElement.prototype, 'scrollWidth', 'get').mockReturnValue(500)
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(300)
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockReturnValue({ width: 300, height: 20, left: 0, top: 0, right: 300, bottom: 20, x: 0, y: 0, toJSON: () => ({}) })
    render(<CommandCard parts={parts} />)
    expect(screen.getByText(/Scroll sideways to see all of it/)).toBeInTheDocument()
  })
})

describe('place', () => {
  const rect = (left: number, width: number) => ({ left, width, right: left + width }) as DOMRect
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
})
