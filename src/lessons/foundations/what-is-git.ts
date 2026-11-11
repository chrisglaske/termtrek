import type { Lesson } from '../schema'
import { ran, ranGit } from '../checks'
import { IDENTITY, NOTES, README } from '../sample'

export const whatIsGit: Lesson = {
  id: 'what-is-git',
  section: 'foundations',
  title: 'What is Git?',
  level: 'Beginner',
  minutes: 4,
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
}
