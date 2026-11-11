import type { Lesson } from '../schema'
import { onBranch, workFile } from '../checks'
import { HOMEPAGE_BRANCH } from './setups'

export const switchBranches: Lesson = {
  id: 'switch-branches',
  section: 'branching',
  title: 'Switch between branches',
  level: 'Beginner',
  minutes: 5,
  assumes: 'You can make a branch and commit on it.',
  setup: HOMEPAGE_BRANCH,
  steps: [
    {
      id: 'to-homepage',
      title: 'Visit the homepage branch',
      learn:
        "This repo has a **homepage** branch with one extra commit that adds `home.html`. You're on **main**, so `home.html` isn't in your folder. Check with `ls` if you like.\n\nSwitching doesn't just move HEAD: it also changes the files in your folder to match the branch. Run `git switch homepage`, then look again.",
      task: 'Switch to homepage and see `home.html` appear.',
      hints: ['Use `git switch` with the branch name.', 'Type `git switch homepage` and press Enter.'],
      solution: ['git switch homepage'],
      check: (c) => onBranch(c.world, 'homepage') && workFile(c.world, 'home.html') !== undefined,
      success: "**There's home.html.** Your folder now matches the last commit on **homepage**.",
    },
    {
      id: 'to-main',
      title: 'Go back to main',
      learn:
        "Now switch back with `git switch main`. `home.html` disappears from your folder, because **main** doesn't have it.\n\nIt isn't lost. It's saved in the commit on **homepage**, and it comes back whenever you switch there. That's why Git wants your changes committed (or put aside) before you switch.",
      task: 'Switch back to main.',
      hints: ['Same command, other branch name.', 'Type `git switch main` and press Enter.'],
      solution: ['git switch main'],
      check: (c) => onBranch(c.world, 'main') && workFile(c.world, 'home.html') === undefined,
      success: '**Back on main**, and `home.html` is gone from the folder, safe on its own branch.',
    },
    {
      id: 'create-and-switch',
      title: 'Make and switch in one step',
      learn:
        "You usually want to start working on a new branch right away. `git switch -c contact-page` makes the branch and moves you onto it in one go.\n- `-c` means \"create\".\n- `contact-page` is the new branch's name.\n\nThe new branch starts at the commit you're on, the tip of **main**.",
      task: 'Make a branch called contact-page and move onto it.',
      hints: ['Use `git switch` with the create option.', 'Type `git switch -c contact-page` and press Enter.'],
      solution: ['git switch -c contact-page'],
      check: (c) => onBranch(c.world, 'contact-page') && c.world.repo?.branches['contact-page'] === c.world.repo?.branches.main,
      success:
        '**Three branches now.** **contact-page** starts at the tip of **main**, and you are on it. `git switch -c` is the command you\'ll use most to start new work.',
    },
  ],
}
