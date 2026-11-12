import type { Lesson } from '../schema'
import { ran, ranGit } from '../checks'
import { IDENTITY, NOTES, README } from '../sample'

export const whatIsGit: Lesson = {
  id: 'what-is-git',
  section: 'foundations',
  title: 'What is Git?',
  level: 'Beginner',
  minutes: 4,
  assumes: 'You can type a command in the terminal.',
  setup: {
    cwd: 'project',
    files: { 'project/notes.txt': NOTES, 'project/README.md': README },
    config: IDENTITY,
  },
  steps: [
    {
      id: 'look-around',
      title: 'Meet the terminal',
      learn:
        "**Git** keeps the history of a project folder. Each time you save a version, Git takes a snapshot of your files. Later you can see what changed, go back to an older version, and share your work with a team. That's why almost every software team uses it, and why it's a safety net when an AI tool edits your code.\n\nYou'll use Git by typing commands in the **terminal** on the left. You're inside a folder called **project**. Type `ls`, short for \"list\", and press Enter to see the files in it. You can also select a dark command pill to run it.",
      task: 'List the files in the **project** folder.',
      hints: [
        'Click into the terminal, type the command, then press Enter.',
        'The command is two letters, short for "list".',
        'Type `ls` and press Enter.',
      ],
      solution: ['ls'],
      check: (c) => ran(c, 'ls'),
      success:
        "**That's the whole project.** Two files: `notes.txt` holds meeting notes and `README.md` describes the project. Git isn't tracking them yet, so the **Your repo** panel on the right says there's no repository.",
    },
    {
      id: 'version',
      title: 'Check that Git is installed',
      learn:
        'Every Git command starts with the word **git**. The word after it says what you want Git to do.\n\nTo check that Git is installed, ask for its version with `git --version`. The two dashes mark an **option**, an extra setting for a command. On your own computer, this is the first command to run after installing Git.',
      task: 'Ask Git which version is installed.',
      hints: [
        'Start with **git**, then add the option that asks for the version.',
        'The option is the word version with two dashes in front.',
        'Type `git --version` and press Enter.',
      ],
      solution: ['git --version'],
      check: (c) => ranGit(c, '--version'),
      success:
        "**Git is ready.** It answered with its version number. Next you'll tell Git who you are, so it can put your name on your work.",
    },
  ],
  pages: [
    {
      kind: 'read',
      id: 'idea',
      kicker: 'The big idea',
      title: 'Git remembers every version of your project',
      body: '**Git** keeps the history of a project folder. Each time you save, it takes a snapshot of your files.',
      visual: { kind: 'stage', show: ['folder'] },
    },
    {
      kind: 'read',
      id: 'why',
      kicker: 'Why people use it',
      title: 'You can go back, and you can share',
      body: 'With Git you can see what changed, go back to an older version, and share your work with a team. That is why almost every software team uses it.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'ai',
      kicker: 'Why it matters now',
      title: 'A safety net for AI tools',
      body: 'When an AI tool edits your code, Git shows you exactly what it changed. If you do not like it, you can undo it.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'terminal',
      kicker: 'How you use it',
      title: 'You talk to Git in the terminal',
      body: 'The **terminal** is a window where you type commands. You are inside a folder called **project**.',
      visual: { kind: 'tree' },
    },
    {
      kind: 'do',
      id: 'ls',
      kicker: 'Try it',
      title: 'Look at the files',
      body: 'Type the command into the terminal below and press Enter. You can also select **Type it for me**.',
      visual: { kind: 'tree' },
      step: 0,
      command: [{ text: 'ls', say: 'list the files here' }],
      done: '**That is the whole project.** Two files: `notes.txt` and `README.md`. Git is not tracking them yet.',
    },
    {
      kind: 'read',
      id: 'prefix',
      kicker: 'One rule',
      title: 'Every Git command starts with git',
      body: 'The word after it says what you want. For example, `git --version` asks which version of Git you have. The two dashes mark an **option**, an extra setting for a command.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'version',
      kicker: 'Check your tools',
      title: 'Is Git installed?',
      body: 'On your own computer, this is the first command to run after installing Git.',
      visual: { kind: 'none' },
      step: 1,
      command: [
        { text: 'git', say: 'talk to Git' },
        { text: '--version', say: 'which version?' },
      ],
      done: '**Git is ready.** It answered with its version number.',
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You know what Git is',
      body: 'Git keeps your history, and you talk to it with commands that start with `git`. Next, you will tell Git who you are.',
    },
  ],
}
