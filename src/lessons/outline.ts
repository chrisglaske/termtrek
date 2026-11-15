import type { SectionId } from './schema'

/**
 * A light copy of the course outline for the landing page, so the landing
 * chunk does not pull in every lesson. outline.test.ts keeps it equal to the
 * real course.
 */
export interface OutlineSection {
  id: SectionId
  title: string
  summary: string
  commands: string[]
  status: 'launch' | 'later'
  lessons: number
  minutes: number
}

export const outline: OutlineSection[] = [
  {
    id: 'foundations',
    title: 'Foundations',
    summary: 'Start a repo, save your work in commits, write messages your team can read, and see exactly what changed.',
    commands: ['git init', 'git status', 'git add', 'git commit', 'git log', 'git diff'],
    status: 'launch',
    lessons: 11,
    minutes: 57,
  },
  {
    id: 'fixing-mistakes',
    title: 'Fixing mistakes',
    summary:
      "Undo a change, fix your last commit, and get back work you thought you'd lost. Learned early, so you're never afraid to try things.",
    commands: ['git restore', 'git commit --amend', 'git revert', 'git reset', 'git reflog'],
    status: 'launch',
    lessons: 7,
    minutes: 39,
  },
  {
    id: 'branching',
    title: 'Branching',
    summary: 'Work on ideas side by side, merge them back, and resolve conflicts without panic.',
    commands: ['git switch', 'git branch', 'git merge', 'git stash'],
    status: 'launch',
    lessons: 8,
    minutes: 50,
  },
  {
    id: 'team',
    title: 'Working with a team',
    summary: "Push and pull, open a pull request, respond to review, and keep your branch up to date with everyone else's work.",
    commands: ['git clone', 'git push', 'git pull', 'git fetch', 'git rebase'],
    status: 'launch',
    lessons: 9,
    minutes: 68,
  },
  {
    id: 'pro',
    title: 'Pro skills',
    summary: 'Tidy up history before you share it, move commits between branches, tag releases, and track down the commit that broke something.',
    commands: [],
    status: 'later',
    lessons: 0,
    minutes: 0,
  },
  {
    id: 'automation',
    title: 'Automation',
    summary: 'Understand CI/CD: the checks that run on every pull request, and how to read and write a workflow file.',
    commands: [],
    status: 'later',
    lessons: 0,
    minutes: 0,
  },
]
