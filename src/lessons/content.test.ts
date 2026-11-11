import { tokenize } from '../engine/tokenize'
import { course, allLessons, findLesson } from './course'
import { initRunner, runnerReducer } from './runner'
import type { RunnerState } from './runner'
import type { Lesson } from './schema'
import { README } from './sample'

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
    expect(course[1]!.lessons.map((l) => l.id)).toEqual([
      'unstage',
      'discard-changes',
      'amend',
      'undo-a-commit',
      'rewind-with-reset',
      'get-it-back',
      'scenario-messy-afternoon',
    ])
    expect(course[2]!.lessons.map((l) => l.id)).toEqual([
      'make-a-branch',
      'switch-branches',
      'checkout-explained',
      'fast-forward',
      'merge-commit',
      'merge-conflicts',
      'stash',
      'scenario-urgent-fix',
    ])
  })

  describe('solvable', () => {
    for (const lesson of allLessons()) {
      it(lesson.id, () => {
        let s = initRunner(lesson)
        lesson.steps.forEach((step, i) => {
          // Replays `solve` when the step has one (e.g. saving in the editor), else the `solution` lines.
          for (const a of step.solve ?? step.solution.map((line) => ({ type: 'run' as const, line }))) s = runnerReducer(s, a)
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
    it('amend accepts --amend -m', () => {
      const lines = ['git commit --amend -m "Add the launch date"', 'git add agenda.txt', 'git commit --amend --no-edit']
      expect(play(lessonById('amend'), lines).status).toBe('lesson-done')
    })
    it('undo-a-commit accepts --no-edit', () => {
      expect(play(lessonById('undo-a-commit'), ['git log', 'git revert --no-edit HEAD']).status).toBe('lesson-done')
    })
    it('get-it-back accepts the commit id from reflog', () => {
      const lesson = lessonById('get-it-back')
      const repo = initRunner(lesson).world.repo!
      const lost = repo.branches.main!.slice(0, 7)
      const s = play(lesson, ['git reset --hard HEAD~2', 'git reflog', `git reset --hard ${lost}`])
      expect(s.status).toBe('lesson-done')
    })
    it('unstage accepts the older git reset <file>', () => {
      const s = play(lessonById('unstage'), ['git reset draft.txt', 'git commit -m "Add the launch date to the notes"'])
      expect(s.status).toBe('lesson-done')
    })
    it('discard-changes accepts the older git checkout -- <file>', () => {
      expect(play(lessonById('discard-changes'), ['git diff', 'git checkout -- notes.txt']).status).toBe('lesson-done')
    })
    it('ignore-files accepts a *.log pattern and git add .', () => {
      const lines = ['echo .env > .gitignore', "echo '*.log' >> .gitignore", 'git add .', 'git commit -m "Ignore secrets and logs"']
      expect(play(lessonById('ignore-files'), lines).status).toBe('lesson-done')
    })
  })

  describe('branching alternatives', () => {
    const NOTES_PATH = '/home/you/project/notes.txt'
    it('switch-branches: checkout -b creates contact-page', () => {
      const s = play(lessonById('switch-branches'), ['git switch homepage', 'git switch main', 'git checkout -b contact-page'])
      expect(s.status).toBe('lesson-done')
    })
    it('fast-forward accepts git merge homepage then git branch -D', () => {
      expect(play(lessonById('fast-forward'), ['git merge homepage', 'git branch -D homepage']).status).toBe('lesson-done')
    })
    it('merge-commit accepts --no-edit', () => {
      expect(play(lessonById('merge-commit'), ['git merge --no-edit homepage', 'git branch -d homepage']).status).toBe('lesson-done')
    })
    it('merge-conflicts accepts a hand edit via echo > notes.txt', () => {
      const lines = ['git merge launch-date', 'echo "We launch on Thursday." > notes.txt', 'git add notes.txt', 'git commit --no-edit']
      expect(play(lessonById('merge-conflicts'), lines).status).toBe('lesson-done')
    })
    it('merge-conflicts accepts git commit -m', () => {
      let s = play(lessonById('merge-conflicts'), ['git merge launch-date', 'code notes.txt'])
      s = runnerReducer(s, { type: 'save-file', path: NOTES_PATH, text: 'We launch on Thursday.\n' })
      s = runnerReducer(s, { type: 'next' })
      for (const line of ['git add notes.txt', 'git commit -m "Merge the Thursday launch date"']) {
        s = runnerReducer(s, { type: 'run', line })
        if (s.status === 'step-done') s = runnerReducer(s, { type: 'next' })
      }
      expect(s.status).toBe('lesson-done')
    })
    it('merge-conflicts refuses markers', () => {
      const s = play(lessonById('merge-conflicts'), ['git merge launch-date', 'git add notes.txt', 'git commit --no-edit'])
      expect(s.stepIndex).toBe(1)
      expect(s.status).toBe('working')
      const explain = s.entries.at(-1)!.explain
      expect(explain?.kind).toBe('warn')
      expect(explain?.text).toContain('<<<<<<<')
    })
    it('merge-conflicts nudges when the Friday line is kept', () => {
      let s = play(lessonById('merge-conflicts'), ['git merge launch-date', 'code notes.txt'])
      s = runnerReducer(s, { type: 'save-file', path: NOTES_PATH, text: 'We launch on Friday.\n' })
      s = runnerReducer(s, { type: 'run', line: 'git add notes.txt' })
      expect(s.stepIndex).toBe(1)
      expect(s.status).toBe('working')
      expect(s.entries.at(-1)!.explain?.text).toContain('Thursday')
      s = runnerReducer(s, { type: 'run', line: 'git commit --no-edit' })
      expect(s.status).toBe('working')
      expect(s.entries.at(-1)!.explain?.text).toContain('dropped the Thursday line')
    })
    it('merge-conflicts wrong branch nudge', () => {
      const s = play(lessonById('merge-conflicts'), ['git switch launch-date', 'git merge launch-date'])
      expect(s.stepIndex).toBe(0)
      const explain = s.entries.at(-1)!.explain
      expect(explain?.kind).toBe('warn')
      expect(explain?.text).toContain('`git switch main`')
    })
    it('scenario-urgent-fix accepts a fix made in the editor', () => {
      let s = play(lessonById('scenario-urgent-fix'), ['git stash', 'git switch main', 'git switch -c hotfix', 'code README.md'])
      s = runnerReducer(s, { type: 'save-file', path: '/home/you/project/README.md', text: README })
      for (const line of ['git commit -am "Fix a typo in the README"', 'git switch main', 'git merge hotfix', 'git switch homepage', 'git stash pop']) {
        s = runnerReducer(s, { type: 'run', line })
        if (s.status === 'step-done') s = runnerReducer(s, { type: 'next' })
      }
      expect(s.status).toBe('lesson-done')
    })
    it('stash: popping on main nudges', () => {
      const s = play(lessonById('stash'), ['git switch main', 'git stash', 'git switch main', 'git stash pop'])
      expect(s.stepIndex).toBe(3)
      expect(s.status).toBe('working')
      const explain = s.entries.at(-1)!.explain
      expect(explain?.kind).toBe('warn')
      expect(explain?.text).toContain('`git switch homepage`')
      // The nudge's way out works.
      const fixed = play(lessonById('stash'), [
        'git switch main',
        'git stash',
        'git switch main',
        'git stash pop',
        'git restore home.html',
        'git switch homepage',
        'git stash pop',
      ])
      expect(fixed.status).toBe('lesson-done')
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
    const bare = /(^|[^`])\bgit (init|status|add|commit|log|diff|config|restore|reset|reflog|revert|branch|switch|checkout|merge|stash)\b/
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
        // `code` and other commands a `solve` runs count too, not just the Show me lines.
        const solveLines = (s.solve ?? []).flatMap((a) => (a.type === 'run' ? [a.line] : []))
        for (const line of [...s.solution, ...solveLines]) {
          for (const seg of line.split('&&')) {
            expect(shown.has(commandName(seg)), `${l.id} / ${s.id}: \`${seg.trim()}\` not shown yet`).toBe(true)
          }
        }
      }
    }
  })

  it('discard-changes nudges when the junk line is staged', () => {
    const s = play(lessonById('discard-changes'), ['git diff', 'git add notes.txt', 'git restore notes.txt'])
    expect(s.stepIndex).toBe(1)
    expect(s.status).toBe('working')
    const explain = s.entries.at(-1)!.explain
    expect(explain?.kind).toBe('warn')
    expect(explain?.text).toContain('`git restore --staged notes.txt`')
    const fixed = play(lessonById('discard-changes'), [
      'git diff',
      'git add notes.txt',
      'git restore notes.txt',
      'git restore --staged notes.txt',
      'git restore notes.txt',
    ])
    expect(fixed.status).toBe('lesson-done')
  })

  it('amend warns when a new commit is made instead of amending', () => {
    const s = play(lessonById('amend'), ['git add agenda.txt', 'git commit -m "Add the launch date"'])
    expect(s.status).toBe('working')
    expect(s.entries.at(-1)!.explain?.kind).toBe('warn')
    expect(s.entries.at(-1)!.explain?.text).toContain('Reset this lesson')
  })

  it('scenario-messy-afternoon warns about a weak amended message (messageQuality)', () => {
    const s = play(lessonById('scenario-messy-afternoon'), [
      'git restore --staged draft.txt',
      'git restore notes.txt',
      'git commit --amend -m "fix"',
    ])
    expect(s.status).toBe('working')
    expect(s.entries.at(-1)!.explain?.kind).toBe('warn')
    expect(s.entries.at(-1)!.explain?.text).toContain('Amend the commit again')
  })

  it('scenario-messy-afternoon warns when the draft is staged again and swept into the amend', () => {
    const s = play(lessonById('scenario-messy-afternoon'), [
      'git restore --staged draft.txt',
      'git restore notes.txt',
      'git add draft.txt',
      'git commit --amend -m "Add the launch date to the notes"',
    ])
    expect(s.status).toBe('working')
    expect(s.entries.at(-1)!.explain?.text).toContain('Reset this lesson')
  })

  it('rewind-with-reset recovers from a plain reset in the first step', () => {
    let s = play(lessonById('rewind-with-reset'), ['git reset HEAD~1'])
    expect(s.status).toBe('working')
    expect(s.entries.at(-1)!.explain?.text).toContain('`git add agenda.txt`')
    s = play(lessonById('rewind-with-reset'), ['git reset HEAD~1', 'git add agenda.txt', 'git reset', 'git reset --hard', 'git reset --hard HEAD~1'])
    expect(s.status).toBe('lesson-done')
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
