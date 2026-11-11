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
  /** Called while the check fails; a returned Explain replaces the command's own feedback. */
  nudge?: (ctx: StepContext) => Explain | null
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
}

export interface Section {
  id: SectionId
  title: string
  summary: string
  commands: string[]
  status: 'launch' | 'later'
  lessons: Lesson[]
}
