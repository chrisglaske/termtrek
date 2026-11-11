import type { Lesson } from '../schema'
import { inSync, ranAfter, ranGit, serverTip, trackingTip, workFile } from '../checks'
import { CLONED, VENUE, alexAddsVenue } from './setups'

export const fetchAndPull: Lesson = {
  id: 'fetch-and-pull',
  section: 'team',
  title: "Get your team's new work",
  level: 'Beginner',
  minutes: 7,
  assumes: 'You can push your commits to the server.',
  setup: CLONED,
  steps: [
    {
      id: 'status-first',
      title: 'Check the status',
      learn:
        'Teammates push too. Check where you stand with `git status`.\n\nIt says "up to date", even though the server just changed. Git only knows what it last fetched: it does not call the server by itself. It compares you with its memory, **origin/main**, which is out of date.',
      task: 'Run `git status` and notice what it says.',
      hints: ['You know this one.', 'Type `git status` and press Enter.'],
      solution: ['git status'],
      event: { apply: alexAddsVenue, note: '**Alex Kim** just pushed a commit to **main** on the server.' },
      check: (c) => ranGit(c, 'status'),
      success: '**Out of date, but it does not know.** Open the **Remote** tab: the server has a commit that **origin/main** in your repo does not.',
    },
    {
      id: 'fetch',
      title: 'Fetch',
      learn:
        'Run `git fetch`. It asks the server what is new and downloads it into your repo, updating **origin/main**. It does not touch your branch or your files, so it is always safe.\n\nThen run `git status` again.',
      task: 'Fetch, then check the status.',
      hints: ['Fetching downloads without changing your files.', 'Type `git fetch`, then `git status`.'],
      solution: ['git fetch', 'git status'],
      check: (c) => trackingTip(c.world, 'origin/main') === serverTip(c.world, 'main') && ranAfter(c, 'fetch', 'status'),
      nudge: (c) =>
        ranGit(c, 'pull') && !ranGit(c, 'fetch')
          ? { kind: 'tip', text: 'That was a pull, which is a fetch plus a merge, so it changed your files too. This lesson is about the fetch half on its own: run `git fetch` in full, then `git status`.' }
          : null,
      success: '**Behind by 1.** Now Git knows. Your **main** is one commit behind **origin/main**, and your files have not changed yet.',
    },
    {
      id: 'pull',
      title: 'Pull',
      learn: 'Bring the new commit into your branch with `git pull`. Pull is a fetch followed by a merge: it downloads, then merges **origin/main** into **main**. Because you have no commits of your own to combine, it simply moves forward.',
      task: "Pull your teammate's commit.",
      hints: ['One word after `git`.', 'Type `git pull` and press Enter.'],
      solution: ['git pull'],
      check: (c) => inSync(c.world, 'main') && (workFile(c.world, 'notes.txt') ?? '').includes(VENUE),
      success: '**You have the venue line.** `notes.txt` now includes it, and **main** matches the server again.',
    },
  ],
}
