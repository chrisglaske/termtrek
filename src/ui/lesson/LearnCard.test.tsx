import { render, screen } from '@testing-library/react'
import type { Step } from '../../lessons/schema'
import { LearnCard } from './LearnCard'

const step: Step = {
  id: 's',
  title: 'Open a pull request',
  learn: 'Use the Remote tab.',
  task: 'Open a pull request.',
  hints: ['Look at the Remote tab.'],
  solution: ['git status'],
  check: () => false,
  success: 'Done.',
}
const props = { step, status: 'working' as const, hintLevel: 1, run() {}, hint() {}, onNext() {}, focusInTerminal: () => false }

describe('LearnCard', () => {
  it('hides Show me for panel steps', () => {
    render(<LearnCard {...props} showMe={null} />)
    expect(screen.queryByText(/^Show me/)).toBeNull()
  })
  it('shows Show me when there is a command', () => {
    render(<LearnCard {...props} showMe="git status" />)
    expect(screen.getByText(/^Show me/)).toBeInTheDocument()
  })
})
