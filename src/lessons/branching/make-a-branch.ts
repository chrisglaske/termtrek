import type { Lesson } from '../schema'
import { branchExists, historyLength, onBranch, ranGit } from '../checks'
import { TWO_ON_MAIN } from './setups'

export const makeABranch: Lesson = {
  id: 'make-a-branch',
  section: 'branching',
  title: 'Make a branch',
  level: 'Beginner',
  minutes: 6,
  assumes: 'You can make commits and read the history.',
  setup: TWO_ON_MAIN,
  steps: [
    {
      id: 'list',
      title: 'See your branches',
      learn:
        "So far every commit has gone on **main**. A **branch** is just a label that points at a commit. When you commit, the label you're on moves forward to the new commit. That's all a branch is: a movable label, not a copy of your files.\n\n**HEAD** means \"you are here\". It points at the branch you're on. In **Your repo**, it's the ring around the label.\n\nRun `git branch` to list your branches.",
      task: 'List the branches in this repo.',
      hints: ['The command is `git` plus the word for a line of work.', 'Type `git branch` and press Enter.'],
      solution: ['git branch'],
      check: (c) => ranGit(c, 'branch'),
      success: '**One branch, main.** The star marks the branch HEAD is on, the one your next commit will move.',
    },
    {
      id: 'create',
      title: 'Make a branch for the home page',
      learn:
        "You want to start a home page without touching **main** until it's ready. Make a branch for it: `git branch homepage`.\n- `branch` with a name makes a new label.\n- `homepage` is the name. Use short names with dashes instead of spaces, like `contact-page`.\n\nThe new label points at the same commit you're on. Nothing in your folder changes.",
      task: 'Make a branch called homepage.',
      hints: ['Use `git branch` followed by the new name.', 'Type `git branch homepage` and press Enter.'],
      solution: ['git branch homepage'],
      check: (c) => branchExists(c.world, 'homepage'),
      success:
        "**Two labels, one commit.** In **Your repo**, **homepage** sits on the same commit as **main**. You're still on **main**, though: making a branch doesn't move you onto it.",
    },
    {
      id: 'switch',
      title: 'Move onto it',
      learn:
        'To work on the new branch, move HEAD onto it with `git switch homepage`.\n- `switch` moves you to another branch.\n- `homepage` is the branch to move to.\n\nFrom now on, new commits go on **homepage**, and **main** stays where it is.',
      task: 'Switch to the homepage branch.',
      hints: ['Use `git switch` with the branch name.', 'Type `git switch homepage` and press Enter.'],
      solution: ['git switch homepage'],
      check: (c) => onBranch(c.world, 'homepage'),
      success: "**You're on homepage.** The prompt shows the branch name, and the HEAD ring moved to **homepage** in **Your repo**.",
    },
    {
      id: 'commit',
      title: 'Commit on the branch',
      learn:
        "Make a change and commit it. This time, save a step: `git commit -am` stages and commits in one go.\n- `-a` means \"all\": it stages every change to a file Git already tracks. New files still need `git add`.\n- `-m` is the message, as before. `-am` is the two together.\n\n1. `echo \"Home page work happens on the homepage branch.\" >> README.md` adds a line to the README.\n2. `git commit -am \"Note where home page work happens\"` saves it.",
      task: 'Change `README.md` and commit it on homepage.',
      hints: [
        'Add a line to `README.md` with `echo` and `>>`, then commit with `-am`.',
        'Type `echo "Home page work happens on the homepage branch." >> README.md`, then `git commit -am "Note where home page work happens"`.',
      ],
      solution: [
        'echo "Home page work happens on the homepage branch." >> README.md',
        'git commit -am "Note where home page work happens"',
      ],
      check: (c) => historyLength(c.world, 'homepage') === 3 && c.world.repo?.branches.main === c.start.repo?.branches.main,
      nudge: (c) => {
        if (c.world.repo?.branches.main !== c.start.repo?.branches.main) {
          return {
            kind: 'warn',
            text: 'That commit went on **main**, not **homepage**. Open the lesson menu (**…** at the top right) and choose **Reset this lesson** to try again.',
          }
        }
        if (ranGit(c, 'commit') && c.last?.exitCode !== 0) {
          return { kind: 'tip', text: 'There was nothing to commit yet. Change `README.md` first with `echo` and `>>`, then commit.' }
        }
        return null
      },
      success:
        "**homepage moved ahead.** In **Your repo**, **homepage** is one commit past **main**, and **main** didn't move. That's the point of a branch: try things without touching the work everyone relies on.",
    },
  ],
}
