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
}
