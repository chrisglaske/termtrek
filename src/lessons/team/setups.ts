import type { RemoteSetup, World, WorldSetup } from '../../engine/types'
import { openPr } from '../../engine/remote/pr'
import { writeFile } from '../../engine/shell/fs'
import { remoteUrl } from '../../engine/remote/host'
import { teammateComment, teammatePush } from '../../engine/remote/teammate'
import { HOME_PAGE, WELCOME, echoHome } from '../branching/setups'
import { AGENDA, IDENTITY, NOTES, NOTES_V2, README, TEAMMATE } from '../sample'

export const NOTES_URL = remoteUrl('team/notes')
export const PROJECT_URL = remoteUrl('team/project')

/** The shared server: `team/notes` with two commits by the teammate. */
export const SERVER: RemoteSetup = {
  slug: 'team/notes',
  author: TEAMMATE,
  commits: [
    { message: 'Add meeting notes', files: { 'notes.txt': NOTES, 'README.md': README } },
    { message: 'Add the launch date', files: { 'notes.txt': NOTES_V2 } },
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
  message: 'Add the venue',
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
    'git commit -m "Add a home page"',
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

const openHomepagePr = openPullRequest({ head: 'homepage', base: 'main', title: 'Add a home page', body: '' })

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
    'git commit -am "Add a welcome line"',
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
    'git commit -m "Start the launch day agenda"',
    'git push -u origin agenda',
    openPullRequest({ head: 'agenda', base: 'main', title: 'Start the launch day agenda', body: '' }),
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
    'git commit -am "Add a name tag reminder"',
    teammatePush({ branch: 'main', message: 'Add a guest list reminder', files: { 'notes.txt': NOTES_V2 + GUEST_LIST }, author: TEAMMATE }),
  ],
}
