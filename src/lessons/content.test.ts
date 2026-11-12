import { tokenize } from '../engine/tokenize'
import { course, allLessons, findLesson } from './course'
import { initRunner, runnerReducer } from './runner'
import type { RunnerState } from './runner'
import type { Lesson } from './schema'
import { NOTES_V2, README } from './sample'

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
      'terminal-basics',
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

  it('team section lists its lessons', () => {
    expect(course[3]!.lessons.map((l) => l.id)).toEqual([
      'clone-a-repo',
      'push-your-work',
      'share-a-project',
      'fetch-and-pull',
      'push-a-branch',
      'open-a-pull-request',
      'merge-and-clean-up',
      'update-your-branch',
      'scenario-pushed-first',
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

  describe('solution as one line', () => {
    for (const lesson of allLessons()) {
      lesson.steps.forEach((step, i) => {
        if (step.solve) return
        it(`${lesson.id} / ${step.id}`, () => {
          let s = initRunner(lesson)
          for (let j = 0; j < i; j++) {
            for (const a of lesson.steps[j]!.solve ?? lesson.steps[j]!.solution.map((line) => ({ type: 'run' as const, line }))) s = runnerReducer(s, a)
            s = runnerReducer(s, { type: 'next' })
          }
          s = runnerReducer(s, { type: 'run', line: step.solution.join(' && ') })
          const last = i === lesson.steps.length - 1
          expect(s.status).toBe(last ? 'lesson-done' : 'step-done')
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
      const lines = ['echo .env > .gitignore', "echo '*.log' >> .gitignore", 'git status', 'git add .', 'git commit -m "Ignore secrets and logs"']
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
      expect(l.steps.length).toBeLessThanOrEqual(l.pages ? 10 : 5)
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

  it('links the Foundations and Team sharing lessons to their guides', () => {
    const last = (id: string, step: number): string => {
      const l = lessonById(id)
      return l.steps[step]!.learn
    }
    const intro = lessonById('introduce-yourself').steps.map((s) => s.learn).join('\n')
    expect(intro).toContain('](/guides/set-your-name)')
    const share = lessonById('share-a-project').steps.map((s) => s.learn).join('\n')
    expect(share).toContain('](/guides/sign-in-to-github)')
    expect(last('introduce-yourself', 0)).toMatch(/\[[^\]]+\]\(\/guides\/set-your-name\)\.$/)
    expect(last('share-a-project', 0)).toMatch(/\[[^\]]+\]\(\/guides\/sign-in-to-github\)\.$/)
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

  it('good-messages asks for the type: summary format', () => {
    let s = play(lessonById('good-messages'), ['git add README.md', 'git commit -m "Explain how to name meeting files"'])
    expect(s.status).toBe('working')
    expect(s.entries.at(-1)!.explain?.text).toContain('Start with a type and a colon')
    s = play(lessonById('good-messages'), ['git add README.md', 'git commit -m "docs(readme): explain meeting file names"'])
    expect(s.status).toBe('lesson-done')
  })

  it('see-what-changed points to --staged when the learner stages first', () => {
    let s = play(lessonById('see-what-changed'), ['git add notes.txt', 'git diff'])
    expect(s.status).toBe('working')
    expect(s.entries.at(-1)!.explain?.text).toContain('`git diff --staged`')
    s = play(lessonById('see-what-changed'), ['git add notes.txt', 'git diff', 'git diff --staged', 'git diff --staged', 'git diff --staged'])
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
      'git commit -m "docs: add a note about where to ask questions"',
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
    run('git commit -m "docs: add a note about where to ask questions"')
    expect(s.status).toBe('lesson-done')
  })

  it('share-a-project wrong URL nudge', () => {
    const s = play(lessonById('share-a-project'), ['git remote add origin https://git.example.com/team/projct.git'])
    expect(s.stepIndex).toBe(0)
    expect(s.status).toBe('working')
    expect(s.entries.at(-1)!.explain?.text).toContain('`git remote remove origin`')
    const fixed = play(lessonById('share-a-project'), [
      'git remote add origin https://git.example.com/team/projct.git',
      'git remote remove origin',
      'git remote add origin https://git.example.com/team/project.git',
      'git push -u origin main',
      'git status',
    ])
    expect(fixed.status).toBe('lesson-done')
  })

  it('fetch-and-pull status before fetch says up to date', () => {
    const s = play(lessonById('fetch-and-pull'), ['git status'])
    expect(s.stepIndex).toBe(1)
    const text = s.entries.flatMap((e) => e.lines.flat().map((x) => x.text)).join('\n')
    expect(text).toContain("up to date with 'origin/main'")
    const after = play(lessonById('fetch-and-pull'), ['git status', 'git fetch', 'git status'])
    const out = after.entries.at(-1)!.lines.flat().map((x) => x.text).join('\n')
    expect(out).toContain('behind')
  })

  it('push-a-branch: plain push fails, then -u works', () => {
    const s = play(lessonById('push-a-branch'), [
      'git switch -c homepage',
      'echo "<h1>Team notes</h1>" > home.html',
      'git add home.html',
      'git commit -m "Add a home page"',
      'git push',
      'git push -u origin homepage',
      'git branch -vv',
    ])
    expect(s.status).toBe('lesson-done')
  })

  it('push-a-branch: git remote -v does not count as listing branches', () => {
    const steps = ['git switch -c homepage', 'echo "<h1>Team notes</h1>" > home.html', 'git add home.html', 'git commit -m "Add a home page"', 'git push', 'git push -u origin homepage']
    expect(play(lessonById('push-a-branch'), [...steps, 'git remote -v']).status).toBe('working')
    expect(play(lessonById('push-a-branch'), [...steps, 'git branch -v']).status).toBe('lesson-done')
  })

  it('fetch-and-pull: the fetch step needs git fetch, then status is its own step', () => {
    const wrong = play(lessonById('fetch-and-pull'), ['git status', 'git status'])
    expect(wrong.stepIndex).toBe(1)
    expect(wrong.status).toBe('working')
    const fetched = play(lessonById('fetch-and-pull'), ['git status', 'git fetch'])
    expect(fetched.stepIndex).toBe(2)
    expect(fetched.status).toBe('working')
    const right = play(lessonById('fetch-and-pull'), ['git status', 'git fetch', 'git status'])
    expect(right.stepIndex).toBe(3)
  })
})

describe('Section 4, pull requests and the team scenario', () => {
  const lastExplain = (s: RunnerState) => s.entries.at(-1)!.explain
  const NOTES_PATH = '/home/you/notes/notes.txt'
  const BOTH = NOTES_V2 + 'Bring a guest list.\nBring name tags.\n'
  const lines = (s: RunnerState, ls: string[]): RunnerState => ls.reduce((st, line) => runnerReducer(st, { type: 'run', line }), s)
  /** Runs each line and moves on whenever a step passes, like `play` but from a given state. */
  const steps = (s: RunnerState, ls: string[]): RunnerState =>
    ls.reduce((st, line) => {
      const after = runnerReducer(st, { type: 'run', line })
      return after.status === 'step-done' ? runnerReducer(after, { type: 'next' }) : after
    }, s)

  it('open-a-pull-request nudges an unpushed fix', () => {
    let s = initRunner(lessonById('open-a-pull-request'))
    s = runnerReducer(s, { type: 'pr-open', head: 'homepage', base: 'main', title: 'Add a home page', body: '' })
    expect(s.status).toBe('step-done')
    s = runnerReducer(s, { type: 'next' })
    s = steps(s, ['echo "<p>Notes from our weekly meetings.</p>" >> home.html', 'git commit -am "Add a welcome line"', 'git status'])
    expect(s.stepIndex).toBe(3)
    expect(s.status).toBe('working')
    s = steps(s, ['git push'])
    expect(s.status).toBe('lesson-done')
  })

  it('open-a-pull-request recovers from a typo in the welcome line', () => {
    let s = initRunner(lessonById('open-a-pull-request'))
    s = runnerReducer(s, { type: 'pr-open', head: 'homepage', base: 'main', title: 'Add a home page', body: '' })
    s = runnerReducer(s, { type: 'next' })
    s = steps(s, ['echo "<p>Notes from our weekly meeting.</p>" >> home.html'])
    expect(s.stepIndex).toBe(1)
    expect(s.status).toBe('working')
    expect(lastExplain(s)?.text).toContain('echo "<p>Notes from our weekly meetings.</p>" >> home.html')
    s = steps(s, ['echo "<p>Notes from our weekly meetings.</p>" >> home.html', 'git commit -am "Add a welcome line"', 'git push'])
    expect(s.status).toBe('lesson-done')
  })

  it('open-a-pull-request nudges a push that does not reach the branch', () => {
    let s = initRunner(lessonById('open-a-pull-request'))
    s = runnerReducer(s, { type: 'pr-open', head: 'homepage', base: 'main', title: 'Add a home page', body: '' })
    s = runnerReducer(s, { type: 'next' })
    s = steps(s, ['echo "<p>Notes from our weekly meetings.</p>" >> home.html', 'git commit -am "Add a welcome line"'])
    expect(s.stepIndex).toBe(3)
    s = runnerReducer(s, { type: 'run', line: 'git push origin main' })
    expect(s.status).toBe('working')
    expect(lastExplain(s)?.text).toContain('`git push`')
  })

  it('push-your-work needs git status after the commit', () => {
    const early = play(lessonById('push-your-work'), ['git status', 'echo "Bring snacks." >> notes.txt', 'git commit -am "Add a snack reminder"'])
    expect(early.stepIndex).toBe(2)
    expect(early.status).toBe('working')
    const ok = play(lessonById('push-your-work'), ['echo "Bring snacks." >> notes.txt', 'git commit -am "Add a snack reminder"', 'git status'])
    expect(ok.stepIndex).toBe(3)
  })

  it('update-your-branch accepts a merge instead of rebase', () => {
    expect(play(lessonById('update-your-branch'), ['git fetch', 'git merge --no-edit origin/main', 'git push']).status).toBe('lesson-done')
  })

  it('update-your-branch nudges a rejected push', () => {
    const s = play(lessonById('update-your-branch'), ['git fetch', 'git rebase origin/main', 'git push'])
    expect(s.stepIndex).toBe(2)
    expect(s.status).toBe('working')
    expect(lastExplain(s)?.text).toContain('--force-with-lease')
  })

  it('scenario nudges after a rejected push', () => {
    const lesson = lessonById('scenario-pushed-first')
    const rejected = play(lesson, ['git push', 'git push'])
    expect(rejected.world.remote).toEqual(initRunner(lesson).world.remote)
    expect(rejected.stepIndex).toBe(1)
    expect(lastExplain(rejected)?.text).toContain('`git pull`')
    const pulled = play(lesson, ['git push', 'git pull'])
    expect(pulled.stepIndex).toBe(1)
    expect(lastExplain(pulled)?.text).toContain('`git pull --rebase`')
  })

  it('scenario nudges a merge pull toward abort and rebase', () => {
    const s = play(lessonById('scenario-pushed-first'), ['git push', 'git pull --no-rebase'])
    expect(s.stepIndex).toBe(1)
    expect(lastExplain(s)?.text).toContain('git merge --abort')
    expect(lastExplain(s)?.text).toContain('git pull --rebase')
  })

  it('scenario nudges a merge started in the conflict step toward abort', () => {
    const s = play(lessonById('scenario-pushed-first'), ['git push', 'git pull --rebase', 'git rebase --abort', 'git pull --no-rebase'])
    expect(s.stepIndex).toBe(2)
    expect(lastExplain(s)?.text).toContain('git merge --abort')
    expect(lastExplain(s)?.text).not.toContain('You cancelled the rebase')
  })

  it('scenario nudges after cancelling the rebase', () => {
    const s = play(lessonById('scenario-pushed-first'), ['git push', 'git pull --rebase', 'code notes.txt', 'git rebase --abort'])
    expect(s.stepIndex).toBe(2)
    expect(lastExplain(s)?.text).toContain('You cancelled the rebase')
    expect(lastExplain(s)?.text).toContain('git pull --rebase')
  })

  it('scenario refuses markers', () => {
    let s = play(lessonById('scenario-pushed-first'), ['git push', 'git pull --rebase', 'git add notes.txt', 'git rebase --continue'])
    expect(s.status).toBe('working')
    expect(lastExplain(s)?.kind).toBe('warn')
    expect(lastExplain(s)?.text).toContain('<<<<<<<')
    s = runnerReducer(s, { type: 'editor-done' })
    expect(s.status).toBe('working')
    expect(lastExplain(s)?.text).toContain('Reset this lesson')
  })

  it('scenario force push nudge', () => {
    const s = play(lessonById('scenario-pushed-first'), ['git push', 'git push -f'])
    expect(s.stepIndex).toBe(1)
    expect(s.status).toBe('working')
    expect(lastExplain(s)?.kind).toBe('warn')
    expect(lastExplain(s)?.text).toContain('Reset this lesson')
  })

  it('scenario accepts a hand-written resolution', () => {
    let s = play(lessonById('scenario-pushed-first'), ['git push', 'git pull --rebase', 'code notes.txt'])
    s = runnerReducer(s, { type: 'save-file', path: NOTES_PATH, text: BOTH })
    s = lines(s, ['git add notes.txt', 'git rebase --continue'])
    s = runnerReducer(s, { type: 'editor-done' })
    expect(s.stepIndex).toBe(2)
    s = runnerReducer(s, { type: 'next' })
    expect(lines(s, ['git push']).status).toBe('lesson-done')
  })

  it('merge-and-clean-up (b) passes after deleting the server branch before pulling', () => {
    let s = initRunner(lessonById('merge-and-clean-up'))
    s = runnerReducer(s, { type: 'pr-merge', number: 1 })
    s = runnerReducer(s, { type: 'next' })
    s = steps(s, ['git switch main', 'git push origin --delete homepage', 'git pull'])
    expect(s.stepIndex).toBe(3)
    expect(s.status).toBe('working')
    // The server copy is already gone, so deleting your copy finishes the lesson.
    expect(steps(s, ['git branch -d homepage']).status).toBe('lesson-done')
  })

  it('fetch-and-pull (b) nudges after plain git pull', () => {
    const s = play(lessonById('fetch-and-pull'), ['git status', 'git pull'])
    expect(s.stepIndex).toBe(1)
    expect(s.status).toBe('working')
    expect(lastExplain(s)?.text).toContain('`git fetch`')
    expect(lastExplain(s)?.text).toContain('a fetch plus a merge')
  })

  it('scenario (b) copy when the merge was finished', () => {
    let s = play(lessonById('scenario-pushed-first'), ['git push', 'git pull --no-rebase', 'code notes.txt'])
    s = runnerReducer(s, { type: 'save-file', path: NOTES_PATH, text: BOTH })
    s = lines(s, ['git add notes.txt', 'git commit --no-edit'])
    s = runnerReducer(s, { type: 'editor-done' })
    expect(s.stepIndex).toBe(1)
    expect(s.status).toBe('step-done')
    expect(lastExplain(s)?.text).toContain('merge commit')
    expect(lastExplain(s)?.text).not.toContain('paused the rebase')
  })
})
