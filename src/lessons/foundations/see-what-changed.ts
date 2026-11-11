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
      id: 'stage',
      title: 'Stage the change',
      learn:
        'You can stage a change with `git add notes.txt`. Do that now, because the next command looks at what is staged.',
      task: 'Stage `notes.txt`.',
      hints: [
        'Use the Git command that adds a file to the staging area.',
        'Type `git add notes.txt` and press Enter.',
      ],
      solution: ['git add notes.txt'],
      check: (c) => isStaged(c.world, 'notes.txt'),
      success: '**Staged.** The change is chosen for your next commit.',
    },
    {
      id: 'staged',
      title: 'Check what you are about to commit',
      learn:
        "Once you stage a change, `git diff` shows nothing, because it only lists changes you haven't staged. To see what's staged, add an option: `git diff --staged`. It shows exactly what your next commit will contain. (`--cached` is an older name for the same option.)",
      task: 'Show the staged changes.',
      hints: [
        'Run the diff command with the option for staged changes.',
        'After `git diff`, add `--staged` at the end.',
        'Type `git diff --staged` and press Enter.',
      ],
      solution: ['git diff --staged'],
      check: (c) => !!lastDiff(c)?.some(isStagedFlag) && isStaged(c.world, 'notes.txt'),
      success:
        "**That's your next commit.** The same line now shows as staged, and **Staged** in **Your repo** reads 1. Reviewing this right before `git commit` is a habit that saves teams from surprises.",
    },
  ],
  pages: [
    {
      kind: 'read',
      id: 'question',
      kicker: 'The question',
      title: 'What exactly did I change?',
      body: 'You edited **notes.txt**. `git status` says the file changed, but not what is different inside it.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'] },
    },
    {
      kind: 'do',
      id: 'diff',
      kicker: 'Try it',
      title: 'Compare your changes',
      body: '`diff` is short for "difference". It shows every line you changed but have not staged yet.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'folder' },
      step: 0,
      command: [
        { text: 'git', say: 'talk to Git' },
        { text: 'diff', say: 'show what changed' },
      ],
      done: '**One line added.** It starts with +, so it is new in notes.txt.',
    },
    {
      kind: 'read',
      id: 'read',
      kicker: 'Reading the result',
      title: 'Plus is added, minus is removed',
      body: 'Lines that start with **+** were added. Lines that start with **-** were removed.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'habit',
      kicker: 'A good habit',
      title: 'Check the diff before you commit',
      body: 'It catches mistakes. It is also the best way to review edits an AI tool made for you.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'stage',
      kicker: 'Next',
      title: 'Choose the change',
      body: 'Stage it, like before.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'folder' },
      step: 1,
      command: [
        { text: 'git add', say: 'put it in the box' },
        { text: 'notes.txt', say: 'this file' },
      ],
      done: '**Staged.** The change is chosen for your next save.',
    },
    {
      kind: 'read',
      id: 'empty',
      kicker: 'A surprise',
      title: 'Now git diff shows nothing',
      body: 'Plain `git diff` only lists changes that are **not** staged yet. Add the option `--staged` to see what your next commit will hold. (`--cached` is an older name for the same option.)',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
    },
    {
      kind: 'do',
      id: 'staged',
      kicker: 'Try it',
      title: 'Check what you are about to save',
      body: 'Reviewing this right before `git commit` saves teams from surprises.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
      step: 2,
      command: [
        { text: 'git diff', say: 'show what changed' },
        { text: '--staged', say: 'only the chosen changes' },
      ],
      done: '**That is your next commit.** The same line, now in the Staged box.',
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You can review changes',
      body: 'You compared your changes, staged them and checked what the next commit holds.',
    },
  ],
}
