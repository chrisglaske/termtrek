import type { Lesson } from '../schema'
import { contains, hasMarkers, inSync, lastFailed, rebaseInProgress, serverTip, trackingTip, workFile } from '../checks'
import { ALEX_AGENDA_LINE, BRANCH_BEHIND, YOUR_AGENDA_LINE, agendaDiverges } from './setups'
import { AGENDA } from '../sample'

const BOTH_LINES = AGENDA.replace('1. Check the home page', `${ALEX_AGENDA_LINE}\n${YOUR_AGENDA_LINE}`)

const agendaTip = (c: Parameters<typeof contains>[0]): string | null => serverTip(c, 'agenda')


export const updateYourBranch: Lesson = {
  id: 'update-your-branch',
  section: 'team',
  title: 'Keep your branch up to date',
  level: 'Advanced',
  minutes: 12,
  assumes: 'You can fetch, merge, and open a pull request.',
  setup: BRANCH_BEHIND,
  steps: [
    {
      id: 'fetch',
      title: 'See what moved',
      learn:
        'You started **agenda** from **main**, but while you worked, **main** moved on. Your pull request will soon be out of date, so bring your branch up to date before it is merged.\n\nFirst, find out what the server has with `git fetch`.',
      task: 'Fetch from the server.',
      hints: ['Fetching downloads without changing your files.', 'Type `git fetch` and press Enter.'],
      solution: ['git fetch'],
      event: { apply: (w) => w, note: '**Alex Kim** pushed a commit to **main** while you were working on **agenda**.' },
      check: (c) => trackingTip(c.world, 'origin/main') === serverTip(c.world, 'main'),
      success: '**Now Git knows.** **origin/main** has Alex\'s commit, and **agenda** does not.',
    },
    {
      id: 'rebase',
      title: 'Replay your work on top',
      learn:
        'Two ways to catch up. `git merge origin/main` adds a merge commit that joins the two lines. `git rebase origin/main` **replays** your commits on top of **origin/main**, as if you had started from it, so the history stays a straight line.\n\nBoth are fine, and teams choose one. Try the rebase.',
      task: 'Rebase agenda onto origin/main.',
      hints: ['Name the branch you want to catch up with.', 'Type `git rebase origin/main` and press Enter.'],
      solution: ['git rebase origin/main'],
      check: (c) => contains(c.world, 'agenda', 'origin/main'),
      success: '**Caught up.** Your commit now sits on top of Alex\'s. It is a new commit with the same change, so it has a new id.',
    },
    {
      id: 'push',
      title: 'Push the rewritten branch',
      learn:
        'After a rebase, `git push` is rejected: the server still has your **old** commit, and your branch no longer has it. A rebase rewrites history, so Git will not let a plain push replace it.\n\nWhen you rewrote a branch on purpose, use `git push --force-with-lease`. It replaces the server copy, but only if nobody else pushed to that branch since you last fetched, so you never wipe out a teammate\'s work by accident.',
      task: 'Push agenda so the server matches.',
      hints: ['A plain push will not work after a rebase.', 'Type `git push --force-with-lease` and press Enter.'],
      solution: ['git push --force-with-lease'],
      check: (c) => inSync(c.world, 'agenda'),
      nudge: (c) =>
        lastFailed(c, 'push')
          ? {
              kind: 'tip',
              text: 'The rebase gave your commit a new id, so the server sees two different histories. Replace it with `git push --force-with-lease`: it only overwrites if nobody else has pushed to **agenda**.',
            }
          : null,
      success: '**Up to date.** Open the pull request in the **Remote** tab: it now sits on top of **main** with nothing to catch up on.',
    },
    {
      id: 'pull-rebase',
      title: 'Pull with a rebase',
      learn:
        'Often a teammate pushes to **your own** branch while you keep working. Now **agenda** has a commit on the server that you do not have, and you have one the server does not have.\n\n`git pull --rebase` fetches and then replays your commits on top of theirs, in one command. Alex and you changed the same line, so expect Git to pause.',
      task: 'Pull Alex\'s fix and replay your commit on top.',
      hints: ['Add the option that replays instead of merging.', 'Type `git pull --rebase` and press Enter.'],
      solution: ['git pull --rebase'],
      event: { apply: agendaDiverges, note: '**Alex Kim** pushed a fix to **agenda** on the server, and you committed a change to the same line on your computer.' },
      check: (c) => rebaseInProgress(c.world),
      nudge: (c) =>
        lastFailed(c, 'pull')
          ? { kind: 'tip', text: 'Tell Git to replay your commit on top: `git pull --rebase`.' }
          : null,
      success: '**Paused.** Both of you changed the same line, so Git stopped the rebase and left the choice to you.',
    },
    {
      id: 'resolve',
      title: 'Keep both lines',
      learn:
        'Open the file with `code agenda.txt`, click **Keep both**, then **Save** and click the **Terminal** tab. The conflict is fixed in the file.',
      task: 'Resolve the conflict so agenda.txt keeps both lines.',
      hints: ['Open the file in the editor.', 'Type `code agenda.txt`, click **Keep both**, then click **Save**.'],
      solution: ['code agenda.txt'],
      solve: [
        { type: 'run', line: 'code agenda.txt' },
        { type: 'save-file', path: '/home/you/notes/agenda.txt', text: BOTH_LINES },
      ],
      check: (c) => {
        const text = workFile(c.world, 'agenda.txt') ?? ''
        return !hasMarkers(text) && text.includes(ALEX_AGENDA_LINE) && text.includes(YOUR_AGENDA_LINE)
      },
      success: '**Fixed in the file.** Both lines are there and the markers are gone. Git does not know yet.',
    },
    {
      id: 'add',
      title: 'Mark it fixed',
      learn: 'Stage the file with `git add agenda.txt`. That is how you tell Git the conflict is fixed.',
      task: 'Stage agenda.txt.',
      hints: ['Staging marks it as fixed.', 'Type `git add agenda.txt` and press Enter.'],
      solution: ['git add agenda.txt'],
      // The add has worked once the rebase is still paused but agenda.txt is no longer listed as unmerged.
      check: (c) => rebaseInProgress(c.world) && !c.world.repo?.op?.conflicts.includes('agenda.txt') && !hasMarkers(workFile(c.world, 'agenda.txt') ?? ''),
      success: '**Marked as fixed.** One step left: carry on with the rebase.',
    },
    {
      id: 'continue',
      title: 'Finish the rebase',
      learn: 'Carry on with `git rebase --continue`, then click **Save and close** on the message. If you change your mind, `git rebase --abort` puts everything back the way it was.',
      task: 'Finish the rebase.',
      hints: ['Continue where Git paused.', 'Type `git rebase --continue`, then click **Save and close**.'],
      solution: ['git rebase --continue'],
      solve: [
        { type: 'run', line: 'git rebase --continue' },
        { type: 'editor-done' },
      ],
      check: (c) => {
        const tip = agendaTip(c.world)
        return !rebaseInProgress(c.world) && !!tip && contains(c.world, 'agenda', tip)
      },
      success: '**Rebased.** Your commit sits on top of Alex\'s fix, and the file has both lines.',
    },
    {
      id: 'push-again',
      title: 'Push the result',
      learn: 'Your branch now has everything the server has plus your commit, so a plain `git push` is enough. No force needed.',
      task: 'Push agenda.',
      hints: ['A plain push works now.', 'Type `git push` and press Enter.'],
      solution: ['git push'],
      check: (c) => inSync(c.world, 'agenda'),
      success: '**Pushed.** The server has Alex\'s fix and yours.',
    },
  ],  pages: [
    {
      kind: 'read',
      id: 'situation',
      kicker: 'The setup',
      title: 'main moved on while you worked',
      body: 'You started **agenda** from **main** and opened a pull request for it. Meanwhile **Alex Kim** pushed a commit to **main**.',
      visual: { kind: 'server', branch: 'main' },
    },
    {
      kind: 'do',
      id: 'fetch',
      kicker: 'Try it',
      title: 'See what moved',
      body: 'Download the news first. Your files do not change.',
      visual: { kind: 'graph', branches: true },
      step: 0,
      command: [{ text: 'git fetch', say: 'download what is new' }],
      done: '**Now Git knows.** origin/main has Alex\'s commit, and agenda does not.',
    },
    {
      kind: 'read',
      id: 'two-ways',
      kicker: 'The idea',
      title: 'Two ways to catch up',
      body: '`git merge origin/main` adds a merge commit that joins the two lines.\n\n`git rebase origin/main` **replays** your commit on top of origin/main, as if you had started from there. History stays one straight line. Teams pick one.',
      visual: { kind: 'graph', branches: true },
    },
    {
      kind: 'do',
      id: 'rebase',
      kicker: 'Try it',
      title: 'Replay your work on top',
      body: 'Try the rebase. Watch where your commit lands.',
      visual: { kind: 'graph', branches: true },
      step: 1,
      command: [
        { text: 'git rebase', say: 'replay my commits' },
        { text: 'origin/main', say: 'on top of this' },
      ],
      done: '**Caught up.** Your commit sits on top of Alex\'s, with a new ID.',
    },
    {
      kind: 'read',
      id: 'rewritten',
      kicker: 'Why a plain push fails',
      title: 'Rebase rewrote your branch',
      body: 'Your commit got a new ID. The server still has the old one, so the two copies of **agenda** have split. A plain `git push` is refused.',
      visual: { kind: 'server', branch: 'agenda' },
    },
    {
      kind: 'read',
      id: 'lease',
      kicker: 'The idea',
      title: 'Replace it, but safely',
      body: '`--force-with-lease` lets your push replace the server\'s copy, but only if nobody else pushed to that branch since you last fetched. You never wipe out a teammate\'s work by accident.\n\nThe rule from Fixing mistakes is about shared branches like main. Your own pull-request branch is fine to rewrite, as long as nobody else builds on it.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'push',
      kicker: 'Try it',
      title: 'Push the rewritten branch',
      body: 'Only for a branch you rewrote on purpose.',
      visual: { kind: 'server', branch: 'agenda' },
      step: 2,
      command: [
        { text: 'git push', say: 'send my commits' },
        { text: '--force-with-lease', say: 'replace the server copy, safely' },
      ],
      done: '**Up to date.** The pull request now sits on top of main.',
    },
    {
      kind: 'do',
      id: 'pull-rebase',
      kicker: 'Try it',
      title: 'Pull and replay your commit',
      body: 'Alex pushed to **agenda** too. `git pull --rebase` fetches, then replays your commit on top.',
      visual: { kind: 'server', branch: 'agenda' },
      step: 3,
      command: [
        { text: 'git pull', say: 'fetch and combine' },
        { text: '--rebase', say: 'by replaying my commits' },
      ],
      done: '**Paused.** You both changed the same line, so Git stopped the rebase.',
    },
    {
      kind: 'read',
      id: 'paused',
      kicker: 'Good to know',
      title: 'Git paused the rebase',
      body: 'Git paused the rebase. Fix the file, stage it, then `git rebase --continue`.\n\nChanged your mind? `git rebase --abort` puts everything back.',
      visual: { kind: 'conflict', file: 'agenda.txt', theirs: 'agenda', markers: true },
    },
    {
      kind: 'do',
      id: 'resolve',
      kicker: 'Try it',
      title: 'Keep both lines',
      body: 'Both lines belong in the file. `code` opens it in the editor. Click **Keep both**, then **Save**.',
      visual: { kind: 'conflict', file: 'agenda.txt', theirs: 'agenda' },
      step: 4,
      command: [
        { text: 'code', say: 'open in the editor' },
        { text: 'agenda.txt', say: 'this file' },
      ],
      done: '**Fixed in the file.** Both lines, no markers.',
    },
    {
      kind: 'do',
      id: 'add',
      kicker: 'Try it',
      title: 'Mark it fixed',
      body: 'Staging the file tells Git the conflict is fixed.',
      visual: { kind: 'graph', branches: true },
      step: 5,
      command: [
        { text: 'git add', say: 'mark as fixed' },
        { text: 'agenda.txt', say: 'this file' },
      ],
      done: '**Marked as fixed.** One step left.',
    },
    {
      kind: 'do',
      id: 'continue',
      kicker: 'Try it',
      title: 'Finish the rebase',
      body: 'Carry on where Git paused, then click **Save and close** on the message.',
      visual: { kind: 'graph', branches: true },
      step: 6,
      command: [{ text: 'git rebase --continue', say: 'carry on replaying' }],
      done: '**Rebased.** Your commit sits on top of Alex\'s fix.',
    },
    {
      kind: 'do',
      id: 'push-again',
      kicker: 'Try it',
      title: 'Push the finished rebase',
      body: 'A plain push works. No force needed.',
      visual: { kind: 'server', branch: 'agenda' },
      step: 7,
      command: [{ text: 'git push', say: 'send my commits' }],
      done: '**Pushed.** The server has Alex\'s fix and yours.',
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'Your branch is up to date',
      body: 'Fetch, rebase onto origin/main, then push with `--force-with-lease`. Or merge origin/main and push as usual.\n\nWhen a teammate pushes to your own branch, `git pull --rebase` replays your commits on top. If it pauses, fix the file, stage it, `git rebase --continue`, then push.',
    },
  ],
}
