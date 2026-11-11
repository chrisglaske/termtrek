import type { Lesson } from '../schema'
import { ranGit, segmentsOf } from '../checks'
import { IDENTITY, NOTES, NOTES_V2, README, README_V2 } from '../sample'

/** `git log --oneline`, `git log -n 2`, `git log -3` and friends. */
const isShortLog = (words: string[]): boolean =>
  words[0] === 'git' && words[1] === 'log' && words.slice(2).some((w) => w === '--oneline' || /^-(n|\d)/.test(w) || w.startsWith('--max-count'))

export const readTheHistory: Lesson = {
  id: 'read-the-history',
  section: 'foundations',
  title: 'Read the history',
  level: 'Beginner',
  minutes: 4,
  assumes: 'You can make a commit with a clear message.',
  setup: {
    cwd: 'project',
    config: IDENTITY,
    repo: {
      at: 'project',
      commits: [
        { message: 'Add meeting notes', files: { 'notes.txt': NOTES } },
        { message: 'Add README with a project summary', files: { 'README.md': README } },
        { message: 'Add Friday launch to meeting notes', files: { 'notes.txt': NOTES_V2 } },
        { message: 'Explain how to name meeting files', files: { 'README.md': README_V2 } },
      ],
    },
  },
  steps: [
    {
      id: 'log',
      title: 'List the commits',
      learn:
        'This repo has a few commits already. To see them, run `git log`. It lists every commit on your branch, newest first.\n\nEach entry shows the commit **ID**, a code that names that exact snapshot, then who made it, when, and the message. You use the ID whenever you want to point Git at one specific commit.',
      task: 'Show the history of this repo.',
      hints: [
        "The Git command for this is named after a ship's log, a record of what happened.",
        'Type `git log` and press Enter.',
      ],
      solution: ['git log'],
      check: (c) => ranGit(c, 'log'),
      success:
        '**Four commits, newest first.** Each one is a dot in **Your repo**, and the top entry is the one **main** points at. Good messages make this list easy to scan.',
    },
    {
      id: 'oneline',
      title: 'Get the short version',
      learn:
        'Long histories get hard to read. Add an option to make the list shorter:\n- `git log --oneline` shows one line per commit: a short ID and the message.\n- `git log -n 2` shows only the 2 newest commits. `-n` means "number", and you can use any number.',
      task: 'Show the history in a shorter form.',
      hints: [
        'Use `git log` with an option that makes each commit take one line, or one that limits how many you see.',
        'Type `git log --oneline` and press Enter.',
      ],
      solution: ['git log --oneline'],
      check: (c) => c.ran.some((line) => segmentsOf(line).some(isShortLog)),
      success:
        "**The whole story at a glance.** This short view is how most people skim a history. It's also why messages that start with a verb, like \"Add\" or \"Explain\", are worth the effort.",
    },
  ],
}
