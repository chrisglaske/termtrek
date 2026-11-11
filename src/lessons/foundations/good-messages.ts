import type { Lesson, StepContext } from '../schema'
import { commitCount, isStaged, messageQuality } from '../checks'
import { headCommitId } from '../../engine/git/repoState'
import { IDENTITY, NOTES, README, README_V2 } from '../sample'

const SETUP_COMMITS = 1

const latestMessage = (c: StepContext): string => {
  const repo = c.world.repo
  const id = repo ? headCommitId(repo) : null
  return (id && repo?.commits[id]?.message) || ''
}

export const goodMessages: Lesson = {
  id: 'good-messages',
  section: 'foundations',
  title: 'Write good commit messages',
  level: 'Beginner',
  minutes: 6,
  assumes: 'You can stage a file and make a commit.',
  setup: {
    cwd: 'project',
    files: { 'project/README.md': README_V2 },
    config: IDENTITY,
    repo: { at: 'project', commits: [{ message: 'Add meeting notes and README', files: { 'notes.txt': NOTES, 'README.md': README } }] },
  },
  steps: [
    {
      id: 'stage',
      title: 'Stage your change',
      learn:
        "This repo already has one commit. Since then, someone added a line to `README.md` about how to name meeting files. To read a file in the terminal, run `cat README.md`. `cat` prints a file's contents.\n\nWhen you're happy with a change, stage it, just like before, with `git add README.md`.",
      task: 'Stage the change to `README.md`.',
      hints: [
        '`git status` lists `README.md` as modified. Stage it the same way you staged `notes.txt`.',
        'Type `git add README.md` and press Enter.',
      ],
      solution: ['git add README.md'],
      check: (c) => isStaged(c.world, 'README.md') || commitCount(c.world) > SETUP_COMMITS,
      success:
        '**Staged.** The change to `README.md` is ready. Before you commit, think about what the message should say.',
    },
    {
      id: 'message',
      title: 'Write a message your team can read',
      learn:
        "Months from now, someone will scroll through the history to find out when and why something changed. That someone is often you. A message like \"Fix stuff\" tells them nothing. This matters even more when an AI tool writes code for you: the messages are how you keep track of what changed.\n\nA good message:\n- says what the commit does, in a few words\n- is written as a command, like \"Add\", \"Fix\" or \"Remove\", not \"Added\" or \"Fixing\"\n- stays under 72 characters\n\nFor example: `git commit -m \"Explain how to name meeting files\"`. A handy test: \"If applied, this commit will…\" should lead into your message.",
      task: 'Commit the `README.md` change with a clear message.',
      hints: [
        'Say what the change does, starting with a verb like "Add" or "Explain".',
        'Use `git commit -m` with your message in quotes.',
        'Type `git commit -m "Explain how to name meeting files"`.',
      ],
      solution: ['git commit -m "Explain how to name meeting files"'],
      check: (c) => commitCount(c.world) > SETUP_COMMITS && messageQuality(latestMessage(c)).ok,
      nudge: (c) => {
        if (commitCount(c.world) <= SETUP_COMMITS) return null
        const q = messageQuality(latestMessage(c))
        if (q.ok) return null
        return {
          kind: 'warn',
          text: `${q.reason} The commit is saved, but let's practice once more. Add a line to the file with \`echo "Ask questions in the team chat." >> README.md\` (\`echo\` prints the text, and \`>>\` adds it as a new last line of the file), then stage it with \`git add README.md\` and commit again with a better message.`,
        }
      },
      success:
        "**Clear message saved.** Your new commit sits on top of the history in **Your repo**. Anyone reading the history later, including you, will know exactly what it did. Next, you'll learn how to read that history.",
    },
  ],
  pages: [
    {
      kind: 'read',
      id: 'context',
      kicker: 'The starting point',
      title: 'A change is waiting',
      body: 'This repo has one commit. Since then, **README.md** changed: a line about how to name meeting files.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'] },
    },
    {
      kind: 'do',
      id: 'stage',
      kicker: 'Step 1 of 2',
      title: 'Choose the change',
      body: 'Stage it, like before.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'folder' },
      step: 0,
      command: [
        { text: 'git add', say: 'put it in the box' },
        { text: 'README.md', say: 'this file' },
      ],
      done: '**Staged.** Before you commit, think about the message.',
    },
    {
      kind: 'read',
      id: 'why',
      kicker: 'Why messages matter',
      title: 'Messages are for future you',
      body: 'Months from now, someone will scroll the history to find out when and why something changed. That someone is often you. "Fix stuff" tells them nothing.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'ai',
      kicker: 'Even more with AI',
      title: 'AI tools make this matter more',
      body: 'When an AI tool writes code for you, the messages are how you keep track of what changed.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'says',
      kicker: 'Rule 1 of 3',
      title: 'Say what the commit does',
      body: 'Use a few words, like "Explain how to name meeting files".',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'verb',
      kicker: 'Rule 2 of 3',
      title: 'Start with a verb',
      body: 'Write it as a command: **Add**, **Fix** or **Remove**, not "Added" or "Fixing". A test: "If applied, this commit will..." should lead into your message.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'short',
      kicker: 'Rule 3 of 3',
      title: 'Keep it short',
      body: 'Stay under 72 characters, so it fits on one line in the history.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'commit',
      kicker: 'Step 2 of 2',
      title: 'Save it with a clear message',
      body: 'Use this message, or write your own in the same style.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
      step: 1,
      command: [
        { text: 'git commit', say: 'save what is chosen' },
        { text: '-m', say: 'add a message' },
        { text: '"Explain how to name meeting files"', say: 'the message' },
      ],
      done: '**Clear message saved.** Anyone reading the history later will know what it did.',
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You write clear messages',
      body: 'Say what changed, start with a verb, and keep it short. Next, you will learn to read the history.',
    },
  ],
}
