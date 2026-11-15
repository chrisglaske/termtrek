import { course } from './course'
import { outline } from './outline'

describe('outline', () => {
  it('matches the course it summarises', () => {
    expect(outline).toEqual(
      course.map((s) => ({
        id: s.id,
        title: s.title,
        summary: s.summary,
        commands: s.commands,
        status: s.status,
        lessons: s.lessons.length,
        minutes: s.lessons.reduce((m, l) => m + l.minutes, 0),
      })),
    )
  })
})
