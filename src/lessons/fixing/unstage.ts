import type { Lesson } from '../schema'
import { historyLength, isStaged, treeFile, workFile } from '../checks'
import { DRAFT, IDENTITY, NOTES, NOTES_V2 } from '../sample'

export const unstage: Lesson = {
  id: 'unstage',
  section: 'fixing-mistakes',
  title: 'Unstage a file',
  level: 'Beginner',
  minutes: 4,
  assumes: 'You can stage and commit (Section 1).',
  setup: {
    cwd: 'project',
    config: IDENTITY,
    repo: {
      at: 'project',
      commits: [{ message: 'Add meeting notes', files: { 'notes.txt': NOTES } }],
      staged: { 'notes.txt': NOTES_V2, 'draft.txt': DRAFT },
    },
  },
  steps: [
    {
      id: 'unstage',
      title: 'Take a file out of the next commit',
      learn:
        "You added the launch date to `notes.txt` and staged it. Then `git add .` swept up `draft.txt` too, a file that isn't ready to share. Nothing is committed yet, so this is easy to fix.\n\nRun `git restore --staged draft.txt`:\n- `restore` puts a file back to an earlier version.\n- `--staged` says to restore only the staging area, so the file comes out of the next commit.\n- `draft.txt` is the file to unstage.\n\nYour file in the folder isn't touched, so you don't lose a word. `git status` even suggests this command under **Changes to be committed**. (Older tutorials use `git reset draft.txt`, which does the same thing.)",
      task: 'Unstage `draft.txt`, but keep the file.',
      hints: [
        'Use `git restore` with the option that only touches the staging area.',
        'Type `git restore --staged draft.txt` and press Enter.',
      ],
      solution: ['git restore --staged draft.txt'],
      check: (c) => !isStaged(c.world, 'draft.txt') && workFile(c.world, 'draft.txt') !== undefined,
      success:
        "**Unstaged.** `draft.txt` is back to untracked, and it's still in your folder. Only `notes.txt` is staged now. Check **Your repo** to see it.",
    },
    {
      id: 'commit',
      title: 'Commit just the notes',
      learn:
        'Now the staging area holds exactly what you meant to save: the new line in `notes.txt`. Commit it the usual way, for example `git commit -m "Add the launch date to the notes"`.',
      task: 'Commit the change to `notes.txt` without `draft.txt`.',
      hints: [
        'Only `notes.txt` is staged, so a normal commit saves just that.',
        'Type `git commit -m "Add the launch date to the notes"` and press Enter.',
      ],
      solution: ['git commit -m "Add the launch date to the notes"'],
      check: (c) =>
        historyLength(c.world) > historyLength(c.start) &&
        treeFile(c.world, 'HEAD', 'notes.txt') === NOTES_V2 &&
        treeFile(c.world, 'HEAD', 'draft.txt') === undefined,
      nudge: (c) => {
        if (historyLength(c.world) <= historyLength(c.start) || treeFile(c.world, 'HEAD', 'draft.txt') === undefined) return null
        return {
          kind: 'warn',
          text: '`draft.txt` went into that commit. Open the lesson menu (**…** at the top right) and choose **Reset this lesson**, then unstage it before you commit.',
        }
      },
      success:
        "**Just what you meant.** The commit has the launch date and nothing else. `draft.txt` waits in your folder until it's ready. Unstaging is the fix whenever `git add .` grabs more than you wanted.",
    },
  ],  pages: [
    {
      kind: 'read',
      id: 'situation',
      kicker: 'The problem',
      title: 'Too much is staged',
      body: 'You staged **notes.txt** on purpose. Then `git add .` also grabbed **draft.txt**, a file that is not ready to share. Nothing is saved yet, so this is easy to fix.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
    },
    {
      kind: 'read',
      id: 'safe',
      kicker: 'Good news',
      title: 'Unstaging loses nothing',
      body: 'It only changes the **Staged** box. Your file stays in the folder exactly as it is, so you do not lose a word.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
    },
    {
      kind: 'do',
      id: 'unstage',
      kicker: 'Try it',
      title: 'Take draft.txt out of the next save',
      body: '`restore` puts something back the way it was. The option `--staged` limits it to the Staged box.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'] },
      step: 0,
      command: [
        { text: 'git restore', say: 'put something back' },
        { text: '--staged', say: 'only in the Staged box' },
        { text: 'draft.txt', say: 'this file' },
      ],
      done: '**Unstaged.** draft.txt is out of the Staged box and still in your folder.',
    },
    {
      kind: 'read',
      id: 'hint',
      kicker: 'Good to know',
      title: 'Git tells you this command',
      body: '`git status` suggests it under **Changes to be committed**. Older guides use `git reset draft.txt`, which does the same thing.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'ready',
      kicker: 'Now',
      title: 'The Staged box holds the right thing',
      body: 'Only the new line in **notes.txt** is chosen. That is exactly what you meant to save.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
    },
    {
      kind: 'do',
      id: 'commit',
      kicker: 'Try it',
      title: 'Save just the notes',
      body: 'Save it the usual way.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
      step: 1,
      command: [
        { text: 'git commit', say: 'save what is chosen' },
        { text: '-m', say: 'add a message' },
        { text: '"Add the launch date to the notes"', say: 'the message' },
      ],
      done: '**Just what you meant.** The save has the launch date and nothing else. draft.txt waits in your folder.',
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You can unstage a file',
      body: 'Whenever `git add .` grabs more than you wanted, unstage the extras before you commit.',
    },
  ],
}
