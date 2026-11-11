import type { Lesson } from '../schema'
import { isStaged, ranGit } from '../checks'
import { IDENTITY, NOTES, README } from './sample'

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
}
