import { useCallback, useEffect, useReducer, useRef } from 'react'
import type { Lesson } from './schema'
import { initRunner, runnerReducer } from './runner'
import type { RunnerAction, RunnerState } from './runner'

type HookAction = RunnerAction | { type: 'load'; lesson: Lesson }

function hookReducer(s: RunnerState, a: HookAction): RunnerState {
  return a.type === 'load' ? initRunner(a.lesson) : runnerReducer(s, a)
}

export function useLessonRunner(
  lesson: Lesson,
  onLessonDone: (id: string) => void,
): {
  state: RunnerState
  run(line: string): void
  hint(): void
  next(): void
  reset(): void
  saveFile(path: string, text: string): void
  closeFile(path: string): void
  editorDone(text?: string | null): void
  openPr(input: { head: string; base: string; title: string; body: string }): void
  mergePr(number: number): void
  deleteRemoteBranch(name: string): void
  remoteError: string | null
  visibleHint: string | null
  showMe: string | null
} {
  const [state, dispatch] = useReducer(hookReducer, lesson, initRunner)

  // Re-initialise when lesson.id changes. Dispatching during render on the component's
  // own reducer makes React re-render immediately, so callers never see the old lesson.
  if (state.lesson.id !== lesson.id) dispatch({ type: 'load', lesson })

  const doneRef = useRef(false)
  const doneCb = useRef(onLessonDone)
  doneCb.current = onLessonDone
  useEffect(() => {
    if (state.status === 'lesson-done' && state.lesson.id === lesson.id) {
      if (!doneRef.current) {
        doneRef.current = true
        doneCb.current(state.lesson.id)
      }
    } else doneRef.current = false
  }, [state.status, state.lesson.id, lesson.id])

  const run = useCallback((line: string) => dispatch({ type: 'run', line }), [])
  const hint = useCallback(() => dispatch({ type: 'hint' }), [])
  const next = useCallback(() => dispatch({ type: 'next' }), [])
  const reset = useCallback(() => dispatch({ type: 'reset' }), [])
  const saveFile = useCallback((path: string, text: string) => dispatch({ type: 'save-file', path, text }), [])
  const closeFile = useCallback((path: string) => dispatch({ type: 'close-file', path }), [])
  const editorDone = useCallback((text?: string | null) => dispatch({ type: 'editor-done', text }), [])

  const openPr = useCallback((input: { head: string; base: string; title: string; body: string }) => dispatch({ type: 'pr-open', ...input }), [])
  const mergePr = useCallback((number: number) => dispatch({ type: 'pr-merge', number }), [])
  const deleteRemoteBranch = useCallback((name: string) => dispatch({ type: 'remote-delete-branch', name }), [])

  const step = state.lesson.steps[state.stepIndex]
  const visibleHint = step && state.hintLevel > 0 ? (step.hints[state.hintLevel - 1] ?? null) : null
  const showMe = step && step.solution.length > 0 && state.hintLevel === step.hints.length ? step.solution.join(' && ') : null
  return { state, run, hint, next, reset, saveFile, closeFile, editorDone, openPr, mergePr, deleteRemoteBranch, remoteError: state.remoteError, visibleHint, showMe }
}
