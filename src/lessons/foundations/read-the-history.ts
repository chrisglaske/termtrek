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
  pages: [
    {
      kind: 'read',
      id: 'start',
      kicker: 'The starting point',
      title: 'This project already has a history',
      body: 'It has a few commits. Git keeps them in order, like a list of saves.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'log',
      kicker: 'Try it',
      title: 'List the commits',
      body: 'Git names this after a ship\'s log, a record of what happened. It lists every commit on your branch, newest first.',
      visual: { kind: 'none' },
      step: 0,
      command: [
        { text: 'git', say: 'talk to Git' },
        { text: 'log', say: 'show the history' },
      ],
      done: '**Four commits, newest first.**',
      report: (world) => {
        const n = world.repo ? Object.keys(world.repo.commits).length : 0
        return n > 0 ? `Git listed ${n} commits. Each one starts with the word \`commit\` and its ID.` : null
      },
    },
    {
      kind: 'read',
      id: 'graph',
      kicker: 'The same story',
      title: 'Each commit is a dot',
      body: 'Here is the history as a picture. The oldest commit is on the left, and the label **main · HEAD** marks the newest.',
      visual: { kind: 'graph', all: true },
    },
    {
      kind: 'read',
      id: 'id',
      kicker: 'New word',
      title: 'Every commit has an ID',
      body: 'Each dot has an ID, a short code that names that exact snapshot. You use it when you want to point Git at one commit.',
      visual: { kind: 'graph', all: true },
    },
    {
      kind: 'read',
      id: 'long',
      kicker: 'A problem',
      title: 'Long histories are hard to read',
      body: 'A short view helps. Add the option `--oneline` and Git shows one line per commit: a short ID and the message.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'oneline',
      kicker: 'Try it',
      title: 'Get the short version',
      body: 'This is how most people skim a history.',
      visual: { kind: 'none' },
      step: 1,
      command: [
        { text: 'git log', say: 'show the history' },
        { text: '--oneline', say: 'one line each' },
      ],
      done: '**The whole story at a glance.** Messages that start with a verb are easy to scan.',
    },
    {
      kind: 'read',
      id: 'limit',
      kicker: 'One more option',
      title: 'Show only the newest few',
      body: '`git log -n 2` shows only the 2 newest commits. `-n` means "number", and you can use any number.',
      visual: { kind: 'none' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You can read the history',
      body: 'You listed the commits and got the short version. Next, you will see what changed inside a file.',
    },
  ],
}
