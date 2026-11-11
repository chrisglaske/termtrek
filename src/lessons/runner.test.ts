import { createWorld } from '../engine/world'
import type { Lesson } from './schema'
import { commitCount, inRepo } from './checks'
import { initRunner, runnerReducer } from './runner'
import type { RunnerAction, RunnerState } from './runner'

const lesson: Lesson = {
  id: 't',
  section: 'foundations',
  title: 'T',
  level: 'Beginner',
  minutes: 1,
  setup: {
    cwd: 'p',
    files: { 'p/a.txt': 'hi' },
    config: { 'user.name': 'Sam', 'user.email': 's@x.io' },
  },
  steps: [
    { id: 's1', title: 'Init', learn: '', task: '', hints: ['h1', 'h2'], solution: ['git init'], check: (c) => inRepo(c.world), success: 'Repo made.' },
    { id: 's2', title: 'Commit', learn: '', task: '', hints: ['h'], solution: ['git add .', 'git commit -m "Add a"'], check: (c) => commitCount(c.world) === 1, success: 'Committed.' },
  ],
}

const play = (s: RunnerState, ...a: RunnerAction[]) => a.reduce(runnerReducer, s)
const run = (line: string): RunnerAction => ({ type: 'run', line })

describe('runnerReducer', () => {
  it('walks a lesson to done', () => {
    let s = play(initRunner(lesson), run('git init'))
    expect(s.status).toBe('step-done')
    expect(s.entries[0]!.explain).toEqual({ kind: 'ok', text: 'Repo made.' })
    expect(s.entries[0]!.prompt).toEqual({ cwd: '~/p', branch: null })
    s = play(s, { type: 'next' })
    expect(s.stepIndex).toBe(1)
    expect(s.status).toBe('working')
    expect(s.ran).toEqual([])
    expect(s.entries).toHaveLength(1)
    s = play(s, run('git add .'), run('git commit -m "Add a"'))
    expect(s.status).toBe('lesson-done')
    expect(s.entries[2]!.prompt.branch).toBe('main')
  })
  it('next is a no-op unless step-done', () => {
    const s = initRunner(lesson)
    expect(runnerReducer(s, { type: 'next' })).toBe(s)
  })
  it('passes a step the learner already completed when pressing next', () => {
    let s = play(initRunner(lesson), run('git init'), run('git add .'), run('git commit -m "Add a"'))
    expect(s.status).toBe('step-done')
    s = play(s, { type: 'next' })
    expect(s.stepIndex).toBe(1)
    expect(s.status).toBe('lesson-done')
    expect(s.entries.at(-1)!.explain).toEqual({ kind: 'ok', text: 'Committed.' })
  })
  it('later runs after done just append', () => {
    let s = play(initRunner(lesson), run('git init'))
    s = play(s, run('git status'))
    expect(s.status).toBe('step-done')
    expect(s.entries[1]!.explain?.text).not.toBe('Repo made.')
  })
  it('clear empties entries', () => {
    const s = play(initRunner(lesson), run('ls'), run('clear'))
    expect(s.entries).toEqual([])
  })
  it('reset restores setup', () => {
    const s = play(initRunner(lesson), run('git init'), run('rm a.txt'), { type: 'reset' })
    expect(s.world).toEqual(createWorld(lesson.setup))
    expect(s.entries).toEqual([])
    expect(s.stepIndex).toBe(0)
  })
  it('nudge replaces the explain while the check fails', () => {
    const nudged: Lesson = {
      ...lesson,
      steps: [{ ...lesson.steps[1]!, nudge: (c) => (c.last?.exitCode === 0 ? { kind: 'warn', text: 'Not yet.' } : null) }],
    }
    let s = play(initRunner(nudged), run('git status'))
    expect(s.entries[0]!.explain?.text).not.toBe('Not yet.')
    s = play(s, run('git init'))
    expect(s.status).toBe('working')
    expect(s.entries[1]!.explain).toEqual({ kind: 'warn', text: 'Not yet.' })
    s = play(s, run('git add .'), run('git commit -m "Add a"'))
    expect(s.status).toBe('lesson-done')
    expect(s.entries[3]!.explain).toEqual({ kind: 'ok', text: 'Committed.' })
  })
  it('hint ladder is capped', () => {
    let s = initRunner(lesson)
    s = play(s, { type: 'hint' }, { type: 'hint' }, { type: 'hint' })
    expect(s.hintLevel).toBe(2)
  })
})
