import type { Lesson, StepContext } from '../schema'
import { contains, hasMarkers, inSync, lastFailed, rebaseInProgress, segmentsOf, serverTip, workFile } from '../checks'
import { NOTES_V2 } from '../sample'
import { GUEST_LIST, PUSHED_FIRST } from './setups'

const NAME_TAGS = 'Bring name tags.\n'
const MARKERS = '**<<<<<<<**, **=======** and **>>>>>>>**'

/** True when the server's `main` no longer has Alex's guest list line. */
const alexReplaced = (c: StepContext): boolean => {
  const tip = serverTip(c.world, 'main')
  const text = tip ? c.world.remote?.commits[tip]?.tree['notes.txt'] : undefined
  return !!text && !text.includes(GUEST_LIST.trimEnd())
}

/** True when `main` has every commit the server's `main` has (origin/main alone would pass before fetching). */
const caughtUp = (c: StepContext): boolean => {
  const tip = serverTip(c.world, 'main')
  return !!tip && contains(c.world, 'main', tip)
}

const forced = (c: StepContext): boolean =>
  c.ran.some((line) =>
    segmentsOf(line).some((s) => s[0] === 'git' && s[1] === 'push' && s.some((w) => w === '-f' || w === '--force' || w.startsWith('--force-with-lease'))),
  )

const MERGE_NUDGE = {
  kind: 'tip',
  text: 'That started a merge instead of a rebase. Cancel it with `git merge --abort`, then run `git pull --rebase`.',
} as const
const RESET = 'Open the lesson menu (**…** at the top right) and choose **Reset this lesson** to start again.'
const forceNudge = (c: StepContext) =>
  forced(c) && alexReplaced(c)
    ? { kind: 'warn' as const, text: `That replaced Alex's work on the server: the guest list line is gone from it. A force push is for history you rewrote on purpose, never for getting past a rejection. ${RESET}` }
    : null

export const scenarioPushedFirst: Lesson = {
  id: 'scenario-pushed-first',
  section: 'team',
  title: 'Scenario: someone pushed first',
  level: 'Advanced',
  minutes: 10,
  assumes: 'You can push, pull, rebase and resolve a conflict.',
  setup: PUSHED_FIRST,
  steps: [
    {
      id: 'push',
      title: 'Push your reminder',
      learn:
        'You added a name tag reminder to `notes.txt` in a commit. Alex also added a line to the same file, and pushed first.\n\nThere\'s no command to copy this time. You know everything you need. Start by pushing your commit.',
      task: 'Push your commit and read what Git says.',
      hints: ['You know this one.', 'Type `git push` and press Enter.'],
      solution: ['git push'],
      check: (c) => lastFailed(c, 'push'),
      nudge: forceNudge,
      success: '**Rejected.** The server has a commit you do not have. Never force it: that would delete Alex\'s work. Bring it in first.',
    },
    {
      id: 'pull',
      title: 'Pull and see what Git says',
      learn:
        'Run `git pull`. Your history and the server\'s have diverged, so Git asks how to combine them and stops. Tell it to replay your commit on top of Alex\'s with `git pull --rebase`.',
      task: 'Bring Alex\'s commit into your branch.',
      hints: [
        'Pull first, then read the message.',
        'Type `git pull`, then `git pull --rebase`. Both lines edited the same spot, so expect a conflict.',
      ],
      solution: ['git pull --rebase'],
      check: (c) => !alexReplaced(c) && (rebaseInProgress(c.world) || caughtUp(c)),
      nudge: (c) =>
        forceNudge(c) ??
        (c.world.repo?.op?.kind === 'merge'
          ? MERGE_NUDGE
          : lastFailed(c, 'push')
          ? { kind: 'tip', text: 'Pushing again will not change anything. Alex\'s commit has to come into your branch first. Run `git pull`.' }
          : lastFailed(c, 'pull')
            ? { kind: 'tip', text: 'Git needs to know how to combine the two histories. Tell it to replay your commit on top of Alex\'s: `git pull --rebase`.' }
            : null),
      success: '**Conflict.** You and Alex both added a line at the end of `notes.txt`, and Git paused the rebase to ask you.',
      successFor: (c) =>
        rebaseInProgress(c.world)
          ? null
          : '**Merged.** You and Alex both added a line at the end of `notes.txt`, and Git combined the branches with a merge commit instead of a rebase. That works, but the rebase keeps history in a straight line, which is what this lesson practices.',
    },
    {
      id: 'resolve',
      title: 'Keep both lines',
      learn:
        'Both lines belong in the file. Fix it:\n1. Open it with `code notes.txt`.\n2. Click **Keep both**, then **Save**, and click the **Terminal** tab.\n3. Mark it fixed with `git add notes.txt`.\n4. Carry on with `git rebase --continue`, then click **Save and close** on the message.',
      task: 'Resolve the conflict so notes.txt keeps both lines, and finish the rebase.',
      hints: [
        'The same steps as a merge conflict, then continue the rebase.',
        'Type `code notes.txt`, click **Keep both**, click **Save**, then run `git add notes.txt` and `git rebase --continue`, and click **Save and close**.',
      ],
      solution: ['code notes.txt'],
      solve: [
        { type: 'run', line: 'code notes.txt' },
        { type: 'save-file', path: '/home/you/notes/notes.txt', text: NOTES_V2 + GUEST_LIST + NAME_TAGS },
        { type: 'run', line: 'git add notes.txt' },
        { type: 'run', line: 'git rebase --continue' },
        { type: 'editor-done' },
      ],
      check: (c) => {
        const text = workFile(c.world, 'notes.txt') ?? ''
        return !rebaseInProgress(c.world) && caughtUp(c) && text.includes(GUEST_LIST) && text.includes(NAME_TAGS) && !hasMarkers(text)
      },
      nudge: (c) => {
        if (c.world.repo?.op?.kind === 'merge') return MERGE_NUDGE
        const text = workFile(c.world, 'notes.txt') ?? ''
        const touched = c.ran.some((l) => segmentsOf(l).some((s) => s[0] === 'git' && (s[1] === 'add' || s[1] === 'rebase')))
        if (hasMarkers(text) && touched) {
          return rebaseInProgress(c.world) || c.world.pending
            ? {
                kind: 'warn',
                text: `\`notes.txt\` still has the conflict markers (${MARKERS}). Git won't stop you from saving them, so fix the file first: open it with \`code notes.txt\`, click **Keep both** and **Save**.`,
              }
            : {
                kind: 'warn',
                text: `That commit still has the conflict markers (${MARKERS}) in \`notes.txt\`. Git doesn't check for them. ${RESET}`,
              }
        }
        if (!rebaseInProgress(c.world) && !caughtUp(c)) {
          return { kind: 'tip', text: 'You cancelled the rebase. Start it again with `git pull --rebase`.' }
        }
        return null
      },
      success: '**Rebased.** Your commit now sits on top of Alex\'s, and `notes.txt` has both lines.',
    },
    {
      id: 'push-again',
      title: 'Push again',
      learn: 'Your branch now has everything the server has plus your commit, so the push is a simple fast-forward. No force needed.',
      task: 'Push your work.',
      hints: ['A plain push works now.', 'Type `git push` and press Enter.'],
      solution: ['git push'],
      check: (c) => inSync(c.world, 'main'),
      success: '**Pushed.** The server has Alex\'s line and yours. Pull, resolve, push: that is the loop you will repeat whenever someone gets there first.',
    },
  ],
}
