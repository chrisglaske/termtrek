import type { Lesson } from '../schema'
import { historyLength, ranGit, workFile } from '../checks'
import { AGENDA_V2 } from '../sample'
import { AGENDA_HISTORY } from './history'

export const getItBack: Lesson = {
  id: 'get-it-back',
  section: 'fixing-mistakes',
  title: 'Get lost work back',
  level: 'Intermediate',
  minutes: 6,
  assumes: 'You can rewind with git reset.',
  setup: AGENDA_HISTORY,
  steps: [
    {
      id: 'lose',
      title: 'Lose two commits',
      learn:
        "Time for a mistake on purpose. Run `git reset --hard HEAD~2`. `HEAD~2` means \"two commits before HEAD\", so this throws away \"docs: draft the agenda\" and \"docs: tidy the agenda\", and `agenda.txt` disappears from your folder.",
      task: 'Reset two commits back, throwing them away.',
      hints: ['Use `git reset --hard` and point two commits back.', 'Type `git reset --hard HEAD~2` and press Enter.'],
      solution: ['git reset --hard HEAD~2'],
      check: (c) => historyLength(c.world) === 2,
      success:
        "**Two commits gone**, or so it seems. `git log` won't show them any more. But Git doesn't delete commits right away.",
    },
    {
      id: 'reflog',
      title: 'Ask Git where HEAD has been',
      learn:
        "Git keeps a private diary of every place HEAD has been: each commit, reset and switch. It's called the **reflog**, short for reference log. Run `git reflog` to read it, newest first.\n\nEach line starts with the commit ID, then a name like **HEAD@{1}**. That means \"where HEAD was one move ago\". **HEAD@{0}** is where it is now.",
      task: 'Show the reflog.',
      hints: ['The command is `git` plus the short name for reference log.', 'Type `git reflog` and press Enter.'],
      solution: ['git reflog'],
      check: (c) => ranGit(c, 'reflog'),
      success:
        '**There\'s your lost commit.** The line **HEAD@{1}** is "docs: tidy the agenda", where you were just before the reset.',
    },
    {
      id: 'restore',
      title: 'Jump back to it',
      learn:
        "To get everything back, reset to where HEAD was one move ago: `git reset --hard HEAD@{1}`.\n\nYou can also use the commit ID from the reflog line instead of `HEAD@{1}`. Either way, your branch points at \"docs: tidy the agenda\" again, and `agenda.txt` comes back.\n\nThe reflog is your safety net for commits, not for edits you never committed. Git cleans it up after about 90 days, and it only exists on your computer.",
      task: 'Bring back the two lost commits.',
      hints: [
        'Use `git reset --hard` with the reflog name for one move ago.',
        'Type `git reset --hard HEAD@{1}` and press Enter.',
      ],
      solution: ['git reset --hard HEAD@{1}'],
      check: (c) => historyLength(c.world) === 4 && workFile(c.world, 'agenda.txt') === AGENDA_V2,
      success:
        "**Everything's back.** Four commits, and `agenda.txt` with its tidy edits. Now you know: once work is committed, it's very hard to truly lose it.",
    },
  ],  pages: [
    {
      kind: 'read',
      id: 'situation',
      kicker: 'A safety net',
      title: 'Work you think you lost',
      body: 'You will make a mistake on purpose: throw away two commits. Then you will get them back.',
      visual: { kind: 'rewind' },
    },
    {
      kind: 'do',
      id: 'lose',
      kicker: 'Try it',
      title: 'Lose two commits',
      body: '`HEAD~2` means "two commits before HEAD". This throws away "docs: draft the agenda" and "docs: tidy the agenda", and agenda.txt disappears.',
      visual: { kind: 'rewind' },
      step: 0,
      command: [
        { text: 'git reset', say: 'move the branch back' },
        { text: '--hard', say: 'and clean the folder' },
        { text: 'HEAD~2', say: 'two commits back' },
      ],
      done: '**Two commits gone**, or so it seems.',
    },
    {
      kind: 'read',
      id: 'still',
      kicker: 'Look closely',
      title: 'They are still there',
      body: 'The dashed dots are the two commits. `git log` will not show them any more, but Git does not delete commits right away.',
      visual: { kind: 'rewind' },
    },
    {
      kind: 'read',
      id: 'diary',
      kicker: 'The diary',
      title: 'Git keeps a private diary',
      body: 'It is called the **reflog**, short for reference log. It lists every place HEAD has been, newest first. **HEAD@{0}** is where it is now, and **HEAD@{1}** is where it was one move ago.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'reflog',
      kicker: 'Try it',
      title: 'Ask Git where HEAD has been',
      body: 'Each line starts with a commit ID, then a name like HEAD@{1}.',
      visual: { kind: 'rewind' },
      step: 1,
      command: [
        { text: 'git', say: 'talk to Git' },
        { text: 'reflog', say: "show where HEAD has been" },
      ],
      done: '**There is your lost commit.** The line HEAD@{1} is "docs: tidy the agenda", where you were just before the reset.',
    },
    {
      kind: 'read',
      id: 'jump',
      kicker: 'The way back',
      title: 'Jump back to it',
      body: 'Reset to where HEAD was one move ago. You could also use the commit ID from the reflog line instead.',
      visual: { kind: 'rewind' },
    },
    {
      kind: 'do',
      id: 'restore',
      kicker: 'Try it',
      title: 'Bring back the two commits',
      body: 'Your branch points at "docs: tidy the agenda" again, and agenda.txt comes back.',
      visual: { kind: 'rewind' },
      step: 2,
      command: [
        { text: 'git reset', say: 'move the branch' },
        { text: '--hard', say: 'and the folder too' },
        { text: 'HEAD@{1}', say: 'where HEAD was one move ago' },
      ],
      done: '**Everything is back.** Four commits, and agenda.txt with its tidy edits.',
    },
    {
      kind: 'read',
      id: 'limits',
      kicker: 'The fine print',
      title: 'The safety net has limits',
      body: 'The reflog covers commits, not edits you never committed. Git cleans it up after about 90 days, and it only exists on your computer.',
      visual: { kind: 'none' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'Committed work is hard to lose',
      body: 'Once work is committed, `git reflog` can almost always find it again.',
    },
  ],
}
