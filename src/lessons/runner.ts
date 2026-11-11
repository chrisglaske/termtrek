import type { World } from '../engine/types'
import { createWorld } from '../engine/world'
import { runLine } from '../engine/interpreter'
import { displayPath } from '../engine/paths'
import { activeRepo } from '../engine/git/repoState'
import type { TermEntry } from '../ui/terminal/Terminal'
import type { Lesson } from './schema'

export interface RunnerState {
  lesson: Lesson
  stepIndex: number
  stepStart: World
  world: World
  entries: TermEntry[]
  ran: string[]
  hintLevel: number
  status: 'working' | 'step-done' | 'lesson-done'
}

export type RunnerAction = { type: 'run'; line: string } | { type: 'hint' } | { type: 'next' } | { type: 'reset' }

export function initRunner(lesson: Lesson): RunnerState {
  const world = createWorld(lesson.setup)
  return { lesson, stepIndex: 0, stepStart: world, world, entries: [], ran: [], hintLevel: 0, status: 'working' }
}

function branchOf(world: World): string | null {
  const repo = activeRepo(world)
  return repo && repo.head.kind === 'branch' ? repo.head.name : null
}

export function runnerReducer(s: RunnerState, a: RunnerAction): RunnerState {
  switch (a.type) {
    case 'run': {
      const prompt = { cwd: displayPath(s.world, s.world.cwd), branch: branchOf(s.world) }
      const result = runLine(s.world, a.line)
      const ran = [...s.ran, a.line]
      const base: RunnerState = { ...s, world: result.world, ran }
      let entry: TermEntry = { prompt, input: a.line, lines: result.lines, explain: result.explain }
      let status = s.status
      if (s.status === 'working') {
        const step = s.lesson.steps[s.stepIndex]
        const ctx = { start: s.stepStart, world: result.world, ran, last: result }
        if (step && step.check(ctx)) {
          entry = { ...entry, explain: { kind: 'ok', text: step.success } }
          status = s.stepIndex >= s.lesson.steps.length - 1 ? 'lesson-done' : 'step-done'
        } else if (step?.nudge) {
          const nudge = step.nudge(ctx)
          if (nudge) entry = { ...entry, explain: nudge }
        }
      }
      return { ...base, status, entries: result.clear ? [] : [...s.entries, entry] }
    }
    case 'hint': {
      const count = s.lesson.steps[s.stepIndex]?.hints.length ?? 0
      return { ...s, hintLevel: Math.min(s.hintLevel + 1, count) }
    }
    case 'next': {
      if (s.status !== 'step-done') return s
      const stepIndex = s.stepIndex + 1
      const moved: RunnerState = { ...s, stepIndex, stepStart: s.world, ran: [], hintLevel: 0, status: 'working' }
      // A learner who ran ahead may already have done what this step asks.
      const step = s.lesson.steps[stepIndex]
      if (!step || !step.check({ start: s.world, world: s.world, ran: [], last: null })) return moved
      const prompt = { cwd: displayPath(s.world, s.world.cwd), branch: branchOf(s.world) }
      const entry: TermEntry = { prompt, input: '', lines: [], explain: { kind: 'ok', text: step.success } }
      const status = stepIndex >= s.lesson.steps.length - 1 ? 'lesson-done' : 'step-done'
      return { ...moved, status, entries: [...s.entries, entry] }
    }
    case 'reset':
      return initRunner(s.lesson)
  }
}
