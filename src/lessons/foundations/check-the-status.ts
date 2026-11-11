import type { Lesson } from '../schema'
import { isStaged, ranGit } from '../checks'
import { getStatus } from '../../engine/git/repoState'
import { IDENTITY, NOTES, README } from '../sample'

export const checkTheStatus: Lesson = {
  id: 'check-the-status',
  section: 'foundations',
  title: 'Check the status',
  level: 'Beginner',
  minutes: 5,
  assumes: 'You have created a repo with `git init`.',
  setup: {
    cwd: 'project',
    files: { 'project/notes.txt': NOTES, 'project/README.md': README },
    config: IDENTITY,
    repo: { at: 'project' },
  },
  steps: [
    {
      id: 'status',
      title: 'Ask Git what it sees',
      learn:
        "`git status` is the command you'll run most. It tells you which branch you're on and which files have changed since your last snapshot. Run it whenever you're unsure what's going on.\n\nIn this repo, Git will list two **untracked** files. Untracked means Git can see the file but isn't keeping its history yet.",
      task: 'Check the status of the repo.',
      hints: [
        'One Git command answers "what is going on in this folder?"',
        'Type `git status` and press Enter.',
      ],
      solution: ['git status'],
      check: (c) => ranGit(c, 'status'),
      success:
        "**That's your checklist.** You're on **main**, there are no commits yet, and `notes.txt` and `README.md` are untracked. The **Folder** area in **Your repo** lists the same two files.",
    },
    {
      id: 'stage',
      title: 'Pick a file for the next snapshot',
      learn:
        "Git doesn't save every file automatically. You choose what goes into each snapshot by adding it to the **staging area**, a list of changes you've picked for the next commit. A **commit** is one saved snapshot.\n\nTo stage a file, run `git add notes.txt`. `add` puts a file on that list, and `notes.txt` is the file. Picking files one by one lets you keep unrelated changes in separate commits.",
      task: 'Stage `notes.txt`.',
      hints: [
        'Use the Git command that adds a file to the staging area, followed by the file name.',
        'Type `git add notes.txt` and press Enter.',
      ],
      solution: ['git add notes.txt'],
      check: (c) => isStaged(c.world, 'notes.txt'),
      success:
        '**Staged.** `notes.txt` is now on the list for your next commit, and the **Staged** count went up. Run `git status` again to see it under "Changes to be committed".',
    },
  ],
  pages: [
    {
      kind: 'read',
      id: 'question',
      kicker: 'The question',
      title: 'Which files does Git see?',
      body: 'You are in a repo with two files in it. Git can tell you what it sees at any time.',
      visual: { kind: 'stage', show: ['folder'] },
    },
    {
      kind: 'do',
      id: 'status',
      kicker: 'The command you will use most',
      title: 'Ask Git for the status',
      body: 'Run it whenever you are unsure what is going on.',
      visual: { kind: 'stage', show: ['folder'], hot: 'folder' },
      step: 0,
      command: [
        { text: 'git', say: 'talk to Git' },
        { text: 'status', say: 'what is going on?' },
      ],
      done: '**That is your checklist.** You are on **main**, nothing is saved yet, and both files are untracked.',
      report: (world) => {
        const n = getStatus(world)?.untracked.length ?? 0
        return n > 0 ? `Git listed ${n} ${n === 1 ? 'file' : 'files'} under "Untracked files".` : null
      },
    },
    {
      kind: 'read',
      id: 'untracked',
      kicker: 'New word',
      title: 'Untracked means not saved yet',
      body: 'Git can see the file, but it is not keeping the file\'s history yet.',
      visual: { kind: 'stage', show: ['folder'] },
    },
    {
      kind: 'read',
      id: 'staging',
      kicker: 'The big idea',
      title: 'You choose what goes into a save',
      body: 'Git does not save every file by itself. You pick files by adding them to the **staging area**, a list of changes chosen for the next save.',
      visual: { kind: 'stage', show: ['folder', 'staged'] },
    },
    {
      kind: 'do',
      id: 'add',
      kicker: 'Try it',
      title: 'Choose a file',
      body: '`add` puts a file on the list. Picking files one by one lets you keep unrelated changes in separate saves.',
      visual: { kind: 'stage', show: ['folder', 'staged'], hot: 'folder' },
      step: 1,
      command: [
        { text: 'git add', say: 'put it on the list' },
        { text: 'notes.txt', say: 'this file' },
      ],
      done: '**Staged.** notes.txt is on the list for your next save.',
    },
    {
      kind: 'read',
      id: 'again',
      kicker: 'Good habit',
      title: 'Check the status again',
      body: 'Run `git status` after staging and the file moves under "Changes to be committed". A **commit** is one saved snapshot, and you will make one soon.',
      visual: { kind: 'stage', show: ['folder', 'staged'], hot: 'staged' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You can read the status',
      body: 'You asked Git what it sees and chose a file for the next save.',
    },
  ],
}
