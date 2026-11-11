import type { Lesson } from '../schema'
import { inSync, ranAfter, ranGit } from '../checks'
import { CLONED } from './setups'

export const pushYourWork: Lesson = {
  id: 'push-your-work',
  section: 'team',
  title: 'Send your commits to the server',
  level: 'Beginner',
  minutes: 6,
  assumes: 'You cloned a repo and know where `origin` points.',
  setup: CLONED,
  steps: [
    {
      id: 'commit',
      title: 'Make a commit',
      learn:
        'Commits are saved on your computer only. Nobody else sees them yet. Make one, then ask Git where you stand.\n\n1. `echo "Bring snacks." >> notes.txt` adds a line.\n2. `git commit -am "Add a snack reminder"` saves it.\n3. `git status` compares you with the server.\n\nIt says your branch is "ahead of \'origin/main\' by 1 commit": you have one commit the server does not.',
      task: 'Commit a change to `notes.txt`, then run `git status`.',
      hints: [
        'Add a line with `echo` and `>>`, commit with `-am`, then check the status.',
        'Type `echo "Bring snacks." >> notes.txt`, then `git commit -am "Add a snack reminder"`, then `git status`.',
      ],
      solution: ['echo "Bring snacks." >> notes.txt', 'git commit -am "Add a snack reminder"', 'git status'],
      check: (c) => ranAfter(c, 'commit', 'status') && !inSync(c.world, 'main') && c.world.repo?.branches.main !== c.start.repo?.branches.main,
      success: '**One commit ahead.** In the **Remote** tab, the server still has the old tip.',
    },
    {
      id: 'push',
      title: 'Push it',
      learn:
        'Send your commit with `git push`. Git uploads the commits the server is missing and moves **main** there.\n\nOn your own computer, the first push may ask you to sign in. The "On your computer" guides cover that. Here, the server just accepts it.',
      task: 'Push your commit to the server.',
      hints: ['Just `git` and the word for sending.', 'Type `git push` and press Enter.'],
      solution: ['git push'],
      check: (c) => inSync(c.world, 'main'),
      nudge: (c) =>
        ranGit(c, 'push') && c.last?.exitCode !== 0 ? { kind: 'tip', text: 'The push did not go through. Read the message above, then try `git push` again.' } : null,
      success: '**The server has it.** **origin/main** moved too, because Git updated its memory when the push succeeded. Teammates can now get your commit.',
    },
  ],
}
