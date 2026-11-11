import type { Lesson, Section } from './schema'
import { whatIsGit } from './foundations/what-is-git'
import { introduceYourself } from './foundations/introduce-yourself'
import { createARepo } from './foundations/create-a-repo'
import { checkTheStatus } from './foundations/check-the-status'
import { firstCommit } from './foundations/first-commit'
import { goodMessages } from './foundations/good-messages'
import { readTheHistory } from './foundations/read-the-history'
import { seeWhatChanged } from './foundations/see-what-changed'
import { ignoreFiles } from './foundations/ignore-files'
import { startAProject } from './foundations/start-a-project'
import { unstage } from './fixing/unstage'
import { discardChanges } from './fixing/discard-changes'
import { amend } from './fixing/amend'
import { undoACommit } from './fixing/undo-a-commit'
import { rewindWithReset } from './fixing/rewind-with-reset'
import { getItBack } from './fixing/get-it-back'
import { scenarioMessyAfternoon } from './fixing/scenario-messy-afternoon'
import { makeABranch } from './branching/make-a-branch'
import { switchBranches } from './branching/switch-branches'
import { checkoutExplained } from './branching/checkout-explained'
import { fastForward } from './branching/fast-forward'
import { mergeCommit } from './branching/merge-commit'
import { mergeConflicts } from './branching/merge-conflicts'
import { stash } from './branching/stash'
import { scenarioUrgentFix } from './branching/scenario-urgent-fix'
import { cloneARepo } from './team/clone-a-repo'
import { pushYourWork } from './team/push-your-work'
import { shareAProject } from './team/share-a-project'
import { fetchAndPull } from './team/fetch-and-pull'
import { pushABranch } from './team/push-a-branch'
import { openAPullRequest } from './team/open-a-pull-request'
import { mergeAndCleanUp } from './team/merge-and-clean-up'
import { updateYourBranch } from './team/update-your-branch'
import { scenarioPushedFirst } from './team/scenario-pushed-first'

export const course: Section[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    summary: 'Start a repo, save your work in commits, write messages your team can read, and see exactly what changed.',
    commands: ['git init', 'git status', 'git add', 'git commit', 'git log', 'git diff'],
    status: 'launch',
    lessons: [
      whatIsGit,
      introduceYourself,
      createARepo,
      checkTheStatus,
      firstCommit,
      goodMessages,
      readTheHistory,
      seeWhatChanged,
      ignoreFiles,
      startAProject,
    ],
  },
  {
    id: 'fixing-mistakes',
    title: 'Fixing mistakes',
    summary:
      "Undo a change, fix your last commit, and get back work you thought you'd lost. Learned early, so you're never afraid to try things.",
    commands: ['git restore', 'git commit --amend', 'git revert', 'git reset', 'git reflog'],
    status: 'launch',
    lessons: [unstage, discardChanges, amend, undoACommit, rewindWithReset, getItBack, scenarioMessyAfternoon],
  },
  {
    id: 'branching',
    title: 'Branching',
    summary: 'Work on ideas side by side, merge them back, and resolve conflicts without panic.',
    commands: ['git switch', 'git branch', 'git merge', 'git stash'],
    status: 'launch',
    lessons: [makeABranch, switchBranches, checkoutExplained, fastForward, mergeCommit, mergeConflicts, stash, scenarioUrgentFix],
  },
  {
    id: 'team',
    title: 'Working with a team',
    summary: "Push and pull, open a pull request, respond to review, and keep your branch up to date with everyone else's work.",
    commands: ['git clone', 'git push', 'git pull', 'git fetch', 'git rebase'],
    status: 'launch',
    lessons: [cloneARepo, pushYourWork, shareAProject, fetchAndPull, pushABranch, openAPullRequest, mergeAndCleanUp, updateYourBranch, scenarioPushedFirst],
  },
  {
    id: 'pro',
    title: 'Pro skills',
    summary: 'Tidy up history before you share it, move commits between branches, tag releases, and track down the commit that broke something.',
    commands: [],
    status: 'later',
    lessons: [],
  },
  {
    id: 'automation',
    title: 'Automation',
    summary: 'Understand CI/CD: the checks that run on every pull request, and how to read and write a workflow file.',
    commands: [],
    status: 'later',
    lessons: [],
  },
]

/** Every lesson, in course order. */
export function allLessons(): Lesson[] {
  return course.flatMap((s) => s.lessons)
}

export function findLesson(id: string): Lesson | undefined {
  return allLessons().find((l) => l.id === id)
}

/** The lesson after `id` in course order, or undefined at the end. */
export function nextLesson(id: string): Lesson | undefined {
  const all = allLessons()
  const i = all.findIndex((l) => l.id === id)
  return i === -1 ? undefined : all[i + 1]
}
