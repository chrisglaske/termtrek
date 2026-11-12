import type { Explain, WorldSetup } from '../../engine/types'
import type { StepContext } from '../schema'
import { onBranch, ranGit } from '../checks'
import { IDENTITY, NOTES, NOTES_V2, README } from '../sample'

export const HOME_PAGE = '<h1>Team notes</h1>\n'
export const WELCOME = '<p>Notes from our weekly meetings.</p>\n'
/** `home.html` with an unfinished second line, the work the stash lessons put aside. */
export const HOME_PAGE_WIP = HOME_PAGE + WELCOME
export const README_TYPO = README.replace('weekly', 'weekley')

type SetupCommit = { message: string; files: Record<string, string> }

const TWO_COMMITS: SetupCommit[] = [
  { message: 'docs: add meeting notes', files: { 'notes.txt': NOTES, 'README.md': README } },
  { message: 'docs: add the launch date', files: { 'notes.txt': NOTES_V2 } },
]

/** An `echo` that writes (`>`) or appends (`>>`) one line of `home.html`, built from the same constants the checks use. */
export const echoHome = (line: string, op: '>' | '>>'): string => `echo "${line.trimEnd()}" ${op} home.html`
const ADD_WELCOME = echoHome(WELCOME, '>>')

const ADD_HOME_PAGE = [echoHome(HOME_PAGE, '>'), 'git add home.html', 'git commit -m "feat: add a home page"']

/** Two commits on `main`. */
export const TWO_ON_MAIN: WorldSetup = { cwd: 'project', config: IDENTITY, repo: { at: 'project', commits: TWO_COMMITS } }

/** `homepage` is one commit ahead with `home.html`; you are on `main`. */
export const HOMEPAGE_BRANCH: WorldSetup = { ...TWO_ON_MAIN, run: ['git switch -c homepage', ...ADD_HOME_PAGE, 'git switch main'] }

/** `homepage` is two commits ahead; `main` hasn't moved. */
export const HOMEPAGE_AHEAD: WorldSetup = {
  ...TWO_ON_MAIN,
  run: [
    'git switch -c homepage',
    ...ADD_HOME_PAGE,
    ADD_WELCOME,
    'git commit -am "feat: add a welcome line to the home page"',
    'git switch main',
  ],
}

/** `homepage` added `home.html` while `main` added `agenda.txt`: both moved, no file in common. */
export const DIVERGED: WorldSetup = {
  ...TWO_ON_MAIN,
  run: [
    ...(HOMEPAGE_BRANCH.run ?? []),
    'echo "Launch day agenda" > agenda.txt',
    'git add agenda.txt',
    'git commit -m "docs: start the launch day agenda"',
  ],
}

/** `main` and `launch-date` each added a different launch date as the same new line of `notes.txt`. */
export const LAUNCH_CONFLICT: WorldSetup = {
  cwd: 'project',
  config: IDENTITY,
  repo: { at: 'project', commits: [TWO_COMMITS[0]!] },
  run: [
    'git switch -c launch-date',
    'echo "We launch on Thursday." >> notes.txt',
    'git commit -am "docs: move the launch to Thursday"',
    'git switch main',
    'echo "We launch on Friday." >> notes.txt',
    'git commit -am "docs: add the launch date"',
  ],
}

/** On `homepage` with an unsaved edit to `home.html`; `main` has its own `home.html`. */
export const UNFINISHED_HOMEPAGE: WorldSetup = {
  ...TWO_ON_MAIN,
  run: [
    'git switch -c homepage',
    ...ADD_HOME_PAGE,
    'git switch main',
    echoHome('<h1>Coming soon</h1>', '>'),
    'git add home.html',
    'git commit -m "feat: add a placeholder home page"',
    'git switch homepage',
    ADD_WELCOME,
  ],
}

/** On `homepage` with an unsaved edit to `home.html`; the README on `main` says "weekley". */
export const URGENT_FIX: WorldSetup = {
  cwd: 'project',
  config: IDENTITY,
  repo: { at: 'project', commits: [{ message: 'docs: add meeting notes', files: { 'notes.txt': NOTES, 'README.md': README_TYPO } }] },
  run: ['git switch -c homepage', ...ADD_HOME_PAGE, ADD_WELCOME],
}

/** A warn when the learner merged while on the wrong branch. */
export const mergeFromMain =
  (theirs: string) =>
  (c: StepContext): Explain | null =>
    ranGit(c, 'merge') && !onBranch(c.world, 'main')
      ? {
          kind: 'warn',
          text: `A merge brings another branch into the one you're on, so you need to be on **main**. Run \`git switch main\` first, then \`git merge ${theirs}\`.`,
        }
      : null
