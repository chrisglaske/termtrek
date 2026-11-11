import type { Explain, RunResult, World } from '../engine/types'
import { buildWorld } from '../engine/setup'
import { runLine } from '../engine/interpreter'
import { displayPath } from '../engine/paths'
import { activeRepo } from '../engine/git/repoState'
import { branchOf } from '../engine/git/refs'
import { finishEditor, withoutWaiting } from '../engine/git/editor'
import { writeFile } from '../engine/shell/fs'
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
  /** Files open in editor tabs (absolute paths, in tab order). */
  open: string[]
  /** The file the last `code` opened; `seq` changes on every open, so the UI can re-select a tab already open. */
  lastOpened: { path: string; seq: number } | null
  /** The success or nudge from the last `save-file`, shown in that file's editor tab. Cleared by `run`, `next` and `reset`. */
  notice: { path: string; explain: Explain } | null
}

export type RunnerAction =
  | { type: 'run'; line: string }
  | { type: 'hint' }
  | { type: 'next' }
  | { type: 'reset' }
  | { type: 'save-file'; path: string; text: string }
  | { type: 'close-file'; path: string }
  /** `undefined` saves the session's text unchanged; `null` closes without saving. */
  | { type: 'editor-done'; text?: string | null }

export function initRunner(lesson: Lesson): RunnerState {
  const world = buildWorld(lesson.setup)
  return {
    lesson,
    stepIndex: 0,
    stepStart: world,
    world,
    entries: [],
    ran: [],
    hintLevel: 0,
    status: 'working',
    open: [],
    lastOpened: null,
    notice: null,
  }
}

function promptOf(world: World): TermEntry['prompt'] {
  const repo = activeRepo(world)
  return { cwd: displayPath(world, world.cwd), branch: repo ? branchOf(repo) : null }
}

interface Verdict {
  passed: boolean
  status: RunnerState['status']
  /** The step success when it passed, a nudge when one applies, otherwise null. */
  explain: Explain | null
}

/** Checks the current step against a new world. Every path that changes the world goes through here. */
function evaluate(s: RunnerState, world: World, last: RunResult | null): Verdict {
  const step = s.lesson.steps[s.stepIndex]
  if (s.status !== 'working' || !step) return { passed: false, status: s.status, explain: null }
  const ctx = { start: s.stepStart, world, ran: s.ran, last }
  if (step.check(ctx)) {
    const status = s.stepIndex >= s.lesson.steps.length - 1 ? 'lesson-done' : 'step-done'
    return { passed: true, status, explain: { kind: 'ok', text: step.success } }
  }
  return { passed: false, status: s.status, explain: step.nudge?.(ctx) ?? null }
}

export function runnerReducer(s: RunnerState, a: RunnerAction): RunnerState {
  switch (a.type) {
    case 'run': {
      // Git is waiting for the commit message; the UI shows that editor instead.
      if (s.world.pending) return s
      const prompt = promptOf(s.world)
      const result = runLine(s.world, a.line)
      const ran = [...s.ran, a.line]
      const v = evaluate({ ...s, ran }, result.world, result)
      // While the editor is open, the waiting hint sits on the terminal's live line instead.
      const lines = result.world.pending && !s.world.pending ? withoutWaiting(result.lines) : result.lines
      const entry: TermEntry = { prompt, input: a.line, lines, explain: v.explain ?? result.explain }
      const next: RunnerState = { ...s, notice: null, world: result.world, ran, status: v.status, entries: result.clear ? [] : [...s.entries, entry] }
      if (!result.open) return next
      const open = s.open.includes(result.open) ? s.open : [...s.open, result.open]
      return { ...next, open, lastOpened: { path: result.open, seq: (s.lastOpened?.seq ?? 0) + 1 } }
    }
    case 'hint': {
      const count = s.lesson.steps[s.stepIndex]?.hints.length ?? 0
      return { ...s, hintLevel: Math.min(s.hintLevel + 1, count) }
    }
    case 'next': {
      if (s.status !== 'step-done') return s
      const stepIndex = s.stepIndex + 1
      const moved: RunnerState = { ...s, notice: null, stepIndex, stepStart: s.world, ran: [], hintLevel: 0, status: 'working' }
      // A learner who ran ahead may already have done what this step asks.
      const v = evaluate(moved, s.world, null)
      if (!v.passed) return moved
      const entry: TermEntry = { prompt: promptOf(s.world), input: '', lines: [], explain: v.explain ?? undefined, note: true }
      return { ...moved, status: v.status, entries: [...s.entries, entry] }
    }
    case 'save-file': {
      const world = writeFile(s.world, a.path, a.text)
      const v = evaluate(s, world, null)
      const notice = v.explain ? { path: a.path, explain: v.explain } : null
      if (!v.passed) return { ...s, world, notice }
      const entry: TermEntry = { prompt: promptOf(world), input: '', lines: [], explain: v.explain ?? undefined, note: true }
      return { ...s, world, notice, status: v.status, entries: [...s.entries, entry] }
    }
    case 'close-file':
      return { ...s, open: s.open.filter((p) => p !== a.path) }
    case 'editor-done': {
      const session = s.world.pending
      if (!session) return s
      const result = finishEditor(s.world, a.text === undefined ? session.text : a.text)
      const v = evaluate(s, result.world, result)
      const entry: TermEntry = {
        prompt: promptOf(result.world),
        input: '',
        lines: result.lines,
        explain: v.explain ?? result.explain,
        note: true,
      }
      return { ...s, world: result.world, status: v.status, entries: [...s.entries, entry] }
    }
    case 'reset':
      return initRunner(s.lesson)
  }
}
