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
  it('next auto-pass uses a note entry', () => {
    const s = play(initRunner(lesson), run('git init'), run('git add .'), run('git commit -m "Add a"'), { type: 'next' })
    const entry = s.entries.at(-1)!
    expect(entry.note).toBe(true)
    expect(entry.lines).toEqual([])
    expect(entry.explain).toEqual({ kind: 'ok', text: 'Committed.' })
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
  it('code adds an open tab', () => {
    let s = play(initRunner(lesson), run('code a.txt'))
    const abs = `${s.world.home}/p/a.txt`
    expect(s.open).toEqual([abs])
    expect(s.lastOpened).toEqual({ path: abs, seq: 1 })
    s = play(s, run('code b.txt'), run('nano a.txt'))
    expect(s.open).toEqual([abs, `${s.world.home}/p/b.txt`])
    expect(s.lastOpened).toEqual({ path: abs, seq: 3 })
    s = play(s, { type: 'close-file', path: abs })
    expect(s.open).toEqual([`${s.world.home}/p/b.txt`])
    expect(play(s, { type: 'reset' }).open).toEqual([])
  })
  it('save-file writes the file and re-checks the step', () => {
    const edit: Lesson = {
      ...lesson,
      steps: [{ id: 'e', title: 'Edit', learn: '', task: '', hints: ['h'], solution: ['code a.txt'], check: (c) => c.world.files[`${c.world.home}/p/a.txt`] === 'done\n', success: 'Saved it.' }],
    }
    let s = initRunner(edit)
    const abs = `${s.world.home}/p/a.txt`
    s = play(s, run('code a.txt'), { type: 'save-file', path: abs, text: 'not yet\n' })
    expect(s.world.files[abs]).toBe('not yet\n')
    expect(s.status).toBe('working')
    expect(s.entries).toHaveLength(1)
    s = play(s, { type: 'save-file', path: abs, text: 'done\n' })
    expect(s.status).toBe('lesson-done')
    expect(s.entries).toHaveLength(2)
    expect(s.entries[1]).toMatchObject({ note: true, lines: [], explain: { kind: 'ok', text: 'Saved it.' } })
    // A new file is created on save.
    s = play(s, { type: 'save-file', path: `${s.world.home}/p/new.txt`, text: 'x' })
    expect(s.world.files[`${s.world.home}/p/new.txt`]).toBe('x')
    expect(s.entries).toHaveLength(2)
  })
  it('save-file keeps the nudge or the success as a notice for the saved path', () => {
    const edit: Lesson = {
      ...lesson,
      steps: [{
        id: 'e', title: 'Edit', learn: '', task: '', hints: ['h'], solution: ['code a.txt'],
        check: (c) => c.world.files[`${c.world.home}/p/a.txt`] === 'done\n',
        nudge: () => ({ kind: 'warn', text: 'Not quite.' }),
        success: 'Saved it.',
      }],
    }
    let s = initRunner(edit)
    const abs = `${s.world.home}/p/a.txt`
    expect(s.notice).toBeNull()
    s = play(s, run('code a.txt'), { type: 'save-file', path: abs, text: 'nope\n' })
    expect(s.notice).toEqual({ path: abs, explain: { kind: 'warn', text: 'Not quite.' } })
    expect(s.entries).toHaveLength(1)
    s = play(s, run('echo hi'))
    expect(s.notice).toBeNull()
    s = play(s, { type: 'save-file', path: abs, text: 'nope\n' }, { type: 'reset' })
    expect(s.notice).toBeNull()
    s = play(s, run('code a.txt'), { type: 'save-file', path: abs, text: 'done\n' })
    expect(s.notice).toEqual({ path: abs, explain: { kind: 'ok', text: 'Saved it.' } })
    expect(s.entries[s.entries.length - 1]).toMatchObject({ note: true, explain: { kind: 'ok', text: 'Saved it.' } })
  })
  it('next clears the editor notice', () => {
    const two: Lesson = {
      ...lesson,
      steps: [
        { id: 'a', title: 'A', learn: '', task: '', hints: ['h'], solution: [], check: (c) => c.world.files[`${c.world.home}/p/a.txt`] === 'done\n', success: 'A done.' },
        { id: 'b', title: 'B', learn: '', task: '', hints: ['h'], solution: [], check: () => false, success: 'B done.' },
      ],
    }
    const base = initRunner(two)
    const abs = `${base.world.home}/p/a.txt`
    let s = play(base, run('code a.txt'), { type: 'save-file', path: abs, text: 'done\n' })
    expect(s.notice?.path).toBe(abs)
    s = play(s, { type: 'next' })
    expect(s.notice).toBeNull()
  })
  it('editor-done finishes a commit into a note entry', () => {
    let s = play(initRunner(lesson), run('git init'), { type: 'next' }, run('git add .'), run('git commit'))
    expect(s.world.pending).toBeDefined()
    expect(s.status).toBe('working')
    // The waiting hint lives on the terminal while the editor is open, not in the log.
    expect(s.entries.at(-1)!.lines).toEqual([])
    s = play(s, { type: 'editor-done', text: 'Add a\n# ignored\n' })
    expect(s.world.pending).toBeUndefined()
    expect(s.status).toBe('lesson-done')
    const entry = s.entries.at(-1)!
    expect(entry.note).toBe(true)
    expect(entry.lines[0]!.map((x) => x.text).join('')).toMatch(/^\[main \(root-commit\) [0-9a-f]{7}\] Add a$/)
    expect(entry.explain).toEqual({ kind: 'ok', text: 'Committed.' })
  })
  it('ignores runs while the commit editor is open', () => {
    const s = play(initRunner(lesson), run('git init'), { type: 'next' }, run('git add .'), run('git commit'))
    expect(runnerReducer(s, run('git status'))).toBe(s)
  })
  it('editor-done null aborts', () => {
    let s = play(initRunner(lesson), run('git init'), { type: 'next' }, run('git add .'), run('git commit'))
    s = play(s, { type: 'editor-done', text: null })
    expect(s.world.pending).toBeUndefined()
    expect(s.status).toBe('working')
    const entry = s.entries.at(-1)!
    expect(entry.note).toBe(true)
    expect(entry.lines.map((l) => l.map((x) => x.text).join(''))).toEqual(['Aborting commit due to empty commit message.'])
    expect(entry.explain).toBeUndefined()
    // Saving the template unchanged aborts too; without a session it's a no-op.
    s = play(s, run('git commit'), { type: 'editor-done' })
    expect(s.entries.at(-1)!.lines.map((l) => l.map((x) => x.text).join(''))).toEqual(['Aborting commit due to empty commit message.'])
    expect(runnerReducer(s, { type: 'editor-done' })).toBe(s)
  })
  it('hint ladder is capped', () => {
    let s = initRunner(lesson)
    s = play(s, { type: 'hint' }, { type: 'hint' }, { type: 'hint' })
    expect(s.hintLevel).toBe(2)
  })
})
