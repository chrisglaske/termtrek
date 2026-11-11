import type { Explain, RunResult, World, WorldSetup } from '../engine/types'
import type { RunnerAction } from './runner'

export type SectionId = 'foundations' | 'fixing-mistakes' | 'branching' | 'team' | 'pro' | 'automation'

export interface StepContext {
  start: World
  world: World
  ran: string[]
  last: RunResult | null
}

export interface Step {
  id: string
  title: string
  learn: string
  task: string
  hints: [string, ...string[]]
  /** What "Show me" displays (and runs). */
  solution: string[]
  /** Actions tests replay when `solution` alone can't finish the step, e.g. saving a file in the editor. */
  solve?: RunnerAction[]
  check: (ctx: StepContext) => boolean
  success: string
  /** Replaces `success` when it returns text, for steps that can pass by more than one path. */
  successFor?: (ctx: StepContext) => string | null
  /** Called while the check fails; a returned Explain replaces the command's own feedback. */
  nudge?: (ctx: StepContext) => Explain | null
  /** Something that happens on the server when the step starts, e.g. a teammate pushes. `note` is shown as a tip. */
  event?: { apply: (w: World) => World; note: string }
}

export interface Lesson {
  id: string
  section: SectionId
  title: string
  level: 'Beginner' | 'Intermediate' | 'Advanced'
  minutes: number
  assumes?: string
  setup: WorldSetup
  steps: Step[]
  /** When set, the lesson plays as calm pages, one idea each; `steps` still decide when the learner passes. */
  pages?: LessonPage[]
  /** Shows a "skip this lesson" link on the first page, for people who already know the topic. */
  skippable?: boolean
}

export type StageBox = 'folder' | 'staged' | 'saved'

/**
 * What a page shows above its action: the three boxes from the real world, the commit graph (the newest commit, or with `all` the whole history,
 * or with `branches` every branch on its own lane with its label and the HEAD ring), the folder tree with a "you are here" marker,
 * a single line of history that also shows commits a reset left behind (dashed, still recoverable),
 * the two versions of a conflicting line in `file` (the branch you are on against `theirs`),
 * your computer next to the server for one `branch` (the branch you are on when left out),
 * the newest pull request on the server as a small card, or nothing.
 */
export type PageVisual =
  | { kind: 'stage'; show: StageBox[]; hot?: StageBox }
  | { kind: 'graph'; all?: boolean; branches?: boolean }
  | { kind: 'tree' }
  | { kind: 'rewind' }
  | { kind: 'conflict'; file: string; theirs: string; markers?: boolean }
  | { kind: 'server'; branch?: string }
  | { kind: 'pr' }
  | { kind: 'none' }

/** One token of a command as it is typed, with its plain meaning shown under it. */
export interface CommandPart {
  text: string
  say: string
}

interface PageBase {
  id: string
  kicker: string
  title: string
  /** Lesson inline markup: **bold**, `code`, blank line between paragraphs. */
  body: string
  visual: PageVisual
}

export interface ReadPage extends PageBase {
  kind: 'read'
}

/** A page the learner passes by finishing `steps[step]` in the terminal, or with `on: 'server'` by clicking on the server's website. */
export interface DoPage extends PageBase {
  kind: 'do'
  step: number
  /** Empty on a server page: there is nothing to type. */
  command: CommandPart[]
  /** `server` swaps the terminal for the server's pull request screen; `view` says which one opens first. */
  on?: 'terminal' | 'server'
  view?: { pr: number } | 'new'
  /** The quiet success line: **lead** then the rest. */
  done: string
  /** A one-line note under the terminal while the step is to do, e.g. what the prompt means. The learner can hide it. */
  note?: string
  /** After success, one plain line under the terminal output that explains what Git printed, from the real world. */
  report?: (world: World) => string | null
}

export interface FinishPage {
  kind: 'finish'
  id: string
  title: string
  body: string
}

export type LessonPage = ReadPage | DoPage | FinishPage

export interface Section {
  id: SectionId
  title: string
  summary: string
  commands: string[]
  status: 'launch' | 'later'
  lessons: Lesson[]
}
