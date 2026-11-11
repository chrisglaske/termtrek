import { act, renderHook } from '@testing-library/react'
import type { Lesson } from './schema'
import { inRepo } from './checks'
import { useLessonRunner } from './useLessonRunner'

const make = (id: string, hints: [string, ...string[]] = ['h1', 'h2']): Lesson => ({
  id,
  section: 'foundations',
  title: id,
  level: 'Beginner',
  minutes: 1,
  setup: { cwd: id, dirs: [id] },
  steps: [{ id: 's', title: 's', learn: '', task: '', hints, solution: ['git init'], check: (c) => inRepo(c.world), success: 'ok' }],
})

describe('useLessonRunner', () => {
  it('fires onLessonDone once, and again after reset and completion', () => {
    const done = vi.fn()
    const lesson = make('a')
    const { result } = renderHook(() => useLessonRunner(lesson, done))
    act(() => result.current.run('git init'))
    expect(done).toHaveBeenCalledTimes(1)
    expect(done).toHaveBeenCalledWith('a')
    act(() => result.current.run('git status'))
    expect(done).toHaveBeenCalledTimes(1)
    act(() => result.current.reset())
    act(() => result.current.run('git init'))
    expect(done).toHaveBeenCalledTimes(2)
  })

  it('follows the hint ladder', () => {
    const lesson = make('a')
    const { result } = renderHook(() => useLessonRunner(lesson, () => {}))
    expect(result.current.visibleHint).toBeNull()
    expect(result.current.showMe).toBeNull()
    act(() => result.current.hint())
    expect(result.current.visibleHint).toBe('h1')
    expect(result.current.showMe).toBeNull()
    act(() => result.current.hint())
    expect(result.current.visibleHint).toBe('h2')
    expect(result.current.showMe).toBe('git init')
  })

  it('switches to a new lesson on the same render', () => {
    const a = make('a')
    const b = make('b')
    const { result, rerender } = renderHook(({ l }) => useLessonRunner(l, () => {}), { initialProps: { l: a } })
    act(() => result.current.run('ls'))
    rerender({ l: b })
    expect(result.current.state.lesson.id).toBe('b')
    expect(result.current.state.entries).toEqual([])
  })
})
