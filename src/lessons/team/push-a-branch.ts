import type { Lesson } from '../schema'
import { historyLength, lastFailed, onBranch, segmentsOf, serverTip, upstreamOf } from '../checks'
import { CLONED } from './setups'

export const pushABranch: Lesson = {
  id: 'push-a-branch',
  section: 'team',
  title: 'Share a branch',
  level: 'Intermediate',
  minutes: 7,
  assumes: 'You can make a branch and push to a server.',
  setup: CLONED,
  steps: [
    {
      id: 'commit',
      title: 'Start a branch',
      learn:
        'Teams do their work on branches so **main** stays steady. Make one and commit on it:\n1. `git switch -c homepage` makes the branch and moves onto it.\n2. `echo "<h1>Team notes</h1>" > home.html` creates the file.\n3. `git add home.html` stages it.\n4. `git commit -m "Add a home page"` saves it.',
      task: 'Make a homepage branch with one commit that adds `home.html`.',
      hints: [
        'Switch to a new branch first, then create, stage and commit the file.',
        'Type `git switch -c homepage`, `echo "<h1>Team notes</h1>" > home.html`, `git add home.html`, then `git commit -m "Add a home page"`.',
      ],
      solution: [
        'git switch -c homepage',
        'echo "<h1>Team notes</h1>" > home.html',
        'git add home.html',
        'git commit -m "Add a home page"',
      ],
      check: (c) => onBranch(c.world, 'homepage') && historyLength(c.world, 'homepage') === historyLength(c.world, 'main') + 1,
      success: '**homepage is one commit ahead of main.** Only you have it so far.',
    },
    {
      id: 'push-fails',
      title: 'Try a plain push',
      learn:
        'Try `git push`. A new branch has no upstream yet (no matching branch on the server for it to be linked to), so Git does not know where to send it. Expect an error. It is the Git way of asking you to say it out loud.',
      task: 'Run `git push` and read the message.',
      hints: ['Just try it.', 'Type `git push` and press Enter.'],
      solution: ['git push'],
      check: (c) => lastFailed(c, 'push'),
      success: '**No upstream branch.** The server has no **homepage** yet, and Git will not guess. The error shows the command to use.',
    },
    {
      id: 'push-u',
      title: 'Push with -u',
      learn: 'Do what the error says: `git push -u origin homepage`. It creates **homepage** on the server and remembers it as the upstream, so later pushes are just `git push`.',
      task: 'Push homepage and set its upstream.',
      hints: ['Use the `-u` flag, the nickname and the branch name.', 'Type `git push -u origin homepage` and press Enter.'],
      solution: ['git push -u origin homepage'],
      check: (c) => {
        const tip = c.world.repo?.branches.homepage
        return !!tip && serverTip(c.world, 'homepage') === tip && upstreamOf(c.world, 'homepage') !== null
      },
      success: '**The branch is on the server.** Open the **Remote** tab: **homepage** is listed next to **main**.',
    },
    {
      id: 'vv',
      title: 'See what follows what',
      learn: 'Run `git branch -vv` to list your branches with the server branch each one follows, in square brackets.',
      task: 'List your branches with their upstreams.',
      hints: ['It is `git branch` with a flag.', 'Type `git branch -vv` and press Enter.'],
      solution: ['git branch -vv'],
      check: (c) => c.ran.some((l) => segmentsOf(l).some((s) => s[0] === 'git' && s[1] === 'branch' && s.some((w) => w === '-v' || w === '-vv'))),
      success: '**homepage follows origin/homepage.** Now your teammates can see and review it.',
    },
  ],
}
