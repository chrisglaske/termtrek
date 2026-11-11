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
  ],  pages: [
    {
      kind: 'read',
      id: 'situation',
      kicker: 'The problem',
      title: 'A stray line crept in',
      body: 'A line was pasted into **notes.txt** by mistake. Maybe it was you, maybe an AI tool. You want the file back the way it was.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'folder' },
    },
    {
      kind: 'do',
      id: 'look',
      kicker: 'Try it',
      title: 'Look before you throw anything away',
      body: 'Check what the edit is first, so you do not lose something you wanted. `git diff` shows every change you have not staged.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'folder' },
      step: 0,
      command: [
        { text: 'git', say: 'talk to Git' },
        { text: 'diff', say: 'show what changed' },
      ],
      done: '**One junk line.** The line that starts with + is the mistake. Everything else matches your last save.',
      report: () => 'Git compared your file with your last save. A line that starts with `+` was added, and one that starts with `-` was removed.',
    },
    {
      kind: 'read',
      id: 'careful',
      kicker: 'Be careful',
      title: 'This one cannot be undone',
      body: 'The command you are about to use throws the edit away for good. Git never saved it, so it cannot bring it back. That is why you looked first.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'scope',
      kicker: 'What it touches',
      title: 'Only the one file you name',
      body: 'Your saved commits stay safe. Only this unsaved edit goes.',
      visual: { kind: 'graph', all: true },
    },
    {
      kind: 'do',
      id: 'restore',
      kicker: 'Try it',
      title: 'Put the file back',
      body: '`restore` puts a file back the way it was in your last save.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'folder' },
      step: 1,
      command: [
        { text: 'git restore', say: 'put something back' },
        { text: 'notes.txt', say: 'this file' },
      ],
      done: '**Gone.** notes.txt matches your last save again, and nothing is left to commit.',
    },
    {
      kind: 'read',
      id: 'older',
      kicker: 'Good to know',
      title: 'Older guides say checkout',
      body: 'You may see `git checkout -- notes.txt` in older guides. It does the same thing. `git status` suggests `git restore` under **Changes not staged for commit**.',
      visual: { kind: 'none' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You can throw away an edit',
      body: 'When you are sure an edit is a mistake, this is the quickest way out. Look first, then restore.',
    },
  ],
}
