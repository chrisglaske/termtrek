import type { World } from '../../engine/types'
import type { Lesson } from '../schema'
import { historyLength, isClean, workFile } from '../checks'
import { getStatus } from '../../engine/git/repoState'
import { AGENDA_HISTORY } from './history'

const stagedCount = (w: World): number => getStatus(w)?.staged.length ?? 0
const unstagedCount = (w: World): number => getStatus(w)?.unstaged.length ?? 0

export const rewindWithReset: Lesson = {
  id: 'rewind-with-reset',
  section: 'fixing-mistakes',
  title: 'Rewind with reset',
  level: 'Intermediate',
  minutes: 8,
  assumes: 'You know the staging area and can read the history.',
  setup: AGENDA_HISTORY,
  steps: [
    {
      id: 'soft',
      title: 'Undo a commit, keep the work staged',
      learn:
        "Your last two commits, \"Draft the agenda\" and \"Tidy the agenda\", were made in a rush and haven't been shared. `git reset` moves your branch back to an earlier commit, as if the later ones never happened. How much of the work it keeps depends on one option.\n\nStart gently with `git reset --soft HEAD~1`:\n- `reset` moves your branch, and **HEAD** with it.\n- `--soft` keeps the undone changes staged, ready to commit again.\n- `HEAD~1` means \"one commit before HEAD\". `HEAD~2` would be two before.",
      task: 'Undo the last commit and keep its changes staged.',
      hints: [
        'Use `git reset` with the gentlest option, pointing one commit back.',
        'Type `git reset --soft HEAD~1` and press Enter.',
      ],
      solution: ['git reset --soft HEAD~1'],
      check: (c) => historyLength(c.world) === historyLength(c.start) - 1 && stagedCount(c.world) > 0,
      nudge: (c) =>
        historyLength(c.world) === historyLength(c.start) - 1 && stagedCount(c.world) === 0
          ? { kind: 'tip', text: 'That undid the commit and unstaged its changes too. Stage them again with `git add agenda.txt` to finish this step.' }
          : null,
      success:
        '**One commit back.** "Tidy the agenda" is gone from the history, but its changes are staged in **Your repo**. You could commit them again right now.',
    },
    {
      id: 'mixed',
      title: 'Unstage everything',
      learn:
        "Run `git reset` with nothing after it. It doesn't move your branch, it just unstages everything, so your changes sit in your folder, not staged.\n\nThat's the default mode, called `--mixed`. So `git reset HEAD~1` would have undone the commit and unstaged its changes in one go.",
      task: 'Unstage the changes, but keep them in your folder.',
      hints: ['Run `git reset` on its own, with no option and no commit.', 'Type `git reset` and press Enter.'],
      solution: ['git reset'],
      check: (c) => stagedCount(c.world) === 0 && unstagedCount(c.world) > 0,
      success:
        '**Unstaged, not lost.** The tidied agenda is still in `agenda.txt`. Git just isn\'t holding it for the next commit any more.',
    },
    {
      id: 'hard',
      title: 'Throw it all away',
      learn:
        "Now say the agenda was a bad idea altogether. `git reset --hard HEAD~1` goes back one more commit, to before \"Draft the agenda\", and makes your folder match it exactly:\n- `--hard` throws away staged changes and changes in your folder too.\n- `HEAD~1` is one commit before where you are now.\n\n`--hard` is the one to be careful with: unsaved edits are gone for good. Commits you reset away can still be found for a while, as the next lesson shows.\n\n**The rule from amend applies here too:** only reset commits you haven't shared. For shared commits, use `git revert`.",
      task: 'Go back to before the agenda, and leave nothing behind.',
      hints: [
        'Use `git reset` with the option that also cleans your folder, pointing one commit back.',
        'Type `git reset --hard HEAD~1` and press Enter.',
      ],
      solution: ['git reset --hard HEAD~1'],
      check: (c) => isClean(c.world) && workFile(c.world, 'agenda.txt') === undefined,
      nudge: (c) =>
        isClean(c.world) && workFile(c.world, 'agenda.txt') !== undefined
          ? { kind: 'tip', text: 'Your changes are gone, but the branch is still on "Draft the agenda". Run `git reset --hard HEAD~1` to go one commit further back.' }
          : null,
      success:
        "**A clean slate.** `agenda.txt` is gone, the history ends at \"Add the launch date\", and there's nothing to commit. Three levels to remember: `--soft` keeps changes staged, `--mixed` keeps them in your folder, and `--hard` throws them away.",
    },
  ],
}
