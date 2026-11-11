import type { Lesson, StepContext } from '../schema'
import { historyLength, isClean, onBranch, treeFile, workFile } from '../checks'
import { HOME_PAGE_WIP, URGENT_FIX, mergeFromMain } from './setups'

const fixed = (text: string | undefined): boolean => !!text && /weekly/.test(text) && !/weekley/.test(text)
const mainMoved = (c: StepContext): boolean => c.world.repo?.branches.main !== c.start.repo?.branches.main

export const scenarioUrgentFix: Lesson = {
  id: 'scenario-urgent-fix',
  section: 'branching',
  title: 'Scenario: an urgent fix',
  level: 'Intermediate',
  minutes: 8,
  assumes: 'You can stash, switch, commit and merge.',
  setup: URGENT_FIX,
  steps: [
    {
      id: 'shelve',
      title: 'Put your work aside',
      learn:
        "You're in the middle of the home page on **homepage** when a teammate spots a typo in the README on **main**: it says \"weekley\". It needs fixing now, and your edit to `home.html` isn't ready to commit.\n\nThere's no command to copy this time. You know everything you need. First, put your unfinished work aside so your folder is clean.",
      task: 'Get your unfinished edit out of the way without committing it.',
      hints: [
        'This was the stash lesson: put the edit on the shelf.',
        'Type `git stash`.',
      ],
      solution: ['git stash'],
      check: (c) => (c.world.repo?.stash.length ?? 0) === 1 && isClean(c.world),
      nudge: (c) =>
        historyLength(c.world, 'homepage') > historyLength(c.start, 'homepage')
          ? {
              kind: 'warn',
              text: 'That committed the half-done work. Undo the commit with `git reset HEAD~1` (your edit stays in the folder), then put the edit on the shelf instead.',
            }
          : null,
      success: '**Folder clean, work shelved.** Now you can leave **homepage**.',
    },
    {
      id: 'hotfix',
      title: 'Fix the typo on its own branch',
      learn:
        "Go to **main** and start a branch called **hotfix** for the fix. Then open `README.md`, change \"weekley\" to \"weekly\", save, and commit on **hotfix**.\n\nA separate branch keeps the fix easy to review on its own, even when it's one word.",
      task: 'Fix the typo in a commit on a new hotfix branch made from main.',
      hints: [
        'Switch to main, create and switch to hotfix, then edit the README with `code` and commit with `-am`.',
        'Type `git switch main`, then `git switch -c hotfix`, then `code README.md`. Fix the word, click **Save**, and run `git commit -am "Fix a typo in the README"`.',
      ],
      // Show me fixes the file from the terminal, so it finishes the step on its own; the editor works too.
      solution: [
        'git switch main',
        'git switch -c hotfix',
        'echo "# Team notes" > README.md',
        'echo "Shared notes from our weekly meetings." >> README.md',
        'git commit -am "Fix a typo in the README"',
      ],
      check: (c) => fixed(treeFile(c.world, 'hotfix', 'README.md')) && !mainMoved(c),
      nudge: (c) =>
        mainMoved(c)
          ? {
              kind: 'warn',
              text: 'That commit went straight onto **main**. This scenario practices a separate **hotfix** branch: open the lesson menu (**…** at the top right) and choose **Reset this lesson** to try again.',
            }
          : null,
      success: '**Fixed on hotfix.** **main** still has the typo until you merge.',
    },
    {
      id: 'merge',
      title: 'Ship the fix',
      learn: 'Bring the fix into **main**.',
      task: 'Merge hotfix into main.',
      hints: [
        'Merges pull another branch into the one you are on.',
        'Type `git switch main`, then `git merge hotfix`.',
      ],
      solution: ['git switch main', 'git merge hotfix'],
      check: (c) => fixed(treeFile(c.world, 'main', 'README.md')),
      nudge: mergeFromMain('hotfix'),
      success: "**Shipped.** **main** fast-forwarded to the fix. You can delete **hotfix** with `git branch -d hotfix` whenever you like.",
    },
    {
      id: 'resume',
      title: 'Back to the home page',
      learn: 'Last step: go back to where you were and pick up your unfinished work.',
      task: 'Return to homepage with your edit to `home.html` back in place.',
      hints: [
        'Switch to the branch you stashed from, then take the work off the shelf.',
        'Type `git switch homepage`, then `git stash pop`.',
      ],
      solution: ['git switch homepage', 'git stash pop'],
      check: (c) =>
        onBranch(c.world, 'homepage') && c.world.repo?.stash.length === 0 && workFile(c.world, 'home.html') === HOME_PAGE_WIP,
      success:
        "**Interruption handled.** The typo is fixed on **main**, and you're back on the home page as if nothing happened. Shelve, branch, fix, merge, pop: that's how you handle the urgent stuff without losing your place.",
    },
  ],
}
