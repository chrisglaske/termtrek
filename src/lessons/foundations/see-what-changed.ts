import type { Lesson, StepContext } from '../schema'
import { isStaged, segmentsOf } from '../checks'
import { getStatus } from '../../engine/git/repoState'
import { IDENTITY, NOTES, NOTES_V2, README } from '../sample'

/** The words of the `git diff` command in the line just run, if there is one. */
const lastDiff = (c: StepContext): string[] | undefined =>
  segmentsOf(c.ran.at(-1) ?? '').find((s) => s[0] === 'git' && s[1] === 'diff')

const isStagedFlag = (w: string): boolean => w === '--staged' || w === '--cached'

export const seeWhatChanged: Lesson = {
  id: 'see-what-changed',
  section: 'foundations',
  title: 'See what changed',
  level: 'Beginner',
  minutes: 5,
  assumes: 'You can stage and commit changes.',
  setup: {
    cwd: 'project',
    files: { 'project/notes.txt': NOTES_V2 },
    config: IDENTITY,
    repo: {
      at: 'project',
      commits: [
        { message: 'Add meeting notes', files: { 'notes.txt': NOTES } },
        { message: 'Add README with a project summary', files: { 'README.md': README } },
      ],
    },
  },
  steps: [
    {
      id: 'diff',
      title: 'Compare your changes',
      learn:
        "`git status` tells you which files changed. To see what changed inside them, run `git diff`. It shows every line you've changed but not staged yet.\n\nLines that start with **+** were added, and lines that start with **-** were removed. Checking the diff before you commit catches mistakes, and it's the best way to review edits an AI tool made for you.",
      task: 'Show the changes in `notes.txt`.',
      hints: [
        'One Git command shows the difference between your files and what Git has saved.',
        'Type `git diff` and press Enter.',
      ],
      solution: ['git diff'],
      check: (c) => {
        const d = lastDiff(c)
        return !!d && c.last?.exitCode === 0 && (c.last?.lines.length ?? 0) > 0
      },
      nudge: (c) => {
        const d = lastDiff(c)
        if (!d || d.some(isStagedFlag) || (c.last?.lines.length ?? 0) > 0) return null
        if (!(getStatus(c.world)?.staged.length ?? 0)) return null
        return {
          kind: 'tip',
          text: "`git diff` shows nothing because you've already staged the change. To see staged changes, run `git diff --staged`.",
        }
      },
      success:
        '**One line added.** The line that starts with **+** is new in `notes.txt`. Check **Your repo** to see which area the change is in.',
    },
    {
      id: 'staged',
      title: 'Check what you are about to commit',
      learn:
        "Once you stage a change, `git diff` shows nothing, because it only lists changes you haven't staged. To see what's staged, add an option: `git diff --staged`. It shows exactly what your next commit will contain. (`--cached` is an older name for the same option.)\n\nStage the change with `git add notes.txt`, then run `git diff --staged`.",
      task: 'Stage `notes.txt`, then show the staged changes.',
      hints: [
        'Two commands: stage the file, then run the diff with the option for staged changes.',
        'After `git add notes.txt`, run `git diff` with `--staged` at the end.',
        'Type `git add notes.txt`, then `git diff --staged`.',
      ],
      solution: ['git add notes.txt', 'git diff --staged'],
      check: (c) => !!lastDiff(c)?.some(isStagedFlag) && isStaged(c.world, 'notes.txt'),
      success:
        "**That's your next commit.** The same line now shows as staged, and **Staged** in **Your repo** reads 1. Reviewing this right before `git commit` is a habit that saves teams from surprises.",
    },
  ],
}
