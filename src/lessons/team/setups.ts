import type { RemoteSetup, World, WorldSetup } from '../../engine/types'
import { openPr } from '../../engine/remote/pr'
import { writeFile } from '../../engine/shell/fs'
import { remoteUrl } from '../../engine/remote/host'
import { teammateComment, teammatePush } from '../../engine/remote/teammate'
import { runLine } from '../../engine/interpreter'
import { HOME_PAGE, WELCOME, echoHome } from '../branching/setups'
import { AGENDA, IDENTITY, NOTES, NOTES_V2, README, TEAMMATE } from '../sample'

export const NOTES_URL = remoteUrl('team/notes')
export const PROJECT_URL = remoteUrl('team/project')

/** The shared server: `team/notes` with two commits by the teammate. */
export const SERVER: RemoteSetup = {
  slug: 'team/notes',
  author: TEAMMATE,
  commits: [
    { message: 'docs: add meeting notes', files: { 'notes.txt': NOTES, 'README.md': README } },
    { message: 'docs: add the launch date', files: { 'notes.txt': NOTES_V2 } },
  ],
}

/** You have cloned `team/notes` and are inside `notes`. */
export const CLONED: WorldSetup = { config: IDENTITY, remote: SERVER, run: [`git clone ${NOTES_URL}`, 'cd notes'] }

/** An empty server for a project that only exists on your computer. */
export const EMPTY_SERVER: RemoteSetup = { slug: 'team/project' }

export const VENUE = 'The launch party is at the library.\n'

/** Alex pushes a commit to `main` on the server. */
export const alexAddsVenue = teammatePush({
  branch: 'main',
  message: 'docs: add the venue',
  files: { 'notes.txt': NOTES_V2 + VENUE },
  author: TEAMMATE,
})

/** Cloned, with `homepage` committed and pushed. */
export const HOMEPAGE_PUSHED: WorldSetup = {
  ...CLONED,
  run: [
    ...(CLONED.run ?? []),
    'git switch -c homepage',
    `echo "${HOME_PAGE.trimEnd()}" > home.html`,
    'git add home.html',
    'git commit -m "feat: add a home page"',
    'git push -u origin homepage',
  ],
}

/** A setup step that opens a pull request as you, failing loudly when the engine refuses. */
const openPullRequest =
  (input: { head: string; base: string; title: string; body: string }) =>
  (w: World): World => {
    const r = openPr(w, input)
    if (!r.ok) throw new Error(`setup could not open the pull request: ${r.error}`)
    return r.world
  }

const openHomepagePr = openPullRequest({ head: 'homepage', base: 'main', title: 'feat: add a home page', body: '' })

export const ALEX_ASKS_FOR_A_WELCOME = {
  pr: 1,
  kind: 'changes' as const,
  author: TEAMMATE.name,
  body: 'Looks good! Could you add a welcome line under the heading?',
}

/** Pull request #1 is open, Alex asked for a welcome line, and you added it and pushed. */
export const PR_OPEN: WorldSetup = {
  ...HOMEPAGE_PUSHED,
  run: [
    ...(HOMEPAGE_PUSHED.run ?? []),
    openHomepagePr,
    teammateComment(ALEX_ASKS_FOR_A_WELCOME),
    echoHome(WELCOME, '>>'),
    'git commit -am "feat: add a welcome line"',
    'git push',
  ],
}

/** On `agenda` (pushed, pull request #1 open) while Alex has pushed a commit to `main`. */
export const BRANCH_BEHIND: WorldSetup = {
  ...CLONED,
  run: [
    ...(CLONED.run ?? []),
    'git switch -c agenda',
    (w) => writeFile(w, `${w.repo?.root ?? w.cwd}/agenda.txt`, AGENDA),
    'git add agenda.txt',
    'git commit -m "docs: start the launch day agenda"',
    'git push -u origin agenda',
    openPullRequest({ head: 'agenda', base: 'main', title: 'docs: start the launch day agenda', body: '' }),
    alexAddsVenue,
  ],
}

export const GUEST_LIST = 'Bring a guest list.\n'

/** You committed a name tag reminder; Alex pushed a different last line of `notes.txt` first. */
export const PUSHED_FIRST: WorldSetup = {
  ...CLONED,
  run: [
    ...(CLONED.run ?? []),
    'echo "Bring name tags." >> notes.txt',
    'git commit -am "docs: add a name tag reminder"',
    teammatePush({ branch: 'main', message: 'docs: add a guest list reminder', files: { 'notes.txt': NOTES_V2 + GUEST_LIST }, author: TEAMMATE }),
  ],
}

/** Both lines edit the first agenda item, so rebasing one onto the other conflicts. */
export const ALEX_AGENDA_LINE = '1. Check the home page on a phone'
export const YOUR_AGENDA_LINE = '1. Check the home page on a laptop'
const agendaWith = (line: string): string => AGENDA.replace('1. Check the home page', line)

/** Alex pushes a fix to `agenda` on the server. */
export const alexFixesAgenda = teammatePush({
  branch: 'agenda',
  message: 'docs: mention phones',
  files: { 'agenda.txt': agendaWith(ALEX_AGENDA_LINE) },
  author: TEAMMATE,
})

/** You commit a change to the same agenda line on your computer. */
const youEditAgenda = (w: World): World => {
  const written = writeFile(w, `${w.repo?.root ?? w.cwd}/agenda.txt`, agendaWith(YOUR_AGENDA_LINE))
  const staged = runLine(written, 'git add agenda.txt')
  const done = runLine(staged.world, 'git commit -m "docs: mention laptops"')
  if (staged.exitCode !== 0 || done.exitCode !== 0) throw new Error('setup could not commit the agenda change')
  return done.world
}

/** Alex pushed a fix to `agenda` and you committed a change to the same line. */
export const agendaDiverges = (w: World): World => youEditAgenda(alexFixesAgenda(w))
