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
  ],  pages: [
    {
      kind: 'read',
      id: 'situation',
      kicker: 'The problem',
      title: 'Two commits made in a rush',
      body: '"Draft the agenda" and "Tidy the agenda" were made in a hurry and have not been shared. You want to go back to before them.',
      visual: { kind: 'rewind' },
    },
    {
      kind: 'read',
      id: 'idea',
      kicker: 'The idea',
      title: 'Rewinding does not erase',
      body: '`git reset` moves your branch back to an earlier commit. The later commits are not deleted right away, so you can get them back.',
      visual: { kind: 'rewind' },
    },
    {
      kind: 'read',
      id: 'levels',
      kicker: 'Three levels',
      title: 'One command, three levels',
      body: 'How much `git reset` keeps depends on one option: `--soft`, `--mixed` or `--hard`. You will try all three, gentlest first.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'soft',
      kicker: 'Level 1',
      title: 'Undo a commit, keep the work staged',
      body: '`HEAD` is where you are now. `HEAD~1` is one commit before it. `--soft` keeps the undone changes staged, ready to commit again.',
      visual: { kind: 'rewind' },
      step: 0,
      command: [
        { text: 'git reset', say: 'move the branch back' },
        { text: '--soft', say: 'keep the changes staged' },
        { text: 'HEAD~1', say: 'one commit back' },
      ],
      done: '**One commit back.** "Tidy the agenda" is off the branch, and its changes are staged.',
      report: (world) => {
        const n = getStatus(world)?.staged.length ?? 0
        return `Git moved the branch back one commit. ${n} changed ${n === 1 ? 'file is' : 'files are'} waiting in Staged.`
      },
    },
    {
      kind: 'read',
      id: 'where',
      kicker: 'Look closely',
      title: 'The work moved to Staged',
      body: 'The commit is gone from the branch, but its changes are waiting in the Staged box. You could commit them again right now.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
    },
    {
      kind: 'read',
      id: 'mixed-idea',
      kicker: 'Level 2',
      title: 'Unstage too',
      body: '`git reset` with nothing after it does not move your branch. It only unstages, so your changes stay in the folder.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
    },
    {
      kind: 'do',
      id: 'mixed',
      kicker: 'Try it',
      title: 'Unstage everything',
      body: 'Run it on its own, with no option and no commit.',
      visual: { kind: 'stage', show: ['folder', 'staged', 'saved'], hot: 'staged' },
      step: 1,
      command: [{ text: 'git reset', say: 'unstage everything' }],
      done: '**Unstaged, not lost.** The tidied agenda is still in agenda.txt. Git just is not holding it for the next commit.',
    },
    {
      kind: 'read',
      id: 'default',
      kicker: 'Good to know',
      title: 'Mixed is the default',
      body: 'This is `--mixed`. So `git reset HEAD~1` would undo the commit and unstage its changes in one go.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'hard-idea',
      kicker: 'Level 3',
      title: 'The strong one',
      body: 'Say the agenda was a bad idea altogether. `--hard` goes back and also makes your folder match, throwing away staged changes and edits in it.\n\nUnsaved edits are gone for good. Commits you reset away are different: they can still be found, as you will see.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'hard',
      kicker: 'Try it',
      title: 'Throw it all away',
      body: 'This goes one commit further back, to before "Draft the agenda".',
      visual: { kind: 'rewind' },
      step: 2,
      command: [
        { text: 'git reset', say: 'move the branch back' },
        { text: '--hard', say: 'and clean the folder' },
        { text: 'HEAD~1', say: 'one commit back' },
      ],
      done: '**A clean slate.** agenda.txt is gone, the history ends at "Add the launch date", and there is nothing to commit.',
      report: (world) => {
        const gone = world.repo ? Object.keys(world.repo.commits).length - historyLength(world) : 0
        return gone > 0 ? `Git moved the branch back. The ${gone} newer ${gone === 1 ? 'commit is' : 'commits are'} off the branch now, drawn dashed, but still saved.` : null
      },
    },
    {
      kind: 'read',
      id: 'recap',
      kicker: 'To remember',
      title: 'Soft, mixed, hard',
      body: '`--soft` keeps changes staged. `--mixed` keeps them in your folder. `--hard` throws them away.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'rule',
      kicker: 'One rule',
      title: 'Only reset what you have not shared',
      body: 'The same rule as amend. For commits other people have, use `git revert`.',
      visual: { kind: 'none' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You can rewind your branch',
      body: 'You moved your branch back three ways, and saw that the commits you left behind are not erased.',
    },
  ],
}
