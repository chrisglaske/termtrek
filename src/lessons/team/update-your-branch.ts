import type { Lesson } from '../schema'
import { contains, inSync, lastFailed, trackingTip, serverTip } from '../checks'
import { BRANCH_BEHIND } from './setups'

export const updateYourBranch: Lesson = {
  id: 'update-your-branch',
  section: 'team',
  title: 'Keep your branch up to date',
  level: 'Advanced',
  minutes: 8,
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
  ],
}
