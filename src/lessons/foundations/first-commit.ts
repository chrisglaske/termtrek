import type { Lesson } from '../schema'
import { commitCount, isStaged, isTracked } from '../checks'
import { IDENTITY, NOTES } from './sample'

export const firstCommit: Lesson = {
  id: 'first-commit',
  section: 'foundations',
  title: 'Your first commit',
  level: 'Beginner',
  minutes: 5,
  assumes: 'You can check the status and stage a file.',
  setup: {
    cwd: 'project',
    files: { 'project/notes.txt': NOTES },
    config: IDENTITY,
    repo: { at: 'project' },
  },
  steps: [
    {
      id: 'stage',
      title: 'Stage the notes',
      learn:
        'Saving work in Git takes two moves: first you stage what you want to save, then you commit it. This repo has one untracked file, `notes.txt`.\n\nStage it with `git add notes.txt`, just like last time.',
      task: 'Stage `notes.txt`.',
      hints: [
        'Staging uses the Git command that adds a file to the list for the next commit.',
        'Type `git add notes.txt` and press Enter.',
      ],
      solution: ['git add notes.txt'],
      // Also passes when the learner stages and commits in one line.
      check: (c) => isStaged(c.world, 'notes.txt') || isTracked(c.world, 'notes.txt'),
      success: '**Ready to save.** `notes.txt` is staged. One command left to make it part of your history.',
    },
    {
      id: 'commit',
      title: 'Save the snapshot',
      learn:
        'A **commit** saves everything in the staging area as one snapshot, with a short message that says what changed.\n\nRun `git commit -m "Add meeting notes"`:\n- `commit` saves the snapshot.\n- `-m` means "message", and the text in quotes after it is the message.\n\nThe quotes matter: they keep the whole message together, spaces and all.',
      task: 'Commit `notes.txt` with a short message.',
      hints: [
        'Use the Git command that saves a snapshot, with your message after `-m`.',
        'Put the message in quotes, for example "Add meeting notes".',
        'Type `git commit -m "Add meeting notes"` and press Enter.',
      ],
      solution: ['git commit -m "Add meeting notes"'],
      check: (c) => commitCount(c.world) === 1 && isTracked(c.world, 'notes.txt'),
      success:
        "**Snapshot saved.** Git gave your commit an ID, the short code inside the brackets in the output, and **main** now points at it. In **Your repo**, it's the first dot in your history. From now on, you can always get this version back.",
    },
  ],
}
