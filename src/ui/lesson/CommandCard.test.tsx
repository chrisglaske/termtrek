import { render, screen } from '@testing-library/react'
import { CommandCard } from './CommandCard'

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
