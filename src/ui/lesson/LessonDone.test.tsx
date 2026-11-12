import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { LessonDone } from './LessonDone'
import { findLesson } from '../../lessons/course'

const show = (id: string, nextId?: string) => {
  const lesson = findLesson(id)!
  const next = nextId ? findLesson(nextId) : undefined
  render(
    <MemoryRouter>
      <LessonDone lesson={lesson} next={next} focusInTerminal={() => false} />
    </MemoryRouter>,
  )
}

describe('LessonDone', () => {
  it('offers the Playground after the last lesson of Section 4', () => {
    show('scenario-pushed-first')
    expect(screen.getByRole('link', { name: 'Keep practicing in the Playground' })).toHaveAttribute('href', '/playground')
  })

  it('does not offer the Playground after other lessons', () => {
    show('first-commit', 'good-messages')
    expect(screen.queryByRole('link', { name: /Playground/ })).toBeNull()
  })
})
