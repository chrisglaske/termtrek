import type { Lesson } from '../schema'
import { isStaged, ranGit, treeFile, workFile } from '../checks'
import { IDENTITY, NOTES_JUNK, NOTES_V2, README } from '../sample'

export const discardChanges: Lesson = {
  id: 'discard-changes',
  section: 'fixing-mistakes',
  title: 'Throw away an edit',
  level: 'Beginner',
  minutes: 4,
  assumes: 'You can unstage a file and read a diff.',
  setup: {
    cwd: 'project',
    files: { 'project/notes.txt': NOTES_JUNK },
    config: IDENTITY,
    repo: {
      at: 'project',
      commits: [
        { message: 'Add README with a project summary', files: { 'README.md': README } },
        { message: 'Add meeting notes with the launch date', files: { 'notes.txt': NOTES_V2 } },
      ],
    },
  },
  steps: [
    {
      id: 'look',
      title: 'Look before you throw away',
      learn:
        "Something went wrong in `notes.txt`: a line got pasted in by mistake. Maybe it was you, maybe an AI tool. Before you throw an edit away, check what it is, so you don't lose something you wanted.\n\nRun `git diff` to see every change you haven't staged.",
      task: 'Show the changes in `notes.txt`.',
      hints: ['You learned the command that shows unstaged changes in Section 1.', 'Type `git diff` and press Enter.'],
      solution: ['git diff'],
      check: (c) => ranGit(c, 'diff'),
      success:
        '**One junk line.** The line that starts with **+** is the mistake. Everything else in the file matches your last commit.',
    },
    {
      id: 'restore',
      title: 'Put the file back',
      learn:
        "To throw the edit away, run `git restore notes.txt`:\n- `restore` puts a file back to an earlier version.\n- With no option, it restores the file in your folder from the staging area, which matches your last commit here.\n\nBe careful: this is one of the few Git commands you can't undo. Git never saved the edit, so once it's gone, it's gone for good. That's why you looked first.\n\nOlder tutorials use `git checkout -- notes.txt` for the same thing. `git status` suggests `git restore` under **Changes not staged for commit**.",
      task: 'Throw away the change to `notes.txt`.',
      hints: [
        'Use `git restore` with the file name, and no option this time.',
        'Type `git restore notes.txt` and press Enter.',
      ],
      solution: ['git restore notes.txt'],
      check: (c) => workFile(c.world, 'notes.txt') === treeFile(c.world, 'HEAD', 'notes.txt') && !isStaged(c.world, 'notes.txt'),
      nudge: (c) => {
        if (!isStaged(c.world, 'notes.txt')) return null
        return {
          kind: 'warn',
          text: "The junk line is staged, so `git restore notes.txt` copies it right back from the staging area. Unstage it first with `git restore --staged notes.txt`, then run `git restore notes.txt` again.",
        }
      },
      success:
        "**Gone.** `notes.txt` matches your last commit again, and **Your repo** shows nothing changed. When you're sure an edit is a mistake, this is the quickest way out.",
    },
  ],
}
