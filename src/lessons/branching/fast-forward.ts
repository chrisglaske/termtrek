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
}
