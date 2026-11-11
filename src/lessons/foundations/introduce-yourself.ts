import type { Lesson } from '../schema'
import { hasIdentity } from '../checks'
import { NOTES, README } from '../sample'

export const introduceYourself: Lesson = {
  id: 'introduce-yourself',
  section: 'foundations',
  title: 'Introduce yourself',
  level: 'Beginner',
  minutes: 4,
  assumes: 'You can type a command in the terminal.',
  setup: {
    cwd: 'project',
    files: { 'project/notes.txt': NOTES, 'project/README.md': README },
  },
  steps: [
    {
      id: 'name',
      title: 'Tell Git your name',
      learn:
        "Git writes your name on every snapshot you save, so your team can see who changed what. You set it once per computer with `git config --global user.name \"Sam Rivera\"`.\n\nHere's what each part does:\n- `config` changes a Git setting.\n- `--global` saves it for every project on this computer.\n- `user.name` is the setting to change.\n- The text in quotes is your name. The quotes keep the first and last name together as one value.\n\nYou can use your own name or Sam Rivera. Nothing you type here leaves your device.",
      task: 'Set your name in Git.',
      hints: [
        'This is a Git setting, so the command starts with **git** and then the word for settings.',
        'Put your name in quotes after `user.name`.',
        'Type `git config --global user.name "Sam Rivera"`, or use your own name.',
      ],
      solution: ['git config --global user.name "Sam Rivera"'],
      check: (c) => !!c.world.config['user.name']?.trim(),
      success:
        '**Name saved.** Git will sign your snapshots with this name. One more setting to go: your email.',
    },
    {
      id: 'email',
      title: 'Tell Git your email',
      learn:
        "Git also records an email with your name. Hosting sites like GitHub use it to link your snapshots to your account. On your own computer, use the email you'll sign up with.\n\nThe command is the same as before, with `user.email` as the setting: `git config --global user.email \"sam@example.com\"`.",
      task: 'Set your email in Git.',
      hints: [
        'Use the same command as for your name, but change the setting and the value.',
        'The setting is `user.email`, and the value goes in quotes.',
        'Type `git config --global user.email "sam@example.com"`.',
      ],
      solution: ['git config --global user.email "sam@example.com"'],
      check: (c) => hasIdentity(c.world),
      success:
        "**Git knows who you are.** Every snapshot you save from now on will carry your name and email. You only do this once on a new computer.",
    },
  ],
}
