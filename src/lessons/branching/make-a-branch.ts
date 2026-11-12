import type { Lesson } from '../schema'
import { branchExists, historyLength, onBranch, ranGit, workFile } from '../checks'
import { TWO_ON_MAIN } from './setups'

const HOME_LINE = 'Home page work happens on the homepage branch.'

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
      id: 'edit',
      title: 'Change a file on the branch',
      learn: `Make a change on the new branch. \`echo "${HOME_LINE}" >> README.md\` adds a line to the end of the README.`,
      task: 'Add a line to `README.md`.',
      hints: ['Use `echo` with `>>` so the README keeps its other lines.', `Type \`echo "${HOME_LINE}" >> README.md\` and press Enter.`],
      solution: [`echo "${HOME_LINE}" >> README.md`],
      check: (c) => (workFile(c.world, 'README.md') ?? '').includes(HOME_LINE) || historyLength(c.world, 'homepage') === 3,
      success: '**README changed.** Now save it on this branch.',
    },
    {
      id: 'commit',
      title: 'Commit on the branch',
      learn:
        'Commit the change. This time, save a step: `git commit -am` stages and commits in one go.\n- `-a` means "all": it stages every change to a file Git already tracks. New files still need `git add`.\n- `-m` is the message, as before. `-am` is the two together.\n\nType `git commit -am "docs: note the homepage branch"`.',
      task: 'Commit the change to `README.md` on homepage.',
      hints: ['Commit with `-am`, so the change is staged and saved in one go.', 'Type `git commit -am "docs: note the homepage branch"` and press Enter.'],
      solution: ['git commit -am "docs: note the homepage branch"'],
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
  pages: [
    {
      kind: 'read',
      id: 'idea',
      kicker: 'The idea',
      title: 'A branch is a movable label',
      body: 'So far every commit went on **main**. A **branch** is a label that points at a commit. When you commit, the label you are on moves forward. It is not a copy of your files.',
      visual: { kind: 'graph', branches: true },
    },
    {
      kind: 'read',
      id: 'head',
      kicker: 'You are here',
      title: 'HEAD marks where you are',
      body: '**HEAD** points at the branch you are on. In the picture it is the ring around the label.',
      visual: { kind: 'graph', branches: true },
    },
    {
      kind: 'do',
      id: 'list',
      kicker: 'Try it',
      title: 'See your branches',
      body: 'This lists every branch in the repo.',
      visual: { kind: 'graph', branches: true },
      step: 0,
      command: [
        { text: 'git', say: 'talk to Git' },
        { text: 'branch', say: 'list the branches' },
      ],
      done: '**One branch, main.** The star marks the branch you are on.',
    },
    {
      kind: 'read',
      id: 'why',
      kicker: 'Why branch',
      title: 'Try things without touching main',
      body: 'You want to start a home page, but keep **main** as it is until the page is ready. A branch gives that work its own label.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'create',
      kicker: 'Try it',
      title: 'Make a branch for the home page',
      body: 'Use short names with dashes instead of spaces, like `contact-page`. Nothing in your folder changes.',
      visual: { kind: 'graph', branches: true },
      step: 1,
      command: [
        { text: 'git branch', say: 'make a branch' },
        { text: 'homepage', say: 'with this name' },
      ],
      done: '**Two labels, one commit.** homepage sits on the same commit as main.',
    },
    {
      kind: 'read',
      id: 'not-yet',
      kicker: 'Look closely',
      title: 'You are still on main',
      body: 'Making a branch does not move you onto it. The ring is still around **main**.',
      visual: { kind: 'graph', branches: true },
    },
    {
      kind: 'do',
      id: 'switch',
      kicker: 'Try it',
      title: 'Move onto it',
      body: 'From now on, new commits go on **homepage**, and **main** stays where it is.',
      visual: { kind: 'graph', branches: true },
      step: 2,
      command: [
        { text: 'git switch', say: 'move to a branch' },
        { text: 'homepage', say: 'this one' },
      ],
      done: '**You are on homepage.** The prompt shows the branch name, and the ring moved.',
    },
    {
      kind: 'do',
      id: 'edit',
      kicker: 'Try it',
      title: 'Change a file on the branch',
      body: 'This adds a line to the end of the README. `>>` adds to a file instead of replacing it.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'folder' },
      step: 3,
      command: [
        { text: 'echo', say: 'print this text' },
        { text: '"Home page work happens on the homepage branch."', say: 'the text' },
        { text: '>>', say: 'add to a file' },
        { text: 'README.md', say: 'this one' },
      ],
      done: '**README changed.** Now save it on this branch.',
    },
    {
      kind: 'read',
      id: 'am',
      kicker: 'A shortcut',
      title: 'Stage and commit in one go',
      body: '`-a` means "all": it stages every change to a file Git already tracks, so you can skip `git add`. New files still need `git add`.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'commit',
      kicker: 'Try it',
      title: 'Commit on the branch',
      body: '`-am` is `-a` and `-m` together: stage everything, with this message.',
      visual: { kind: 'graph', branches: true },
      step: 4,
      command: [
        { text: 'git commit', say: 'save a commit' },
        { text: '-am', say: 'stage all, add a message' },
        { text: '"docs: note the homepage branch"', say: 'the message' },
      ],
      done: '**homepage moved ahead.** It is one commit past main, and main did not move.',
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You can make a branch',
      body: 'Your work lives on its own branch, and **main** stays exactly as everyone relies on it.',
    },
  ],
}
