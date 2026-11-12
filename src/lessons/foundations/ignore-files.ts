import type { Lesson, StepContext } from '../schema'
import { isStaged, isTracked, ranGit } from '../checks'
import { getStatus } from '../../engine/git/repoState'
import type { World } from '../../engine/types'
import { IDENTITY, NOTES, README } from '../sample'

const SECRETS = ['.env', 'debug.log']

const hasIgnoreFile = (w: World): boolean => !!w.repo && `${w.repo.root}/.gitignore` in w.files

/** Neither secret is listed as untracked or sitting in the staging area. */
const staysOut = (w: World): boolean => {
  const s = getStatus(w)
  return !!s && !!w.repo && SECRETS.every((f) => !s.untracked.includes(f) && !(f in w.repo!.index))
}

/** A file is neither listed as untracked nor sitting in the staging area. */
const hidden = (w: World, name: string): boolean => {
  const s = getStatus(w)
  return !!s && !!w.repo && !s.untracked.includes(name) && !(name in w.repo.index)
}

const stagedSecretNudge = (c: StepContext) => {
  const repo = c.world.repo
  if (!repo || !SECRETS.some((f) => f in repo.index)) return null
  return {
    kind: 'warn' as const,
    text: "A secret file is staged, and `.gitignore` can't hide a file once it's staged. Open the lesson menu (**…** at the top right) and choose **Reset this lesson** to start clean. You'll learn how to unstage files in Fixing mistakes.",
  }
}

export const ignoreFiles: Lesson = {
  id: 'ignore-files',
  section: 'foundations',
  title: 'Ignore files',
  level: 'Beginner',
  minutes: 6,
  assumes: 'You can check the status and make a commit.',
  setup: {
    cwd: 'project',
    files: { 'project/.env': 'API_KEY=sk-live-4f9a2c7e\n', 'project/debug.log': 'Started at 09:00\nLoaded 2 files\n' },
    config: IDENTITY,
    repo: {
      at: 'project',
      commits: [
        { message: 'docs: add meeting notes', files: { 'notes.txt': NOTES } },
        { message: 'docs: add README with a project summary', files: { 'README.md': README } },
      ],
    },
  },
  steps: [
    {
      id: 'ignore-env',
      title: 'Hide the secret key',
      learn:
        "Some files should never be committed. `.env` holds a secret key. A `.gitignore` file lists names Git should skip, one per line. Create it with `echo \".env\" > .gitignore`. `echo` prints text, and `>` sends that text into a file instead of the screen, creating or replacing the file.",
      task: 'Create a `.gitignore` that hides `.env` from Git.',
      hints: [
        'Write the name into a file called `.gitignore`. Use `>` to create the file.',
        'Type `echo ".env" > .gitignore` and press Enter.',
      ],
      solution: ['echo ".env" > .gitignore'],
      check: (c) => hasIgnoreFile(c.world) && hidden(c.world, '.env'),
      nudge: stagedSecretNudge,
      success: '**One line written.** `.env` has left the list of files Git sees.',
    },
    {
      id: 'ignore-log',
      title: 'Hide the log file',
      learn:
        "`debug.log` is a log your tools write, so it should be skipped too. Add a second line with `echo \"debug.log\" >> .gitignore`. `>>` adds to the end of the file instead of replacing it.",
      task: 'Add `debug.log` to the `.gitignore`.',
      hints: [
        'Use `echo` again, but with `>>` so the first line stays.',
        'Type `echo "debug.log" >> .gitignore` and press Enter.',
      ],
      solution: ['echo "debug.log" >> .gitignore'],
      check: (c) => hasIgnoreFile(c.world) && staysOut(c.world),
      nudge: stagedSecretNudge,
      success: '**Both files hidden.** The only new file left is `.gitignore` itself.',
    },
    {
      id: 'status',
      title: 'Check what Git sees now',
      learn:
        "Run `git status` to check that both files are gone from the list. They are still on your computer; Git just won't save them. (Files whose names start with a dot are hidden. `ls -a` shows them.)",
      task: 'Check the status of the repo.',
      hints: ['Ask Git what it sees.', 'Type `git status` and press Enter.'],
      solution: ['git status'],
      check: (c) => ranGit(c, 'status') && hasIgnoreFile(c.world) && staysOut(c.world),
      success:
        "**Hidden from Git.** `git status` won't list `.env` or `debug.log` anymore, and `git add .`, which stages every change in the folder at once, skips them too. Only `.gitignore` itself is left to commit. Tip: the pattern `*.log` skips every file that ends in `.log`.",
    },
    {
      id: 'stage',
      title: 'Stage the ignore file',
      learn:
        '`.gitignore` is a normal file, so stage it like any other with `git add .gitignore`. That way everyone on your team, and every copy of the repo, skips the same files.',
      task: 'Stage `.gitignore`.',
      hints: [
        'Use the Git command that adds a file to the staging area.',
        'Type `git add .gitignore` and press Enter.',
      ],
      solution: ['git add .gitignore'],
      check: (c) => isStaged(c.world, '.gitignore') || isTracked(c.world, '.gitignore'),
      success: '**Staged.** One command left.',
    },
    {
      id: 'commit',
      title: 'Commit the ignore file',
      learn: 'Commit it with a clear message that says what it does, for example `git commit -m "chore: ignore secrets and logs"`. Upkeep like this gets the `chore` type.',
      task: 'Commit `.gitignore` with a clear message.',
      hints: [
        'Use `git commit -m` with your message in quotes.',
        'Type `git commit -m "chore: ignore secrets and logs"`.',
      ],
      solution: ['git commit -m "chore: ignore secrets and logs"'],
      check: (c) => isTracked(c.world, '.gitignore') && SECRETS.every((f) => !isTracked(c.world, f)),
      success:
        "**Your team is protected too.** `.gitignore` is now part of the history, and the **Folder** area in **Your repo** is empty again. Secrets stay on your machine.",
    },
  ],
  pages: [
    {
      kind: 'read',
      id: 'problem',
      kicker: 'The problem',
      title: 'Some files should stay private',
      body: '**.env** holds a secret key. **debug.log** is a log your tools write. Once a secret is in the history, anyone with a copy of the repo can read it.',
      visual: { kind: 'stage', show: ['folder'] },
    },
    {
      kind: 'read',
      id: 'gitignore',
      kicker: 'The fix',
      title: 'A .gitignore lists what Git should skip',
      body: 'It is a file with one name per line. Git skips every file listed in it.',
      visual: { kind: 'stage', show: ['folder'] },
    },
    {
      kind: 'read',
      id: 'echo',
      kicker: 'Writing a file',
      title: 'You can write a file from the terminal',
      body: '`echo` prints text. The `>` sign sends that text into a file instead of the screen, creating or replacing the file.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'env',
      kicker: 'Line 1 of 2',
      title: 'Hide the secret key',
      body: 'This makes a new file named `.gitignore` with one line in it.',
      visual: { kind: 'stage', show: ['folder'], hot: 'folder' },
      step: 0,
      command: [
        { text: 'echo', say: 'print this text' },
        { text: '".env"', say: 'the text' },
        { text: '>', say: 'into a file' },
        { text: '.gitignore', say: 'with this name' },
      ],
      done: '**One line written.** `.env` has left the list of files Git sees.',
    },
    {
      kind: 'read',
      id: 'append',
      kicker: 'Line 2 of 2',
      title: 'Add a second line',
      body: 'The `>>` sign adds to the end of a file instead of replacing it.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'log',
      kicker: 'Line 2 of 2',
      title: 'Hide the log file',
      body: 'Same command, but with `>>` so the first line stays.',
      visual: { kind: 'stage', show: ['folder'], hot: 'folder' },
      step: 1,
      command: [
        { text: 'echo', say: 'print this text' },
        { text: '"debug.log"', say: 'the text' },
        { text: '>>', say: 'add to a file' },
        { text: '.gitignore', say: 'with this name' },
      ],
      done: '**Both files hidden.** The only new file left is `.gitignore` itself.',
    },
    {
      kind: 'read',
      id: 'check',
      kicker: 'Make sure',
      title: 'Check what Git sees now',
      body: 'Run `git status` and look at the list. Both files should be gone from it.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'status',
      kicker: 'Make sure',
      title: 'Ask Git for the status',
      body: 'The files are still on your computer. Git just will not save them.',
      visual: { kind: 'stage', show: ['folder'] },
      step: 2,
      command: [
        { text: 'git', say: 'talk to Git' },
        { text: 'status', say: 'what do you see?' },
      ],
      done: '**Hidden from Git.** Only `.gitignore` is left to commit.',
    },
    {
      kind: 'read',
      id: 'pattern',
      kicker: 'Good to know',
      title: 'Patterns save typing',
      body: 'The pattern `*.log` skips every file that ends in `.log`. And `git add .`, which stages everything at once, skips ignored files too.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'share',
      kicker: 'Last move',
      title: '.gitignore is a normal file',
      body: 'Commit it like any other, so everyone on your team skips the same files.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'] },
    },
    {
      kind: 'do',
      id: 'stage',
      kicker: 'Step 1 of 2',
      title: 'Choose the ignore file',
      body: 'Stage it, like any other file.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'folder' },
      step: 3,
      command: [
        { text: 'git add', say: 'put it in the box' },
        { text: '.gitignore', say: 'this file' },
      ],
      done: '**Staged.** One command left.',
    },
    {
      kind: 'do',
      id: 'commit',
      kicker: 'Step 2 of 2',
      title: 'Save it',
      body: 'Describe what the commit does. Upkeep like this gets the **chore** type.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
      step: 4,
      command: [
        { text: 'git commit', say: 'save what is chosen' },
        { text: '-m', say: 'add a message' },
        { text: '"chore: ignore secrets and logs"', say: 'the message' },
      ],
      done: '**Your team is protected too.** Secrets stay on your machine.',
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'Secrets stay out of Git',
      body: 'Your `.gitignore` is part of the history, so every copy of the repo skips the same files.',
    },
  ],
}
