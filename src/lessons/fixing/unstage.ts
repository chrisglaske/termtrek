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
  ],
}
