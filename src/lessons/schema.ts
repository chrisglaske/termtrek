import type { Explain, RunResult, World, WorldSetup } from '../engine/types'

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
  solution: string[]
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
