import type { Lesson, StepContext } from '../schema'
import { commitCount, conventionalMessage, isStaged } from '../checks'
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
        "Months from now, someone will scroll through the history to find out when and why something changed. That someone is often you. A message like \"Fix stuff\" tells them nothing. This matters even more when an AI tool writes code for you: the messages are how you keep track of what changed.\n\nA good message:\n- says what the commit does, in a few words\n- is written as a command, like \"Add\", \"Fix\" or \"Remove\", not \"Added\" or \"Fixing\"\n- keeps the first line short, about 50 characters\n\nA handy test: \"If applied, this commit will…\" should lead into your message.\n\nMany teams also follow a shared format called **Conventional Commits**: start with a **type** and a colon, then the summary in lowercase, like `docs: explain meeting file names`. An optional **scope** in brackets names the part you changed: `feat(ui): add search`. The common types:\n- `feat` adds something new, `fix` fixes a bug, `docs` changes only text for people\n- `chore` is upkeep like settings, `refactor` reshapes code without changing what it does, `test` adds tests, `style` is formatting only\n\nTeams use it because the history is quick to scan, and tools can read the types to write a changelog for each release. Commit with `git commit -m \"docs: explain meeting file names\"`.",
      task: 'Commit the `README.md` change with a clear message in the `type: summary` format.',
      hints: [
        'This change only touches text for people, so the type is `docs`. Then say what it does, starting with a verb like "explain".',
        'Use `git commit -m` with your message in quotes, starting with `docs:`.',
        'Type `git commit -m "docs: explain meeting file names"`.',
      ],
      solution: ['git commit -m "docs: explain meeting file names"'],
      check: (c) => commitCount(c.world) > SETUP_COMMITS && conventionalMessage(latestMessage(c)).ok,
      nudge: (c) => {
        if (commitCount(c.world) <= SETUP_COMMITS) return null
        const q = conventionalMessage(latestMessage(c))
        if (q.ok) return null
        return {
          kind: 'warn',
          text: `${q.reason} The commit is saved, but let's practice once more. Add a line to the file with \`echo "Ask questions in the team chat." >> README.md\` (\`echo\` prints the text, and \`>>\` adds it as a new last line of the file), then stage it with \`git add README.md\` and commit again with a message like \`docs: add where to ask questions\`.`,
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
      body: 'Use a few words, like "Explain meeting file names".',
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
      body: 'Aim for about 50 characters on the first line, so it fits on one line in the history. Git tools also wrap longer detail lines at around 72.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'format',
      kicker: 'Conventional Commits',
      title: 'Put a type in front',
      body: 'Many teams use a shared format: a **type**, a colon, then the summary. The summary follows the three rules, starting lowercase.\n\n`type: summary`\n`docs: explain meeting file names`',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'scope',
      kicker: 'Optional',
      title: 'Add a scope if it helps',
      body: 'A **scope** in brackets names the part of the project you changed. Leave it out when it adds nothing.\n\n`type(scope): summary`\n`feat(ui): add search`',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'types-new',
      kicker: 'Types 1 of 2',
      title: 'New work, fixes and docs',
      body: '**feat** adds something new: `feat: add a search box`\n**fix** fixes a bug: `fix: stop the menu closing early`\n**docs** changes only text for people: `docs: add setup steps`',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'types-upkeep',
      kicker: 'Types 2 of 2',
      title: 'Upkeep and tidying',
      body: '**chore** is upkeep, like settings: `chore: ignore log files`\n**refactor** reshapes code, same result: `refactor: split the menu code`\n**test** adds or fixes tests: `test: cover an empty search`\n**style** is formatting only: `style: indent the menu code`',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'why-format',
      kicker: 'Why teams use it',
      title: 'Quick to scan, easy to automate',
      body: 'You can spot every fix in the history at a glance. Tools read the types too, and can write the changelog for each release for you.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'commit',
      kicker: 'Step 2 of 2',
      title: 'Save it with a clear message',
      body: 'This change is text for people, so the type is **docs**. Use this message, or write your own in the same format.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
      step: 1,
      command: [
        { text: 'git commit', say: 'save what is chosen' },
        { text: '-m', say: 'add a message' },
        { text: '"docs: explain meeting file names"', say: 'type: summary' },
      ],
      done: '**Clear message saved.** Anyone reading the history later will know what it did.',
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You write clear messages',
      body: 'Pick a type, say what changed with a verb, and keep it short. Next, you will learn to read the history.',
    },
  ],
}
