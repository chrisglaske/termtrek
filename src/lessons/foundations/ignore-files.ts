import type { Lesson } from '../schema'
import { isTracked } from '../checks'
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
        { message: 'Add meeting notes', files: { 'notes.txt': NOTES } },
        { message: 'Add README with a project summary', files: { 'README.md': README } },
      ],
    },
  },
  steps: [
    {
      id: 'gitignore',
      title: 'Tell Git what to skip',
      learn:
        "Some files should never be committed. `.env` holds a secret key, and `debug.log` is a log your tools write. Once a secret is in the history, anyone who gets a copy of the repo can read it. (Files whose names start with a dot are hidden. `ls -a` shows them.)\n\nA `.gitignore` file lists names Git should skip, one per line. Create it with `echo \".env\" > .gitignore`. `echo` prints text, and `>` sends that text into a file instead of the screen, creating or replacing the file. Then add a second line with `echo \"debug.log\" >> .gitignore`. `>>` adds to the end of the file instead of replacing it.\n\nRun `git status` afterwards to check that both files are gone from the list.",
      task: 'Create a `.gitignore` that hides `.env` and `debug.log` from Git.',
      hints: [
        'Write one name per line into a file called `.gitignore`. Use `>` for the first line and `>>` for the next.',
        'Start with `echo ".env" > .gitignore`.',
        'Run `echo ".env" > .gitignore`, then `echo "debug.log" >> .gitignore`.',
      ],
      solution: ['echo ".env" > .gitignore', 'echo "debug.log" >> .gitignore', 'git status'],
      check: (c) => hasIgnoreFile(c.world) && staysOut(c.world),
      nudge: (c) => {
        const repo = c.world.repo
        if (!repo || !SECRETS.some((f) => f in repo.index)) return null
        return {
          kind: 'warn',
          text: "A secret file is staged, and `.gitignore` can't hide a file once it's staged. Open the lesson menu (**…** at the top right) and choose **Reset this lesson** to start clean. You'll learn how to unstage files in Fixing mistakes.",
        }
      },
      success:
        "**Hidden from Git.** `git status` won't list `.env` or `debug.log` anymore, and `git add .`, which stages every change in the folder at once, skips them too. The files are still on your computer; Git just won't save them. Only `.gitignore` itself is left to commit. Tip: the pattern `*.log` skips every file that ends in `.log`.",
    },
    {
      id: 'commit',
      title: 'Commit the ignore file',
      learn:
        '`.gitignore` is a normal file, so commit it like any other. That way everyone on your team, and every copy of the repo, skips the same files.',
      task: 'Stage and commit `.gitignore` with a clear message.',
      hints: [
        'Stage `.gitignore` first, then commit it. Describe what the commit does.',
        'Use `git add .gitignore`, then `git commit -m` with your message in quotes.',
        'Type `git add .gitignore`, then `git commit -m "Ignore secrets and log files"`.',
      ],
      solution: ['git add .gitignore', 'git commit -m "Ignore secrets and log files"'],
      check: (c) => isTracked(c.world, '.gitignore') && SECRETS.every((f) => !isTracked(c.world, f)),
      success:
        "**Your team is protected too.** `.gitignore` is now part of the history, and the **Folder** area in **Your repo** is empty again. Secrets stay on your machine.",
    },
  ],
}
