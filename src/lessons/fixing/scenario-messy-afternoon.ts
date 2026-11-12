import type { Lesson, StepContext } from '../schema'
import { headMessage, historyLength, isStaged, messageQuality, ranGit, treeFile, workFile } from '../checks'
import { headTree } from '../../engine/git/repoState'
import { DRAFT, IDENTITY, NOTES, NOTES_JUNK, NOTES_V2, README } from '../sample'

const treeOf = (c: StepContext, which: 'start' | 'world'): string => JSON.stringify(c[which].repo ? headTree(c[which].repo) : {})

export const scenarioMessyAfternoon: Lesson = {
  id: 'scenario-messy-afternoon',
  section: 'fixing-mistakes',
  title: 'Scenario: a messy afternoon',
  level: 'Intermediate',
  minutes: 6,
  assumes: 'You can unstage, discard an edit and amend a commit.',
  setup: {
    cwd: 'project',
    files: { 'project/notes.txt': NOTES_JUNK },
    config: IDENTITY,
    repo: {
      at: 'project',
      commits: [
        { message: 'docs: add meeting notes', files: { 'notes.txt': NOTES, 'README.md': README } },
        { message: 'fix', files: { 'notes.txt': NOTES_V2 } },
      ],
      staged: { 'draft.txt': DRAFT },
    },
  },
  steps: [
    {
      id: 'unstage',
      title: 'Keep the draft out',
      learn:
        "It's late, and the repo is a mess. Run `git status` to see it: `draft.txt` is staged but isn't ready, `notes.txt` has a line pasted by mistake, and your last commit is called \"fix\", which tells nobody anything.\n\nYou know how to fix all three. This time there's no command to copy. First, take `draft.txt` out of the next commit, but keep the file.",
      task: 'Unstage `draft.txt` and keep it in your folder.',
      hints: [
        'This was the first lesson in this section: restore only the staging area.',
        'Use `git restore` with `--staged` and the file name.',
        'Type `git restore --staged draft.txt`.',
      ],
      solution: ['git restore --staged draft.txt'],
      check: (c) => !isStaged(c.world, 'draft.txt') && workFile(c.world, 'draft.txt') !== undefined,
      success: '**One down.** `draft.txt` is safe in your folder and out of the next commit.',
    },
    {
      id: 'discard',
      title: 'Throw away the stray line',
      learn: 'Next, `notes.txt`. Check the change if you like, then throw it away so the file matches your last commit.',
      task: 'Make `notes.txt` match the last commit again.',
      hints: [
        'Restore the file in your folder, with no option this time.',
        'Use `git restore` and the file name.',
        'Type `git restore notes.txt`.',
      ],
      solution: ['git restore notes.txt'],
      check: (c) => workFile(c.world, 'notes.txt') === treeFile(c.world, 'HEAD', 'notes.txt') && !isStaged(c.world, 'notes.txt'),
      nudge: (c) =>
        isStaged(c.world, 'notes.txt')
          ? { kind: 'warn', text: 'The stray line is staged. Unstage it with `git restore --staged notes.txt` first, then restore the file.' }
          : null,
      success: "**Two down.** The stray line is gone. Only the commit message is left.",
    },
    {
      id: 'reword',
      title: 'Give the last commit a real message',
      learn:
        'Finally, the commit called "fix". It added the launch date to `notes.txt`. Replace its message with one that says so, without adding a new commit and without changing what\'s in it.',
      task: 'Give the last commit a clear message.',
      hints: [
        'You fixed a commit message in the amend lesson. Use the editor tab, or give the message with `-m`.',
        'Use `git commit --amend`, with or without `-m`.',
        'Type `git commit --amend -m "docs: add the launch date"`.',
      ],
      solution: ['git commit --amend -m "docs: add the launch date"'],
      check: (c) =>
        messageQuality(headMessage(c.world) ?? '').ok &&
        treeOf(c, 'world') === treeOf(c, 'start') &&
        historyLength(c.world) === historyLength(c.start),
      nudge: (c) => {
        if (historyLength(c.world) !== historyLength(c.start) || treeOf(c, 'world') !== treeOf(c, 'start')) {
          return {
            kind: 'warn',
            text: 'That changed more than the message. Open the lesson menu (**…** at the top right) and choose **Reset this lesson** to start the afternoon over.',
          }
        }
        if (!ranGit(c, 'commit')) return null
        const q = messageQuality(headMessage(c.world) ?? '')
        return q.ok ? null : { kind: 'warn', text: `${q.reason} Amend the commit again with a better message.` }
      },
      success:
        "**All clean.** The draft is waiting in your folder, the notes are tidy, and the history says what happened. That's the whole Fixing mistakes toolkit: unstage, discard, amend, revert, reset and reflog. You never need to be afraid to try things in Git.",
    },
  ],
}
