import { course } from './course'
import { courseStats, formatHours, formatHoursShort, sectionStats } from './courseStats'

describe('courseStats', () => {
  const live = course.filter((s) => s.status === 'launch')
  const sum = (f: (s: (typeof course)[number]) => number) => live.reduce((n, s) => n + f(s), 0)

  it('sums lessons and minutes over the launch sections only', () => {
    const stats = courseStats()
    expect(stats.lessons).toBe(sum((s) => s.lessons.length))
    expect(stats.minutes).toBe(sum((s) => s.lessons.reduce((m, l) => m + l.minutes, 0)))
    expect(stats.live).toBe(live.length)
    expect(stats.later).toBe(course.length - live.length)
    expect(stats.live).toBe(4)
    expect(stats.later).toBe(2)
  })

  it('counts one section', () => {
    const s = course[0]!
    expect(sectionStats(s)).toEqual({
      lessons: s.lessons.length,
      minutes: s.lessons.reduce((m, l) => m + l.minutes, 0),
    })
  })

  it('formats long text', () => {
    expect(formatHours(210)).toBe('about 3.5 hours')
    expect(formatHours(57)).toBe('about 57 min')
    expect(formatHours(120)).toBe('about 2 hours')
    expect(formatHours(90)).toBe('about 1.5 hours')
    expect(formatHours(100)).toBe('about 1.5 hours')
  })

  it('formats the short stat', () => {
    expect(formatHoursShort(210)).toBe('~3.5 h')
    expect(formatHoursShort(120)).toBe('~2 h')
    expect(formatHoursShort(57)).toBe('~57 min')
    expect(formatHoursShort(89)).toBe('~89 min')
    expect(formatHoursShort(90)).toBe('~1.5 h')
  })
})
