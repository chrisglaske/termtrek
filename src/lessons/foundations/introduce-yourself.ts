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
        "Git writes your name on every snapshot you save, so your team can see who changed what. You set it once per computer with `git config --global user.name \"Sam Rivera\"`.\n\nHere's what each part does:\n- `config` changes a Git setting.\n- `--global` saves it for every project on this computer.\n- `user.name` is the setting to change.\n- The text in quotes is your name. The quotes keep the first and last name together as one value.\n\nYou can use your own name or Sam Rivera. Nothing you type here leaves your device.\n\nOn your own computer, [this guide shows how to set your name](/guides/set-your-name).",
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
  pages: [
    {
      kind: 'read',
      id: 'why',
      kicker: 'Why this matters',
      title: 'Git signs your work',
      body: 'Every snapshot you save carries a name, so your team can see who changed what.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'once',
      kicker: 'Set it once',
      title: 'Your name and email are settings',
      body: 'Git keeps them as **settings**. You set them once per computer. Nothing you type here leaves your device.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'name',
      kicker: 'Setting 1 of 2',
      title: 'Tell Git your name',
      body: 'Use your own name, or Sam Rivera. The quotes keep the first and last name together as one value.',
      visual: { kind: 'identity' },
      step: 0,
      command: [
        { text: 'git config', say: 'change a Git setting' },
        { text: '--global', say: 'for every project here' },
        { text: 'user.name', say: 'the setting' },
        { text: '"Sam Rivera"', say: 'your name' },
      ],
      done: '**Name saved.** Git will sign your snapshots with it.',
    },
    {
      kind: 'read',
      id: 'email',
      kicker: 'Setting 2 of 2',
      title: 'Next, your email',
      body: 'Sites like GitHub use it to link your snapshots to your account. It is the same command with a different setting.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'email-do',
      kicker: 'Setting 2 of 2',
      title: 'Tell Git your email',
      body: 'On your own computer, use the email you will sign up with.',
      visual: { kind: 'identity' },
      step: 1,
      command: [
        { text: 'git config', say: 'change a Git setting' },
        { text: '--global', say: 'for every project here' },
        { text: 'user.email', say: 'the setting' },
        { text: '"sam@example.com"', say: 'your email' },
      ],
      done: '**Git knows who you are.** You only do this once on a new computer.',
    },
    {
      kind: 'read',
      id: 'guide',
      kicker: 'On your own computer',
      title: 'Want to do this for real?',
      body: '[This guide shows how to set your name](/guides/set-your-name) on your own computer.',
      visual: { kind: 'none' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'Git knows who you are',
      body: 'Every snapshot you save from now on carries your name and email.',
    },
  ],
}
