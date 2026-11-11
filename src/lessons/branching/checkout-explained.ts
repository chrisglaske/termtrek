import type { Lesson } from '../schema'
import { onBranch, ranGit } from '../checks'
import { HOMEPAGE_BRANCH } from './setups'

export const checkoutExplained: Lesson = {
  id: 'checkout-explained',
  section: 'branching',
  title: 'The older command: checkout',
  level: 'Beginner',
  minutes: 5,
  assumes: 'You can switch between branches.',
  setup: HOMEPAGE_BRANCH,
  steps: [
    {
      id: 'checkout-branch',
      title: 'Switch the old way',
      learn:
        "Before `git switch` existed, everyone used `git checkout`, and older guides and AI tools still do. It's worth knowing when you see it.\n\n`git checkout homepage` does the same as `git switch homepage`. The catch is that `checkout` does two jobs: switching branches, and putting files back (like `git restore`). `switch` was added so each command does one clear thing.",
      task: 'Use checkout to move to homepage.',
      hints: ['Use `git checkout` with the branch name.', 'Type `git checkout homepage` and press Enter.'],
      solution: ['git checkout homepage'],
      check: (c) => ranGit(c, 'checkout') && onBranch(c.world, 'homepage'),
      success: "**Same result as switch.** You're on **homepage**, and `home.html` is in your folder.",
    },
    {
      id: 'detach',
      title: 'Visit an older commit',
      learn:
        "`checkout` can also jump straight to a commit instead of a branch. Run `git checkout HEAD~1`. `HEAD~1` means \"one commit before HEAD\".\n\nGit calls this a **detached HEAD**: HEAD points at a commit, not at a branch label. It's handy for looking around, but commits you make here belong to no branch and are easy to lose.",
      task: 'Check out the commit before HEAD.',
      hints: ['Use `git checkout` and point one commit back from HEAD.', 'Type `git checkout HEAD~1` and press Enter.'],
      solution: ['git checkout HEAD~1'],
      check: (c) => c.world.repo?.head.kind === 'detached',
      success:
        "**Detached.** Read Git's note: it explains what happened and how to get back. In **Your repo**, the HEAD ring sits on a commit instead of on a branch label.",
    },
    {
      id: 'back',
      title: 'Get back on a branch',
      learn:
        "Whenever you see \"detached HEAD\", the fix is to switch to a branch. `git switch -` takes you back to wherever you were before, like a back button. `-` means \"the previous one\".\n\n`git switch main` works too, if you'd rather name the branch.",
      task: 'Get back onto a branch.',
      hints: ['Switch to the previous branch.', 'Type `git switch -` and press Enter.'],
      solution: ['git switch -'],
      check: (c) => c.world.repo?.head.kind === 'branch',
      success:
        "**Back on a branch.** Use `git switch` for branches and `git restore` for files. When a guide or an AI tool says `git checkout`, you'll know which of the two jobs it means.",
    },
  ],
  pages: [
    {
      kind: 'read',
      id: 'older',
      kicker: 'The older command',
      title: 'You will see checkout in older guides',
      body: 'Before `git switch` existed, everyone used `git checkout`. Older guides and AI tools still do, so it is worth knowing.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'checkout-branch',
      kicker: 'Try it',
      title: 'Switch the old way',
      body: 'This does the same as `git switch homepage`.',
      visual: { kind: 'graph', branches: true },
      step: 0,
      command: [
        { text: 'git checkout', say: 'switch, the old way' },
        { text: 'homepage', say: 'to this branch' },
      ],
      done: '**Same result as switch.** You are on homepage, and home.html is in your folder.',
    },
    {
      kind: 'read',
      id: 'two-jobs',
      kicker: 'The catch',
      title: 'One command, two jobs',
      body: '`checkout` switches branches, and it also puts files back, like `git restore`. `switch` and `restore` were added so each command does one clear thing.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'detach-idea',
      kicker: 'Another trick',
      title: 'It can jump to a commit',
      body: '`HEAD~1` means one commit before HEAD. When HEAD points at a commit instead of a branch label, Git calls it a **detached HEAD**.',
      visual: { kind: 'graph', branches: true },
    },
    {
      kind: 'do',
      id: 'detach',
      kicker: 'Try it',
      title: 'Visit an older commit',
      body: 'Read Git\'s note after it runs: it explains what happened and how to get back.',
      visual: { kind: 'graph', branches: true },
      step: 1,
      command: [
        { text: 'git checkout', say: 'go to' },
        { text: 'HEAD~1', say: 'one commit back' },
      ],
      done: '**Detached.** The ring sits on a commit instead of a branch label.',
    },
    {
      kind: 'read',
      id: 'careful',
      kicker: 'Be careful',
      title: 'Look around, but do not commit here',
      body: 'A detached HEAD is handy for looking at old work. Commits you make here belong to no branch, so they are easy to lose.',
      visual: { kind: 'graph', branches: true },
    },
    {
      kind: 'do',
      id: 'back',
      kicker: 'Try it',
      title: 'Get back on a branch',
      body: '`-` means "the previous one", like a back button. `git switch main` works too.',
      visual: { kind: 'graph', branches: true },
      step: 2,
      command: [
        { text: 'git switch', say: 'move to a branch' },
        { text: '-', say: 'the one you were on before' },
      ],
      done: '**Back on a branch.** The ring is on a label again.',
    },
    {
      kind: 'read',
      id: 'recap',
      kicker: 'To remember',
      title: 'Which job does it mean?',
      body: 'Use `git switch` for branches and `git restore` for files. When a guide or an AI tool says `git checkout`, you will know which of the two it means.',
      visual: { kind: 'none' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You can read checkout',
      body: 'Whenever you see "detached HEAD", switch to a branch and you are back.',
    },
  ],
}
