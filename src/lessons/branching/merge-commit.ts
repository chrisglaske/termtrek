import type { Lesson } from '../schema'
import { branchExists, mergeInProgress, onBranch, parentCount } from '../checks'
import { DIVERGED, mergeFromMain } from './setups'

export const mergeCommit: Lesson = {
  id: 'merge-commit',
  section: 'branching',
  title: 'Merge when both sides moved',
  level: 'Intermediate',
  minutes: 6,
  assumes: 'You can merge a branch and delete it.',
  setup: DIVERGED,
  steps: [
    {
      id: 'merge',
      title: 'Merge two lines of work',
      learn:
        "This time both branches moved. **homepage** added `home.html`, and meanwhile **main** got a new commit that adds `agenda.txt`. In **Your repo**, the history splits into two lines.\n\n**main** can't just slide forward, because it would lose its own commit. Instead, Git makes a **merge commit**: a new commit with two parents, one from each line.\n\nRun `git merge homepage`. Git opens the merge commit's message in the **editor tab**. The suggested message, \"Merge branch 'homepage'\", is fine: click **Save and close**.\n\nTo skip the editor and keep the suggested message, use `git merge --no-edit homepage`.",
      task: 'Merge homepage into main with a merge commit.',
      hints: [
        'Stay on main and merge the other branch, then save the suggested message.',
        'Type `git merge homepage`, then click **Save and close** in the editor tab.',
      ],
      solution: ['git merge homepage'],
      solve: [
        { type: 'run', line: 'git merge homepage' },
        { type: 'editor-done' },
      ],
      check: (c) => onBranch(c.world, 'main') && parentCount(c.world) === 2 && !mergeInProgress(c.world),
      nudge: (c) =>
        mergeFromMain('homepage')(c) ??
        (mergeInProgress(c.world) && !c.world.pending
          ? { kind: 'tip', text: 'The merge is waiting for its commit message. Run `git commit` and save the suggested message.' }
          : null),
      success:
        "**A merge commit.** In **Your repo**, the two lines join again at a commit with two parents. Your folder has both `home.html` and `agenda.txt`. Git combined them on its own because the branches changed different files.",
    },
    {
      id: 'delete',
      title: 'Delete the merged branch',
      learn: "**homepage** is merged, so delete its label with `git branch -d homepage`. Its commits stay: the merge commit's second parent still points at them.",
      task: 'Delete the homepage branch.',
      hints: ['Use `git branch` with the delete option.', 'Type `git branch -d homepage` and press Enter.'],
      solution: ['git branch -d homepage'],
      check: (c) => !branchExists(c.world, 'homepage'),
      success:
        '**Done.** Fast-forward when only one side moved, a merge commit when both did. Git picks the right one for you; now you can read which one happened in **Your repo**.',
    },
  ],
}
