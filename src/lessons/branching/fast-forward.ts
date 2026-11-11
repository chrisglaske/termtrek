import type { Lesson } from '../schema'
import { branchExists, onBranch } from '../checks'
import { HOMEPAGE_AHEAD, mergeFromMain } from './setups'

export const fastForward: Lesson = {
  id: 'fast-forward',
  section: 'branching',
  title: 'Merge a finished branch',
  level: 'Beginner',
  minutes: 5,
  assumes: 'You can make and switch branches.',
  setup: HOMEPAGE_AHEAD,
  steps: [
    {
      id: 'merge',
      title: 'Bring the home page into main',
      learn:
        "The home page is done: **homepage** is two commits ahead of **main**. To bring that work into **main**, you **merge** it.\n\nA merge always pulls another branch into the one you're on. You're on **main**, so run `git merge homepage`.\n- `merge` combines another branch's commits into your current branch.\n- `homepage` is the branch to bring in.\n\nLook at **Your repo** first: **main** hasn't moved since **homepage** started, so its history is a straight line.",
      task: 'Merge homepage into main.',
      hints: ['Stay on main and use `git merge` with the other branch name.', 'Type `git merge homepage` and press Enter.'],
      solution: ['git merge homepage'],
      check: (c) => onBranch(c.world, 'main') && !!c.world.repo && c.world.repo.branches.main === c.world.repo.branches.homepage,
      nudge: mergeFromMain('homepage'),
      success:
        "**Fast-forward.** Git didn't need a new commit: **main** had nothing new, so its label just slid forward to the tip of **homepage**. In **Your repo**, both labels now sit on the same commit.",
    },
    {
      id: 'delete',
      title: 'Tidy up the branch',
      learn:
        "The work is in **main** now, so the **homepage** label has done its job. Delete it with `git branch -d homepage`.\n- `-d` means \"delete\".\n\nThis only removes the label. The commits stay in the history, because **main** points at them. Git refuses `-d` for a branch whose commits aren't merged anywhere yet, so you can't lose work by accident. (`-D`, in capitals, deletes it anyway. Use it only when you mean to throw the work away.)",
      task: 'Delete the homepage branch.',
      hints: ['Use `git branch` with the delete option and the branch name.', 'Type `git branch -d homepage` and press Enter.'],
      solution: ['git branch -d homepage'],
      check: (c) => !branchExists(c.world, 'homepage'),
      success: "**Tidy.** One branch left, and every commit from **homepage** is still in **main**'s history.",
    },
  ],
  pages: [
    {
      kind: 'read',
      id: 'situation',
      kicker: 'The setup',
      title: 'The home page is done',
      body: '**homepage** is two commits ahead of **main**. To bring that work into main, you **merge** it.',
      visual: { kind: 'graph', branches: true },
    },
    {
      kind: 'read',
      id: 'direction',
      kicker: 'The idea',
      title: 'A merge pulls into where you are',
      body: 'A merge brings another branch into the one you are on. You are on **main**, where the work should land.',
      visual: { kind: 'graph', branches: true },
    },
    {
      kind: 'read',
      id: 'straight',
      kicker: 'Look closely',
      title: 'main has not moved',
      body: 'Since homepage started, main got no new commits. Its history is one straight line, so Git can take a shortcut.',
      visual: { kind: 'graph', branches: true },
    },
    {
      kind: 'do',
      id: 'merge',
      kicker: 'Try it',
      title: 'Bring the home page into main',
      body: 'Watch the **main** label.',
      visual: { kind: 'graph', branches: true },
      step: 0,
      command: [
        { text: 'git merge', say: 'bring in the work' },
        { text: 'homepage', say: 'from this branch' },
      ],
      done: '**Fast-forward.** main had nothing new, so its label slid forward to the tip of homepage.',
      report: () => 'Git printed **Fast-forward**: no new commit was needed, the label just moved.',
    },
    {
      kind: 'read',
      id: 'tidy',
      kicker: 'Tidy up',
      title: 'The label has done its job',
      body: 'The work is in main now. Deleting **homepage** only removes the label. The commits stay, because main points at them.',
      visual: { kind: 'graph', branches: true },
    },
    {
      kind: 'do',
      id: 'delete',
      kicker: 'Try it',
      title: 'Delete the branch',
      body: 'Git refuses `-d` for a branch whose work is not merged yet, so you cannot lose work by accident.',
      visual: { kind: 'graph', branches: true },
      step: 1,
      command: [
        { text: 'git branch', say: 'work with branches' },
        { text: '-d', say: 'delete' },
        { text: 'homepage', say: 'this one' },
      ],
      done: '**Tidy.** One branch left, and every commit from homepage is in main.',
    },
    {
      kind: 'read',
      id: 'force',
      kicker: 'Good to know',
      title: 'A capital D deletes anyway',
      body: '`-D` deletes a branch even when its work is not merged. Use it only when you mean to throw the work away.',
      visual: { kind: 'none' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You can merge a finished branch',
      body: 'When only one side moved, Git just slides the label forward.',
    },
  ],
}
