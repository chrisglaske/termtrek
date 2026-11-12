import type { Lesson, StepContext } from '../schema'
import { isClean, onBranch, ranGit, treeFile, workFile } from '../checks'
import type { Explain } from '../../engine/types'
import { HOME_PAGE_WIP, UNFINISHED_HOMEPAGE } from './setups'

/** A warn when the learner popped the stash on main, where `home.html` is different. */
const poppedOnMain = (c: StepContext): Explain | null =>
  onBranch(c.world, 'main') && workFile(c.world, 'home.html') !== treeFile(c.world, 'HEAD', 'home.html')
    ? {
        kind: 'warn',
        text: "That put the homepage work onto **main**, where `home.html` is different, so the two clashed. The shelf entry is kept. Run `git restore home.html` to undo it on main, then `git switch homepage` and `git stash pop` there.",
      }
    : null

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
      id: 'back',
      title: 'Go back to your branch',
      learn:
        'Done on **main**? Go back with `git switch homepage`. Pop on the branch you stashed from: popping somewhere else puts the work on the wrong branch.',
      task: 'Switch back to homepage.',
      hints: ['Switch the way you always do.', 'Type `git switch homepage` and press Enter.'],
      solution: ['git switch homepage'],
      check: (c) => onBranch(c.world, 'homepage'),
      nudge: poppedOnMain,
      success: '**Back on homepage**, where the edit belongs.',
    },
    {
      id: 'pop',
      title: 'Bring your work back',
      learn: 'Take the work off the shelf with `git stash pop`.\n- `pop` puts the newest stash entry back in your folder and removes it from the shelf.',
      task: 'Get your edit back.',
      hints: ['Take the newest entry off the shelf.', 'Type `git stash pop` and press Enter.'],
      solution: ['git stash pop'],
      check: (c) =>
        onBranch(c.world, 'homepage') && c.world.repo?.stash.length === 0 && workFile(c.world, 'home.html') === HOME_PAGE_WIP,
      nudge: poppedOnMain,
      success:
        '**Back where you left off.** Your edit is in `home.html` and the shelf is empty. Stash is for short breaks: if the work will wait more than a day, commit it on its branch instead.',
    },
  ],
  pages: [
    {
      kind: 'read',
      id: 'situation',
      kicker: 'The setup',
      title: 'Halfway through an edit',
      body: 'You are changing **home.html** on **homepage**, and someone asks you to check something on **main**. main has its own, different home.html.',
      visual: { kind: 'stage', show: ['folder'], hot: 'folder' },
    },
    {
      kind: 'do',
      id: 'refused',
      kicker: 'Try it',
      title: 'Try to switch',
      body: 'Git will refuse, and that is a good thing.',
      visual: { kind: 'stage', show: ['folder'], hot: 'folder' },
      step: 0,
      command: [
        { text: 'git switch', say: 'move to a branch' },
        { text: 'main', say: 'this one' },
      ],
      done: '**Refused, and your edit is safe.** Switching would have replaced it with main\'s version.',
    },
    {
      kind: 'read',
      id: 'shelf',
      kicker: 'The idea',
      title: 'A shelf for unfinished work',
      body: 'Your edit is not ready to commit. The **stash** takes your uncommitted changes, puts them on a shelf and makes your folder clean.',
      visual: { kind: 'stage', show: ['folder'], hot: 'folder' },
    },
    {
      kind: 'do',
      id: 'stash',
      kicker: 'Try it',
      title: 'Put the edit on the shelf',
      body: 'Watch the folder.',
      visual: { kind: 'stage', show: ['folder'], hot: 'folder' },
      step: 1,
      command: [
        { text: 'git', say: 'talk to Git' },
        { text: 'stash', say: 'shelve my changes' },
      ],
      done: '**Shelved.** Your folder matches the last commit on homepage.',
    },
    {
      kind: 'do',
      id: 'visit-main',
      kicker: 'Try it',
      title: 'Go check main',
      body: 'Now nothing is in the way.',
      visual: { kind: 'graph', branches: true },
      step: 2,
      command: [
        { text: 'git switch', say: 'move to a branch' },
        { text: 'main', say: 'this one' },
      ],
      done: '**On main.** Your unfinished edit is waiting on the shelf.',
    },
    {
      kind: 'read',
      id: 'list',
      kicker: 'Good to know',
      title: 'You can look at the shelf',
      body: '`git stash list` shows what is on it. Each entry is named like **stash@{0}**, newest first.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'where',
      kicker: 'Before you take it back',
      title: 'Unshelve where you shelved',
      body: 'Taking work off the shelf puts it in the folder of the branch you are on. So go back to **homepage** first.',
      visual: { kind: 'graph', branches: true },
    },
    {
      kind: 'do',
      id: 'back',
      kicker: 'Try it',
      title: 'Go back to your branch',
      body: 'Same command, other branch.',
      visual: { kind: 'graph', branches: true },
      step: 3,
      command: [
        { text: 'git switch', say: 'move to a branch' },
        { text: 'homepage', say: 'this one' },
      ],
      done: '**Back on homepage**, where the edit belongs.',
    },
    {
      kind: 'do',
      id: 'pop',
      kicker: 'Try it',
      title: 'Bring your work back',
      body: '`pop` puts the newest entry back in your folder and takes it off the shelf.',
      visual: { kind: 'stage', show: ['folder'], hot: 'folder' },
      step: 4,
      command: [
        { text: 'git stash', say: 'the shelf' },
        { text: 'pop', say: 'take the newest back' },
      ],
      done: '**Back where you left off.** Your edit is in home.html and the shelf is empty.',
    },
    {
      kind: 'read',
      id: 'short',
      kicker: 'To remember',
      title: 'Stash is for short breaks',
      body: 'If the work will wait more than a day, commit it on its branch instead.',
      visual: { kind: 'none' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You can put work aside',
      body: 'Stash, switch, come back, pop. Your unfinished work is never in the way.',
    },
  ],
}
