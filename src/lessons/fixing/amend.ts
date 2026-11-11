import type { Lesson, StepContext } from '../schema'
import { headMessage, historyLength, treeFile } from '../checks'
import { AGENDA, IDENTITY, NOTES, NOTES_V2 } from '../sample'

const sameLength = (c: StepContext): boolean => historyLength(c.world) === historyLength(c.start)

/** A warn when the learner made a new commit instead of amending. */
const newCommitNudge = (c: StepContext) =>
  historyLength(c.world) > historyLength(c.start)
    ? {
        kind: 'warn' as const,
        text: "That made a new commit instead of fixing the last one. Open the lesson menu (**…** at the top right) and choose **Reset this lesson**, then use `git commit --amend`.",
      }
    : null

export const amend: Lesson = {
  id: 'amend',
  section: 'fixing-mistakes',
  title: 'Fix your last commit',
  level: 'Beginner',
  minutes: 6,
  assumes: 'You can stage files and write a clear commit message.',
  setup: {
    cwd: 'project',
    files: { 'project/agenda.txt': AGENDA },
    config: IDENTITY,
    repo: {
      at: 'project',
      commits: [
        { message: 'Add meeting notes', files: { 'notes.txt': NOTES } },
        { message: 'Add the lanch date', files: { 'notes.txt': NOTES_V2 } },
      ],
    },
  },
  steps: [
    {
      id: 'message',
      title: 'Fix a typo in the message',
      learn:
        "Your last commit says \"Add the lanch date\". Typos happen, and you can fix the last commit as long as you haven't shared it yet.\n\nRun `git commit --amend`. `--amend` means \"replace the last commit\" instead of adding a new one. Git opens the message in an **editor tab**, the way it would open your code editor on your own computer:\n1. Fix the typo in the first line. Lines that start with **#** are Git's notes to you and are left out of the message.\n2. Click **Save and close**. Git waits until you do, then saves the fixed commit.\n\nFor a quick fix you can skip the editor and give the new message right away: `git commit --amend -m \"Add the launch date\"`.",
      task: 'Change the last commit message to "Add the launch date".',
      hints: [
        'Use `git commit` with the option that replaces the last commit, then fix the message in the editor tab.',
        'Type `git commit --amend`, change "lanch" to "launch", then click **Save and close**.',
      ],
      solution: ['git commit --amend'],
      solve: [
        { type: 'run', line: 'git commit --amend' },
        { type: 'editor-done', text: 'Add the launch date' },
      ],
      check: (c) => /launch/.test(headMessage(c.world) ?? '') && sameLength(c),
      nudge: newCommitNudge,
      success:
        "**Typo fixed.** Look at **Your repo**: the history is the same length, but the last commit has a new ID. Amending doesn't edit a commit, it swaps in a fixed copy.",
    },
    {
      id: 'add-file',
      title: 'Add a file you forgot',
      learn:
        "You also meant to include `agenda.txt` in that commit. Amend works for files too: stage the file, then amend.\n\n1. `git add agenda.txt` stages it.\n2. `git commit --amend --no-edit` replaces the last commit with one that includes everything staged. `--no-edit` keeps the message as it is, so no editor opens.\n\n**One rule:** only amend commits you haven't shared yet. Amending swaps in a new commit, which causes trouble for anyone who already has the old one. For shared commits, use `git revert` instead, which comes up next. (Sharing with `git push` comes in Section 4.)",
      task: 'Add `agenda.txt` to the last commit and keep its message.',
      hints: [
        'Stage `agenda.txt` first, then amend without changing the message.',
        'Type `git add agenda.txt`, then `git commit --amend --no-edit`.',
      ],
      solution: ['git add agenda.txt', 'git commit --amend --no-edit'],
      check: (c) => treeFile(c.world, 'HEAD', 'agenda.txt') !== undefined && sameLength(c),
      nudge: newCommitNudge,
      success:
        "**One tidy commit.** It has the fixed message, the notes and the agenda, as if you'd gotten it right the first time. Amend is your go-to fix for the commit you just made.",
    },
  ],
}
