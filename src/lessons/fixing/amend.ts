import type { Lesson, StepContext } from '../schema'
import { headMessage, historyLength, isStaged, treeFile } from '../checks'
import { headCommitId } from '../../engine/git/repoState'
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
      id: 'stage',
      title: 'Stage the file you forgot',
      learn:
        'You also meant to include `agenda.txt` in that commit. Amend works for files too: stage the file with `git add agenda.txt`, then amend.',
      task: 'Stage `agenda.txt`.',
      hints: ['Use the Git command that adds a file to the staging area.', 'Type `git add agenda.txt` and press Enter.'],
      solution: ['git add agenda.txt'],
      check: (c) => isStaged(c.world, 'agenda.txt'),
      nudge: newCommitNudge,
      success: '**Staged.** `agenda.txt` is chosen, ready to join the last commit.',
    },
    {
      id: 'add-file',
      title: 'Add it to the last commit',
      learn:
        "`git commit --amend --no-edit` replaces the last commit with one that includes everything staged. `--no-edit` keeps the message as it is, so no editor opens.\n\n**One rule:** only amend commits you haven't shared yet. Amending swaps in a new commit, which causes trouble for anyone who already has the old one. For shared commits, use `git revert` instead, which comes up next. (Sharing with `git push` comes in Section 4.)",
      task: 'Add `agenda.txt` to the last commit and keep its message.',
      hints: [
        'Amend again, but keep the message as it is.',
        'Type `git commit --amend --no-edit` and press Enter.',
      ],
      solution: ['git commit --amend --no-edit'],
      check: (c) => treeFile(c.world, 'HEAD', 'agenda.txt') !== undefined && sameLength(c),
      nudge: newCommitNudge,
      success:
        "**One tidy commit.** It has the fixed message, the notes and the agenda, as if you'd gotten it right the first time. Amend is your go-to fix for the commit you just made.",
    },
  ],  pages: [
    {
      kind: 'read',
      id: 'situation',
      kicker: 'The problem',
      title: 'A typo in your last commit',
      body: 'The last commit says "Add the lanch date". Typos happen. You can fix the last commit as long as you have not shared it.',
      visual: { kind: 'graph', all: true },
    },
    {
      kind: 'read',
      id: 'idea',
      kicker: 'The idea',
      title: 'Amend swaps in a fixed copy',
      body: '`--amend` means "replace the last commit" instead of adding a new one. Nothing else in your history changes.',
      visual: { kind: 'graph', all: true },
    },
    {
      kind: 'do',
      id: 'message',
      kicker: 'Try it',
      title: 'Fix the message',
      body: 'Git opens the message in an editor. Fix the typo in the first line, then click **Save and close**. Lines that start with # are Git\'s notes to you and are left out.',
      visual: { kind: 'graph', all: true },
      step: 0,
      command: [
        { text: 'git commit', say: 'save a commit' },
        { text: '--amend', say: 'replace the last one' },
      ],
      done: '**Typo fixed.** The history is the same length, but the last commit has a new ID.',
      report: (world) => {
        const id = world.repo ? headCommitId(world.repo) : null
        return id ? `Amending does not edit a commit, it swaps in a fixed copy. The new one is \`${id.slice(0, 7)}\`.` : null
      },
    },
    {
      kind: 'read',
      id: 'forgot',
      kicker: 'Another slip',
      title: 'You forgot a file',
      body: 'You also meant to include **agenda.txt** in that commit. Amend works for files too: stage the file first, then amend.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'folder' },
    },
    {
      kind: 'do',
      id: 'stage',
      kicker: 'Try it',
      title: 'Stage the file',
      body: 'Stage it, like before.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'folder' },
      step: 1,
      command: [
        { text: 'git add', say: 'put it in the box' },
        { text: 'agenda.txt', say: 'this file' },
      ],
      done: '**Staged.** agenda.txt is chosen, ready to join the last commit.',
    },
    {
      kind: 'do',
      id: 'add-file',
      kicker: 'Try it',
      title: 'Add it to the last commit',
      body: '`--no-edit` keeps the message as it is, so no editor opens.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
      step: 2,
      command: [
        { text: 'git commit', say: 'save a commit' },
        { text: '--amend', say: 'replace the last one' },
        { text: '--no-edit', say: 'keep the message' },
      ],
      done: '**One tidy commit.** It has the fixed message, the notes and the agenda.',
    },
    {
      kind: 'read',
      id: 'rule',
      kicker: 'One rule',
      title: 'Only amend what you have not shared',
      body: 'Amending swaps in a new commit, which causes trouble for anyone who already has the old one. For shared commits use `git revert`, which comes next.',
      visual: { kind: 'none' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You can fix your last commit',
      body: 'You fixed a message and added a forgotten file, without leaving a trail of "oops" commits.',
    },
  ],
}
