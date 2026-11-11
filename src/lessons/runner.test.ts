import type { World } from '../engine/types'
import { createWorld } from '../engine/world'
import type { Lesson } from './schema'
import { commitCount, inRepo } from './checks'
import { initRunner, runnerReducer } from './runner'
import { teammatePush } from '../engine/remote/teammate'
import { TEAMMATE } from './sample'
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

  describe('team actions', () => {
    const teamLesson: Lesson = {
      id: 'team',
      section: 'team',
      title: 'Team',
      level: 'Intermediate',
      minutes: 1,
      setup: {
        config: { 'user.name': 'Sam', 'user.email': 's@x.io' },
        remote: { slug: 'team/notes', commits: [{ message: 'Add notes', files: { 'notes.txt': 'one\n' } }] },
        run: [teammatePush({ branch: 'topic', message: 'Topic', files: { 'a.txt': '1' }, author: TEAMMATE })],
      },
      steps: [
        { id: 'a', title: 'Open', learn: '', task: '', hints: ['h'], solution: [], check: (c) => (c.world.remote?.prs.length ?? 0) === 1, success: 'Opened.' },
        {
          id: 'b',
          title: 'Event',
          learn: '',
          task: '',
          hints: ['h'],
          solution: [],
          event: {
            apply: teammatePush({ branch: 'main', message: 'Hello', files: { 'h.txt': '1' }, author: TEAMMATE }),
            note: 'Alex pushed to main.',
          },
          check: (c) => c.world.remote?.prs[0]?.state === 'merged',
          success: 'Merged.',
        },
      ],
    }
    const open: RunnerAction = { type: 'pr-open', head: 'topic', base: 'main', title: 'T', body: '' }

    it('pr-open action passes a step', () => {
      const s = play(initRunner(teamLesson), open)
      expect(s.status).toBe('step-done')
      expect(s.remoteError).toBeNull()
      const entry = s.entries.at(-1)!
      expect(entry.note).toBe(true)
      expect(entry.explain).toEqual({ kind: 'ok', text: 'Opened.' })
    })
    it('pr-open error sets remoteError and run clears it', () => {
      let s = play(initRunner(teamLesson), { ...open, head: 'nope' } as RunnerAction)
      expect(s.remoteError).toBe("Push **nope** first: the server doesn't have that branch yet.")
      expect(s.status).toBe('working')
      s = play(s, run('pwd'))
      expect(s.remoteError).toBeNull()
    })
    it('next and reset clear remoteError', () => {
      let s = play(initRunner(teamLesson), open, { type: 'pr-open', head: 'x', base: 'main', title: 'T', body: '' })
      expect(s.remoteError).not.toBeNull()
      expect(play(s, { type: 'next' }).remoteError).toBeNull()
      expect(play(s, { type: 'reset' }).remoteError).toBeNull()
    })
    it('step event applies on start and on next', () => {
      let s = play(initRunner(teamLesson), open)
      const mainBefore = s.world.remote!.branches['main']
      s = play(s, { type: 'next' })
      expect(s.world.remote!.branches['main']).not.toBe(mainBefore)
      expect(s.stepStart.remote!.branches['main']).toBe(s.world.remote!.branches['main'])
      const entry = s.entries.at(-1)!
      expect(entry.note).toBe(true)
      expect(entry.explain).toEqual({ kind: 'tip', text: 'Alex pushed to main.' })
      expect(s.status).toBe('working')
    })
    it('pr-merge and remote-delete-branch actions', () => {
      let s = play(initRunner(teamLesson), open, { type: 'next' }, { type: 'pr-merge', number: 1 })
      expect(s.status).toBe('lesson-done')
      s = play(s, { type: 'remote-delete-branch', name: 'main' })
      expect(s.remoteError).toBe('**main** is the default branch.')
      s = play(s, { type: 'remote-delete-branch', name: 'topic' })
      expect(s.remoteError).toBeNull()
      expect(s.world.remote!.branches['topic']).toBeUndefined()
    })
    it('step 0 event that already satisfies the check passes the step', () => {
      const step = { ...teamLesson.steps[1]!, id: 'y', check: (c: { world: World }) => c.world.remote!.activity.length > 0 }
      const s = initRunner({ ...teamLesson, steps: [step, teamLesson.steps[0]!] })
      expect(s.status).toBe('step-done')
      expect(s.entries.map((e) => e.explain)).toEqual([{ kind: 'tip', text: 'Alex pushed to main.' }, { kind: 'ok', text: 'Merged.' }])
    })
    it('reset replays step 0 event', () => {
      const first: Lesson = { ...teamLesson, steps: [{ ...teamLesson.steps[1]!, id: 'z' }, teamLesson.steps[0]!] }
      const s = initRunner(first)
      expect(s.world.remote!.activity.at(-1)!.text).toBe('**Alex Kim** pushed 1 commit to **main**')
      expect(s.stepStart).toBe(s.world)
      expect(s.entries[0]!.explain).toEqual({ kind: 'tip', text: 'Alex pushed to main.' })
      const r = play(s, { type: 'reset' })
      expect(r.world.remote!.activity).toEqual(s.world.remote!.activity)
      expect(r.entries).toHaveLength(1)
    })
  })
})
