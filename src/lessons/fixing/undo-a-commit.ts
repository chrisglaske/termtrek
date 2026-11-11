import type { Lesson } from '../schema'
import { headMessage, historyLength, ranGit, workFile } from '../checks'
import { headCommitId } from '../../engine/git/repoState'
import { IDENTITY, NOTES, NOTES_V2 } from '../sample'

const LAUNCH_LINE = 'We launch on Friday.'

export const undoACommit: Lesson = {
  id: 'undo-a-commit',
  section: 'fixing-mistakes',
  title: 'Undo a commit safely',
  level: 'Beginner',
  minutes: 5,
  assumes: 'You can read the history with git log.',
  setup: {
    cwd: 'project',
    config: IDENTITY,
    repo: {
      at: 'project',
      commits: [
        { message: 'Add meeting notes', files: { 'notes.txt': NOTES } },
        { message: 'Add the launch date', files: { 'notes.txt': NOTES_V2 } },
        { message: 'Remove the launch date', files: { 'notes.txt': NOTES } },
      ],
    },
  },
  steps: [
    {
      id: 'find',
      title: 'Find the commit to undo',
      learn:
        "Someone removed the launch date from `notes.txt`, but the launch is still on. That change is already in the shared history, so you can't just amend it away.\n\nStart by finding the commit. Run `git log` and look for the one that removed the date.",
      task: 'Show the history.',
      hints: ['The command that lists commits is named after a ship\'s log.', 'Type `git log` and press Enter.'],
      solution: ['git log'],
      check: (c) => ranGit(c, 'log'),
      success:
        '**There it is.** "Remove the launch date" is the newest commit, the one **HEAD** points at.',
    },
    {
      id: 'revert',
      title: 'Undo it with a new commit',
      learn:
        "Run `git revert HEAD`:\n- `revert` makes a **new** commit that does the exact opposite of an old one. Lines it removed come back, and lines it added go away.\n- `HEAD` means the commit you're on now, the newest one here. You can also use any commit's ID from `git log`.\n\nThe old commit stays in the history, so nothing is rewritten. That's why revert is the safe way to undo a commit you've already shared.\n\nGit opens the message in the editor tab, already written for you: `Revert \"Remove the launch date\"`. It's fine as it is, so click **Save and close**. (To skip the editor and keep that message, add `--no-edit`: `git revert --no-edit HEAD`.)",
      task: 'Undo the "Remove the launch date" commit.',
      hints: [
        'Use `git revert` with the commit you want to undo. The newest commit is `HEAD`.',
        'Type `git revert HEAD`, then click **Save and close** in the editor tab.',
      ],
      solution: ['git revert HEAD'],
      solve: [{ type: 'run', line: 'git revert HEAD' }, { type: 'editor-done' }],
      check: (c) =>
        (headMessage(c.world) ?? '').startsWith('Revert "Remove the launch date"') &&
        (workFile(c.world, 'notes.txt') ?? '').includes(LAUNCH_LINE) &&
        historyLength(c.world) === historyLength(c.start) + 1,
      success:
        "**The date is back.** Your history now tells the whole story: the date was removed, then put back. Nothing was rewritten, so anyone who already has the old commits just gets one more.",
    },
  ],  pages: [
    {
      kind: 'read',
      id: 'situation',
      kicker: 'The problem',
      title: 'A change needs to come back',
      body: 'Someone removed the launch date from **notes.txt**, but the launch is still on. That change is already shared, so you cannot just amend it away.',
      visual: { kind: 'graph', all: true },
    },
    {
      kind: 'do',
      id: 'find',
      kicker: 'Try it',
      title: 'Find the commit to undo',
      body: '`git log` lists your commits, newest first. Look for the one that removed the date.',
      visual: { kind: 'graph', all: true },
      step: 0,
      command: [
        { text: 'git', say: 'talk to Git' },
        { text: 'log', say: 'list the commits' },
      ],
      done: '**There it is.** "Remove the launch date" is the newest commit, the one HEAD points at.',
    },
    {
      kind: 'read',
      id: 'idea',
      kicker: 'The idea',
      title: 'Undo by adding, not erasing',
      body: '`git revert` makes a **new** commit that does the exact opposite of an old one. Lines it removed come back, and lines it added go away.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'safe',
      kicker: 'Why it is safe',
      title: 'Nothing is rewritten',
      body: 'The old commit stays in the history. Anyone who already has it just gets one more commit. That is why revert is the way to undo shared work.',
      visual: { kind: 'graph', all: true },
    },
    {
      kind: 'do',
      id: 'revert',
      kicker: 'Try it',
      title: 'Undo it with a new commit',
      body: '`HEAD` is the commit you are on, the newest one here. Git opens a message that is already written for you. It is fine as it is: click **Save and close**.',
      visual: { kind: 'graph', all: true },
      step: 1,
      command: [
        { text: 'git revert', say: 'undo a commit' },
        { text: 'HEAD', say: 'the newest one' },
      ],
      done: '**The date is back.** The history now says: the date was removed, then put back.',
      report: (world) => {
        const id = world.repo ? headCommitId(world.repo) : null
        return id ? `Git added a new commit, \`${id.slice(0, 7)}\`, that undoes the old one. Nothing was erased.` : null
      },
    },
    {
      kind: 'read',
      id: 'no-edit',
      kicker: 'A shortcut',
      title: 'Skip the editor',
      body: 'Add `--no-edit` to keep the ready-made message: `git revert --no-edit HEAD`. You can also revert any commit by its ID from `git log`.',
      visual: { kind: 'none' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You can undo a shared commit',
      body: 'Revert undoes a commit by adding a new one, so nothing in the history is rewritten.',
    },
  ],
}
