import type { Lesson } from '../schema'
import { isClean, onBranch, ranGit, treeFile, workFile } from '../checks'
import { HOME_PAGE_WIP, UNFINISHED_HOMEPAGE } from './setups'

export const stash: Lesson = {
  id: 'stash',
  section: 'branching',
  title: 'Put work aside with stash',
  level: 'Intermediate',
  minutes: 7,
  assumes: 'You can switch branches and merge.',
  setup: UNFINISHED_HOMEPAGE,
  steps: [
    {
      id: 'refused',
      title: 'Try to switch with unsaved work',
      learn:
        "You're halfway through an edit to `home.html` on **homepage**, and someone asks you to check something on **main**. **main** has its own, different `home.html`.\n\nTry it: run `git switch main`. Git will refuse, and that's a good thing. Switching would replace your unsaved edit with **main**'s version of the file.",
      task: 'Try to switch to main.',
      hints: ['Switch the way you always do.', 'Type `git switch main` and press Enter.'],
      solution: ['git switch main'],
      check: (c) => ranGit(c, 'switch') && onBranch(c.world, 'homepage') && !!c.last && c.last.exitCode !== 0,
      success:
        "**Refused, and your edit is safe.** Git lists `home.html`: your changes would be overwritten. It suggests committing or stashing first. Your edit isn't ready to commit, so stash it.",
    },
    {
      id: 'stash',
      title: 'Put the edit on the shelf',
      learn:
        "The **stash** is a shelf for unfinished work. Run `git stash`: Git takes your uncommitted changes, puts them on the shelf and makes your folder clean again.\n\nTo see what's on the shelf, run `git stash list`. Each entry is named like **stash@{0}**, newest first, with the branch and commit it came from.",
      task: 'Stash your edit to `home.html`.',
      hints: ['The command is `git` plus the name of the shelf.', 'Type `git stash` and press Enter.'],
      solution: ['git stash'],
      check: (c) => (c.world.repo?.stash.length ?? 0) === 1 && isClean(c.world),
      success: '**Shelved.** Your folder matches the last commit on **homepage**, so nothing is in the way of switching.',
    },
    {
      id: 'visit-main',
      title: 'Go check main',
      learn: 'Now `git switch main` works. Take a look around: `home.html` here is **main**\'s version.',
      task: 'Switch to main.',
      hints: ['Switch the way you always do.', 'Type `git switch main` and press Enter.'],
      solution: ['git switch main'],
      check: (c) => onBranch(c.world, 'main'),
      success: "**On main.** Your unfinished edit is waiting on the shelf, not lost.",
    },
    {
      id: 'pop',
      title: 'Bring your work back',
      learn:
        "Done on **main**? Go back with `git switch homepage`, then take the work off the shelf with `git stash pop`.\n- `pop` puts the newest stash entry back in your folder and removes it from the shelf.\n\nPop on the branch you stashed from. Popping somewhere else puts the work on the wrong branch.",
      task: 'Go back to homepage and get your edit back.',
      hints: [
        'Switch back first, then pop the stash.',
        'Type `git switch homepage`, then `git stash pop`.',
      ],
      solution: ['git switch homepage', 'git stash pop'],
      check: (c) =>
        onBranch(c.world, 'homepage') && c.world.repo?.stash.length === 0 && workFile(c.world, 'home.html') === HOME_PAGE_WIP,
      nudge: (c) =>
        onBranch(c.world, 'main') && workFile(c.world, 'home.html') !== treeFile(c.world, 'HEAD', 'home.html')
          ? {
              kind: 'warn',
              text: "That put the homepage work onto **main**, where `home.html` is different, so the two clashed. The shelf entry is kept. Run `git restore home.html` to undo it on main, then `git switch homepage` and `git stash pop` there.",
            }
          : null,
      success:
        '**Back where you left off.** Your edit is in `home.html` and the shelf is empty. Stash is for short breaks: if the work will wait more than a day, commit it on its branch instead.',
    },
  ],
}
