import { tokenize } from '../engine/tokenize'
import { course, allLessons, findLesson } from './course'
import { initRunner, runnerReducer } from './runner'
import type { RunnerState } from './runner'
import type { Lesson } from './schema'

const lessonById = (id: string): Lesson => {
  const l = findLesson(id)
  if (!l) throw new Error(`missing lesson ${id}`)
  return l
}

/** Run each line; when a step completes, move to the next one. */
function play(lesson: Lesson, lines: string[]): RunnerState {
  let s = initRunner(lesson)
  for (const line of lines) {
    s = runnerReducer(s, { type: 'run', line })
    if (s.status === 'step-done') s = runnerReducer(s, { type: 'next' })
  }
  return s
}

const words = (span: string): string[] => {
  const t = tokenize(span)
  return t.ok ? t.tokens.flatMap((x) => (x.kind === 'word' ? [x.value] : [])) : []
}

/** `git status -s` -> `git status`; `echo hi > a` -> `echo`. */
const commandName = (line: string): string => {
  const w = words(line)
  return w[0] === 'git' ? w.slice(0, 2).join(' ') : (w[0] ?? '')
}

const spans = (text: string): string[] => [...text.matchAll(/`([^`]+)`/g)].map((m) => m[1]!)

describe('course content', () => {
  it('has the six sections with the landing page titles', () => {
    expect(course.map((s) => s.title)).toEqual([
      'Foundations',
      'Fixing mistakes',
      'Branching',
      'Working with a team',
      'Pro skills',
      'Automation',
    ])
    expect(course[0]!.lessons.map((l) => l.id)).toEqual([
      'what-is-git',
      'introduce-yourself',
      'create-a-repo',
      'check-the-status',
      'first-commit',
      'good-messages',
      'read-the-history',
      'see-what-changed',
      'ignore-files',
      'start-a-project',
    ])
  })

  describe('solvable', () => {
    for (const lesson of allLessons()) {
      it(lesson.id, () => {
        let s = initRunner(lesson)
        lesson.steps.forEach((step, i) => {
          for (const line of step.solution) s = runnerReducer(s, { type: 'run', line })
          const last = i === lesson.steps.length - 1
          expect(s.status, `${lesson.id} / ${step.id}`).toBe(last ? 'lesson-done' : 'step-done')
          if (!last) s = runnerReducer(s, { type: 'next' })
        })
      })
    }
  })

  describe('solvable with alternatives', () => {
    const cases: string[][] = [
      ['git add .', 'git commit -m "Add notes"'],
      // One line does both steps; any next command confirms the second step.
      ["git add -A && git commit -m 'Add notes'", 'git status'],
      ['git add notes.txt', 'git commit -am "Add notes"'],
    ]
    for (const lines of cases) {
      it(`first-commit: ${lines.join(' / ')}`, () => {
        expect(play(lessonById('first-commit'), lines).status).toBe('lesson-done')
      })
    }
    it('check-the-status accepts git status -s and git add .', () => {
      expect(play(lessonById('check-the-status'), ['git status -s', 'git add .']).status).toBe('lesson-done')
    })
    it('create-a-repo accepts cd ~/project', () => {
      expect(play(lessonById('create-a-repo'), ['cd ~/project', 'git init']).status).toBe('lesson-done')
    })
    it('read-the-history accepts git log -n 2', () => {
      expect(play(lessonById('read-the-history'), ['git log', 'git log -n 2']).status).toBe('lesson-done')
    })
    it('see-what-changed accepts git diff --cached', () => {
      expect(play(lessonById('see-what-changed'), ['git diff', 'git add .', 'git diff --cached']).status).toBe('lesson-done')
    })
    it('ignore-files accepts a *.log pattern and git add .', () => {
      const lines = ['echo .env > .gitignore', "echo '*.log' >> .gitignore", 'git add .', 'git commit -m "Ignore secrets and logs"']
      expect(play(lessonById('ignore-files'), lines).status).toBe('lesson-done')
    })
  })

  it('has unique ids, sensible minutes and hints on every step', () => {
    const ids = allLessons().map((l) => l.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const l of allLessons()) {
      expect(l.minutes).toBeGreaterThanOrEqual(2)
      expect(l.minutes).toBeLessThanOrEqual(10)
      expect(l.steps.length).toBeGreaterThanOrEqual(2)
      expect(l.steps.length).toBeLessThanOrEqual(5)
      const stepIds = l.steps.map((s) => s.id)
      expect(new Set(stepIds).size).toBe(stepIds.length)
      for (const s of l.steps) expect(s.hints.length).toBeGreaterThanOrEqual(1)
    }
  })

  it('sets assumes on every lesson after the first', () => {
    allLessons()
      .slice(1)
      .forEach((l) => expect(l.assumes, l.id).toBeTruthy())
  })

  it('puts every git command in backticks', () => {
    const bare = /(^|[^`])\bgit (init|status|add|commit|log|diff|config)\b/
    for (const l of allLessons()) {
      for (const s of l.steps) {
        for (const text of [s.learn, s.task, ...s.hints, s.success]) {
          expect(text, `${l.id} / ${s.id}`).not.toMatch(bare)
        }
      }
    }
  })

  it('never asks for a command before showing it (show, then fade)', () => {
    const shown = new Set<string>()
    for (const l of allLessons()) {
      for (const s of l.steps) {
        for (const span of spans(s.learn)) shown.add(commandName(span))
        for (const line of s.solution) {
          for (const seg of line.split('&&')) {
            expect(shown.has(commandName(seg)), `${l.id} / ${s.id}: \`${seg.trim()}\` not shown yet`).toBe(true)
          }
        }
      }
    }
  })

  it('good-messages rejects "Added stuff" and explains why', () => {
    const s = play(lessonById('good-messages'), ['git add README.md', 'git commit -m "Added stuff"'])
    expect(s.stepIndex).toBe(1)
    expect(s.status).toBe('working')
    const explain = s.entries.at(-1)!.explain
    expect(explain?.kind).toBe('warn')
    expect(explain?.text).toContain('Write it as a command: `Add`, not `Added`.')
  })

  it('see-what-changed points to --staged when the learner stages first', () => {
    let s = play(lessonById('see-what-changed'), ['git add notes.txt', 'git diff'])
    expect(s.status).toBe('working')
    expect(s.entries.at(-1)!.explain?.text).toContain('`git diff --staged`')
    s = play(lessonById('see-what-changed'), ['git add notes.txt', 'git diff', 'git diff --staged', 'git diff --staged'])
    expect(s.status).toBe('lesson-done')
  })

  it('start-a-project warns when the repo is started in the wrong folder', () => {
    const s = play(lessonById('start-a-project'), [
      'git config --global user.name "Sam Rivera"',
      'git config --global user.email "sam@example.com"',
      'git init',
    ])
    expect(s.status).toBe('working')
    expect(s.entries.at(-1)!.explain).toMatchObject({ kind: 'warn' })
    expect(s.entries.at(-1)!.explain?.text).toContain('Reset this lesson')
  })

  it('ignore-files warns when a secret is staged', () => {
    const s = play(lessonById('ignore-files'), ['git add .'])
    expect(s.status).toBe('working')
    expect(s.entries.at(-1)!.explain?.text).toContain('Reset this lesson')
  })

  it('good-messages can recover after a bad message with known commands', () => {
    const s = play(lessonById('good-messages'), [
      'git add README.md',
      'git commit -m "Added stuff"',
      'echo "Ask questions in the team chat." >> README.md',
      'git add README.md',
      'git commit -m "Add a note about where to ask questions"',
    ])
    expect(s.status).toBe('lesson-done')
  })

  it('good-messages guides a learner who commits a weak message before pressing Next', () => {
    const lesson = lessonById('good-messages')
    let s = initRunner(lesson)
    const run = (line: string) => (s = runnerReducer(s, { type: 'run', line }))
    run('git add README.md')
    expect(s.status).toBe('step-done')
    run('git commit -m "Added stuff"')
    s = runnerReducer(s, { type: 'next' })
    run('git commit -m "Good message"')
    expect(s.status).toBe('working')
    expect(s.entries.at(-1)!.explain?.kind).toBe('warn')
    expect(s.entries.at(-1)!.explain?.text).toContain('`echo` prints the text')
    run('echo "Ask questions in the team chat." >> README.md')
    run('git add README.md')
    run('git commit -m "Add a note about where to ask questions"')
    expect(s.status).toBe('lesson-done')
  })
})
