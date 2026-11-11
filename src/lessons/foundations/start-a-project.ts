import type { Lesson } from '../schema'
import { commitCount, hasIdentity, inRepo, isClean, isTracked, ranGit } from '../checks'

export const startAProject: Lesson = {
  id: 'start-a-project',
  section: 'foundations',
  title: 'Scenario: start a real project',
  level: 'Intermediate',
  minutes: 8,
  assumes: 'You know every command from the Foundations lessons.',
  setup: { cwd: '' },
  steps: [
    {
      id: 'identity',
      title: 'Set up Git on a new computer',
      learn:
        "Time to put it all together. You're starting a small website and want Git from the very first file. This is a fresh computer: there's no project yet, and Git doesn't know who you are.\n\nDo each step from memory. If you get stuck, Hint walks you to the exact command.",
      task: 'Give Git your name and email.',
      hints: [
        'Git needs two settings, `user.name` and `user.email`, saved with `--global`.',
        'Both use `git config --global`, followed by the setting and its value in quotes.',
        'Run `git config --global user.name "Sam Rivera"`, then `git config --global user.email "sam@example.com"`.',
      ],
      solution: ['git config --global user.name "Sam Rivera"', 'git config --global user.email "sam@example.com"'],
      check: (c) => hasIdentity(c.world),
      success: '**Git knows you.** Every commit in this project will carry your name and email.',
    },
    {
      id: 'repo',
      title: 'Create the project',
      learn:
        "Your website needs its own folder. Make one with `mkdir site`. `mkdir` means \"make directory\", and `site` is the new folder's name. Then move into it with `cd site` and start a repo there.",
      task: 'Create a **site** folder, move into it, and make it a Git repository.',
      hints: [
        'Three commands: make the folder, move into it, then start a repo. Check that the prompt shows `~/site` before the last one.',
        'After `mkdir site` and `cd site`, use the command that initializes a repo.',
        'Run `mkdir site`, then `cd site`, then `git init`.',
      ],
      solution: ['mkdir site', 'cd site', 'git init'],
      check: (c) => inRepo(c.world, 'site'),
      nudge: (c) => {
        const repo = c.world.repo
        if (!repo || repo.root === `${c.world.home}/site`) return null
        return {
          kind: 'warn',
          text: 'That repo was created outside the **site** folder. Open the lesson menu (**…** at the top right) and choose **Reset this lesson**, then make the folder and `cd site` before you start the repo.',
        }
      },
      success: '**Repo ready.** The prompt shows `~/site` and **main**. No commits yet.',
    },
    {
      id: 'page',
      title: 'Add the first page',
      learn:
        'Every website starts with a home page. Create one with `echo "Welcome to my site" > index.html`. As before, `>` writes the text into a new file.',
      task: 'Create `index.html`, then stage and commit it.',
      hints: [
        'Create the file, stage it, then commit it with a message that says what it adds.',
        'Use `git add index.html`, then `git commit -m` with a message like "Add home page".',
        'Run `echo "Welcome to my site" > index.html`, `git add index.html`, then `git commit -m "Add home page"`.',
      ],
      solution: ['echo "Welcome to my site" > index.html', 'git add index.html', 'git commit -m "Add home page"'],
      check: (c) => isTracked(c.world, 'index.html'),
      success: '**First commit.** Your home page is safe in the history, and **Your repo** shows one commit on **main**.',
    },
    {
      id: 'ignore',
      title: 'Keep secrets out',
      learn:
        "Websites often need a `.env` file for passwords and keys. Set up a `.gitignore` before that file exists, so it can never be committed by accident.",
      task: 'Create a `.gitignore` that ignores `.env`, then commit it.',
      hints: [
        'Write `.env` into a file called `.gitignore`, then stage and commit that file.',
        'Use `echo ".env" > .gitignore`, then `git add .gitignore` and `git commit -m` with a clear message.',
        'Run `echo ".env" > .gitignore`, `git add .gitignore`, then `git commit -m "Ignore environment files"`.',
      ],
      solution: ['echo ".env" > .gitignore', 'git add .gitignore', 'git commit -m "Ignore environment files"'],
      check: (c) => isTracked(c.world, '.gitignore'),
      success: '**Protected from day one.** Anyone who copies this repo gets the same rules, so `.env` stays private for the whole team.',
    },
    {
      id: 'review',
      title: 'Check your work',
      learn:
        'Before you walk away, confirm everything is saved. `git status` should report nothing to commit, and `git log --oneline` should list both commits.',
      task: 'Confirm that the working folder is clean and both commits are in the history.',
      hints: [
        'Ask Git for the status. If anything is left over, stage and commit it.',
        'Run `git status`. It should say "nothing to commit, working tree clean".',
      ],
      solution: ['git status'],
      check: (c) => (ranGit(c, 'status') || ranGit(c, 'log')) && commitCount(c.world) >= 2 && isClean(c.world),
      success:
        "**Project started the right way.** Your name is on every commit, the history reads clearly, and secrets can't slip in. That's the same setup professional teams use for every new repo.",
    },
  ],
}
