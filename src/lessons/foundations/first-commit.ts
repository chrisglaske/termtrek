import type { Explain } from '../../engine/types'
import type { Lesson, StepContext } from '../schema'
import { commitCount, isStaged, isTracked } from '../checks'
import { IDENTITY, NOTES } from '../sample'
import { headCommitId } from '../../engine/git/repoState'

const lastWords = (c: StepContext): string[] => (c.ran[c.ran.length - 1] ?? '').trim().split(/\s+/)
const printed = (c: StepContext): string => (c.last?.lines ?? []).map((l) => l.map((s) => s.text).join('')).join('\n')

/** Plain words for the slips a first-timer makes while staging. */
function stageNudge(c: StepContext): Explain | null {
  const w = lastWords(c)
  if (w[0] === 'notes.txt')
    return { kind: 'tip', text: 'That is the file name on its own. Start with `git add` so Git knows what to do with it: `git add notes.txt`.' }
  if (w[0] !== 'git' || w[1] !== 'add') return null
  if (w.length === 2)
    return { kind: 'tip', text: 'Almost. Git also needs to know **which** file to stage, so put its name after `git add`: `git add notes.txt`.' }
  if (printed(c).includes('did not match any files'))
    return { kind: 'tip', text: 'Git found no file with that exact name. Check the spelling: `notes.txt`, with `.txt` at the end.' }
  return null
}

/** Plain words for the slips a first-timer makes while committing. */
function commitNudge(c: StepContext): Explain | null {
  const w = lastWords(c)
  if (w[0] !== 'git' || w[1] !== 'commit') return null
  if (w[w.length - 1] === '-m')
    return { kind: 'tip', text: 'Almost. Add your message after `-m`, inside quotes: `git commit -m "Add meeting notes"`.' }
  if (printed(c).includes('unknown option'))
    return { kind: 'tip', text: 'Put the whole message inside quotes, so Git reads all the words as one message: `git commit -m "Add meeting notes"`.' }
  return null
}

export const firstCommit: Lesson = {
  id: 'first-commit',
  section: 'foundations',
  title: 'Your first commit',
  level: 'Beginner',
  minutes: 5,
  assumes: 'You can check the status and stage a file.',
  setup: {
    cwd: 'project',
    files: { 'project/notes.txt': NOTES },
    config: IDENTITY,
    repo: { at: 'project' },
  },
  steps: [
    {
      id: 'stage',
      title: 'Stage the notes',
      learn:
        'Saving work in Git takes two moves: first you stage what you want to save, then you commit it. This repo has one untracked file, `notes.txt`.\n\nStage it with `git add notes.txt`, just like last time.',
      task: 'Stage `notes.txt`.',
      hints: [
        'Staging uses the Git command that adds a file to the list for the next commit.',
        'Type `git add notes.txt` and press Enter.',
      ],
      solution: ['git add notes.txt'],
      // Also passes when the learner stages and commits in one line.
      check: (c) => isStaged(c.world, 'notes.txt') || isTracked(c.world, 'notes.txt'),
      nudge: stageNudge,
      success: '**Ready to save.** `notes.txt` is staged. One command left to make it part of your history.',
    },
    {
      id: 'commit',
      title: 'Save the snapshot',
      learn:
        'A **commit** saves everything in the staging area as one snapshot, with a short message that says what changed.\n\nRun `git commit -m "Add meeting notes"`:\n- `commit` saves the snapshot.\n- `-m` means "message", and the text in quotes after it is the message.\n\nThe quotes matter: they keep the whole message together, spaces and all.',
      task: 'Commit `notes.txt` with a short message.',
      hints: [
        'Use the Git command that saves a snapshot, with your message after `-m`.',
        'Put the message in quotes, for example "Add meeting notes".',
        'Type `git commit -m "Add meeting notes"` and press Enter.',
      ],
      solution: ['git commit -m "Add meeting notes"'],
      check: (c) => commitCount(c.world) === 1 && isTracked(c.world, 'notes.txt'),
      nudge: commitNudge,
      success:
        "**Snapshot saved.** Git gave your commit an ID, the short code inside the brackets in the output, and **main** now points at it. In **Your repo**, it's the first dot in your history. From now on, you can always get this version back.",
    },
  ],  pages: [
    {
      kind: 'read',
      id: 'start',
      kicker: 'The starting point',
      title: 'You have a project with a file in it',
      body: 'This project folder has one file, **notes.txt**. Git can keep every version of your files, but only the versions you ask it to save.',
      visual: { kind: 'stage', show: ['folder'] },
    },
    {
      kind: 'read',
      id: 'idea',
      kicker: 'The big idea',
      title: 'Saving takes two small moves',
      body: 'First you **choose** what to save. Then you **save** it. Think of packing a box, then taping it shut.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'] },
    },
    {
      kind: 'do',
      id: 'stage',
      kicker: 'Move 1 of 2',
      title: 'Choose the file',
      body: 'Choosing a file for the next save is called **staging**. Type the command into the terminal below and press Enter.',
      visual: { kind: 'stage', show: ['folder', 'staged'], hot: 'folder' },
      step: 0,
      command: [
        { text: 'git add', say: 'put it in the box' },
        { text: 'notes.txt', say: 'this file' },
      ],
      done: '**Staged.** notes.txt is chosen, but not saved yet.',
      note: 'The start of the terminal line is the **prompt**: `~/project` is the folder you are in, `(main)` is the name of the line of work you are on (you will learn more about this later), and `$` means it is waiting for you to type.',
    },
    {
      kind: 'do',
      id: 'commit',
      kicker: 'Move 2 of 2',
      title: 'Save it',
      body: 'Now tape the box shut. Saving what you staged is called a **commit**, and every commit gets a short message that says what changed.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
      step: 1,
      command: [
        { text: 'git commit', say: 'save what is chosen' },
        { text: '-m', say: 'add a message' },
        { text: '"Add meeting notes"', say: 'the message' },
      ],
      done: '**Committed.** Your first save is done.',
      report: (world) => {
        const repo = world.repo
        const id = repo ? headCommitId(repo) : null
        const commit = id ? repo?.commits[id] : undefined
        if (!commit) return null
        const parent = commit.parents[0] ? repo?.commits[commit.parents[0]] : undefined
        const files = Object.keys(commit.tree).filter((p) => commit.tree[p] !== parent?.tree[p]).length
        return `Git printed a short report: \`${commit.id.slice(0, 7)}\` is your commit's ID, and it saved ${files} ${files === 1 ? 'file' : 'files'}.`
      },
    },
    {
      kind: 'read',
      id: 'graph',
      kicker: 'What just happened',
      title: 'That dot is your commit',
      body: 'Each commit becomes a dot in your project\'s history. The label **main · HEAD** means "you are here", and the short code is the commit\'s ID, the same one Git printed in the terminal.',
      visual: { kind: 'graph' },
    },
    {
      kind: 'read',
      id: 'safe',
      kicker: 'Why it matters',
      title: 'Your work is now safe',
      body: 'This snapshot stays exactly as it is. If you change **notes.txt** later, you can always get this version back.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'saved' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You made your first commit',
      body: "You chose a file and saved it as a snapshot. That's the loop you'll use every day with Git.",
    },
  ],
}
