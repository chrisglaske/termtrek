import type { Lesson, StepContext } from '../schema'
import { commitCount, isStaged, messageQuality } from '../checks'
import { headCommitId } from '../../engine/git/repoState'
import { IDENTITY, NOTES, README, README_V2 } from './sample'

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
}
