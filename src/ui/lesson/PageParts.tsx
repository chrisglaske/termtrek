import { useEffect, useRef, useState } from 'react'
import type { DoPage, ReadPage } from '../../lessons/schema'
import type { RunnerState } from '../../lessons/runner'
import { activeRepo } from '../../engine/git/repoState'
import { branchOf } from '../../engine/git/refs'
import { displayPath } from '../../engine/paths'
import { complete as completeLine } from '../../engine/suggest'
import { Terminal } from '../terminal/Terminal'
import type { TermEntry } from '../terminal/Terminal'
import { Editor } from '../editor/Editor'
import { RichText } from '../RichText'
import { FeedbackCard } from '../terminal/FeedbackCard'
import { StageVisual } from './StageVisual'
import { TreeVisual } from './TreeVisual'
import { RewindVisual } from './RewindVisual'
import { ConflictVisual } from './ConflictVisual'
import { ServerVisual } from './ServerVisual'
import { PrVisual } from './PrVisual'
import { GraphVisual } from './GraphVisual'
import { IdentityVisual } from './IdentityVisual'
import { CommandCard } from './CommandCard'
import '../buttons.css'
import './PageFlow.css'

/** After a command passes, the same Enter (or a held key) must not also press Continue. */
export const GUARD_MS = 500

/** True once the learner has finished the runner step a do page is bound to. */
export const passed = (s: RunnerState, step: number): boolean => s.stepIndex > step || (s.stepIndex === step && s.status !== 'working')

/** Entries for this page's terminal: only the current step, without the step's own success card (the page says it). */
export function pageEntries(entries: TermEntry[], from: number): TermEntry[] {
  return entries
    .slice(from)
    .map((e) => (e.explain?.kind === 'ok' ? { ...e, explain: undefined } : e))
    .filter((e) => !e.note || e.lines.length > 0 || e.explain)
}

/** True when the command the learner just ran on this page printed an error. */
export function failedLast(state: RunnerState, from: number): boolean {
  const last = pageEntries(state.entries, from).at(-1)
  return !!last && !last.note && last.lines.some((l) => l.some((sp) => sp.tone === 'error'))
}

/** True when Git refused because unsaved changes would be overwritten (a switch with a dirty Folder). */
export function refusedOverwrite(state: RunnerState, from: number): boolean {
  const last = pageEntries(state.entries, from).at(-1)
  return !!last && !last.note && last.lines.some((l) => l.map((sp) => sp.text).join('').includes('would be overwritten'))
}

/**
 * Where each runner step's terminal entries begin, so a page shows only its own commands.
 * `clear` or a reset (the entries shrinking) starts the current step over at 0.
 */
export function usePageStarts(state: RunnerState): { from(step: number): number; reset(): void } {
  const starts = useRef<Record<number, number>>({ 0: 0 })
  const lastLen = useRef(state.entries.length)
  if (state.entries.length < lastLen.current) starts.current[state.stepIndex] = 0
  if (starts.current[state.stepIndex] === undefined) starts.current[state.stepIndex] = lastLen.current
  lastLen.current = state.entries.length
  return {
    from: (step) => starts.current[step] ?? 0,
    reset: () => {
      starts.current = { 0: 0 }
      lastLen.current = 0
    },
  }
}

/** Under the picture: says the last command on this page failed (or that Git refused to overwrite), so nothing changed. */
export function FailedNote({ state, from }: { state: RunnerState; from: number }): React.JSX.Element | null {
  if (!failedLast(state, from)) return null
  return (
    <p className="sv-change sv-change-err" role="status">
      {refusedOverwrite(state, from)
        ? 'Git refused: the changes in your Folder would be overwritten, so it stayed where it was.'
        : 'That command did not work, so nothing changed. The terminal says why.'}
    </p>
  )
}

export function Dots({ count, at }: { count: number; at: number }): React.JSX.Element {
  return (
    <div
      className="pf-dots"
      role="progressbar"
      aria-label="Lesson progress"
      aria-valuemin={1}
      aria-valuemax={count}
      aria-valuenow={at + 1}
      aria-valuetext={`Page ${at + 1} of ${count}`}
    >
      {Array.from({ length: count }, (_, i) => (
        <i key={i} className={i < at ? 'd' : i === at ? 'c' : undefined} />
      ))}
    </div>
  )
}

export function Head({ page, headRef, done = false }: { page: ReadPage | DoPage; headRef?: React.Ref<HTMLHeadingElement>; done?: boolean }): React.JSX.Element {
  // A page passed with clicks has no result line of its own: once it is done, the lead says what happened.
  const result = done && page.kind === 'do' && page.on === 'server'
  return (
    <>
      <p className="pf-kick">{page.kicker}</p>
      <h2 className="pf-title" ref={headRef} tabIndex={-1}>
        {page.title}
      </h2>
      <div className="pf-lead" role={result ? 'status' : undefined}>
        <RichText text={result && page.kind === 'do' ? page.done : page.body} />
      </div>
    </>
  )
}

export function Visual({ page, state, done, refused = false }: { page: ReadPage | DoPage; state: RunnerState; done: boolean; refused?: boolean }): React.JSX.Element | null {
  const v = page.visual
  if (v.kind === 'stage') {
    return <StageVisual world={state.world} show={v.show} hot={v.hot} advance={done} compact={page.kind === 'do'} last={state.ran[state.ran.length - 1]} refused={refused} />
  }
  if (v.kind === 'tree') return <TreeVisual world={state.world} last={state.ran[state.ran.length - 1]} />
  if (v.kind === 'rewind') return <RewindVisual world={state.world} />
  if (v.kind === 'conflict') return <ConflictVisual world={state.world} file={v.file} theirs={v.theirs} markers={v.markers} />
  if (v.kind === 'server') return <ServerVisual world={state.world} branch={v.branch} last={state.ran[state.ran.length - 1]} />
  // A page passed on the server shows its card in the right column once done, so the left one steps aside.
  if (v.kind === 'pr') return page.kind === 'do' && page.on === 'server' && done ? null : <PrVisual world={state.world} />
  if (v.kind === 'graph') return <GraphVisual world={state.world} v={v} last={state.ran[state.ran.length - 1]} />
  if (v.kind === 'identity') return <IdentityVisual world={state.world} />
  return null
}

export interface Nav {
  index: number
  back(): void
  onContinue(): void
  canContinue: boolean
  continueRef: React.Ref<HTMLButtonElement>
}

export function Buttons({ nav }: { nav: Nav }): React.JSX.Element {
  return (
    <div className="pf-nav pf-nav-bar">
      {nav.index > 0 && (
        <button type="button" className="btn pf-back" onClick={nav.back}>
          Back
        </button>
      )}
      <button type="button" className="btn btn-p" ref={nav.continueRef} disabled={!nav.canContinue} onClick={nav.onContinue}>
        Continue
      </button>
    </div>
  )
}

/** The right side of a do page: the command card, the terminal, and the result. The landing hero draws it too. */
export function DoBody({
  page,
  state,
  liveAtStart,
  entryStart,
  run,
  editorDone,
  saveFile,
  closeFile,
  doneAt,
  autoFocus = true,
  helpers = true,
  placeholder,
  outcome,
  beforeTerm,
}: {
  page: DoPage
  state: RunnerState
  liveAtStart: boolean
  entryStart: number
  run(line: string): void
  editorDone(text?: string | null): void
  saveFile(path: string, text: string): void
  closeFile(path: string): void
  doneAt: number
  /** Focus the terminal on mount (the lesson does; the landing hero decides for itself). */
  autoFocus?: boolean
  /** The page's note and "Type it for me" (the landing hero leaves them out, so nothing needs a click). */
  helpers?: boolean
  placeholder?: string
  /**
   * Drawn in place of the command card once the step passes (the landing hero's compact result).
   * When given, the page's own report and done lines are left to it. Lessons leave it out.
   */
  outcome?: React.ReactNode
  /** Drawn just above the terminal, inside its box (the landing hero's "Try it" cue). Lessons leave it out. */
  beforeTerm?: React.ReactNode
}): React.JSX.Element {
  const ok = passed(state, page.step)
  // Only a file opened (with `code`) on this page shows its editor here.
  const [openedBefore] = useState(state.lastOpened?.seq ?? 0)
  const file = state.lastOpened && state.lastOpened.seq > openedBefore && state.open.includes(state.lastOpened.path) ? state.lastOpened.path : null
  const notice = file && state.notice?.path === file && state.notice.explain.kind !== 'ok' ? state.notice.explain : null
  const [typed, setTyped] = useState('')
  const [fill, setFill] = useState<{ text: string; seq: number } | undefined>(undefined)
  const [noteOpen, setNoteOpen] = useState(true)
  const resultRef = useRef<HTMLDivElement>(null)
  const { world } = state
  const repo = activeRepo(world)
  const pending = world.pending
  const full = page.command.map((p) => p.text).join(' ')
  const inPlace = outcome !== undefined
  const report = ok && !inPlace ? (page.report?.(world) ?? null) : null

  const termRef = useRef<HTMLDivElement>(null)
  const smooth = () => (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth')
  // New output pushes the input down; keep it in view while the learner types.
  const count = state.entries.length
  useEffect(() => {
    if (!ok && count > 0) termRef.current?.querySelector('.term-live')?.scrollIntoView?.({ block: 'nearest', behavior: smooth() })
  }, [count, ok])
  // On success, bring the result and Continue into view.
  useEffect(() => {
    if (!ok || !doneAt) return
    // The result's scroll margin leaves room for Continue below it (a sticky bar on phones).
    resultRef.current?.scrollIntoView?.({ block: 'nearest', behavior: smooth() })
  }, [ok, doneAt])

  return (
    <>
      {!(inPlace && ok) && <CommandCard parts={page.command} typed={ok ? '' : typed} />}
      {inPlace && (
        <div className="pf-result pf-out" aria-live="polite" ref={resultRef}>
          {ok && outcome}
        </div>
      )}
      {liveAtStart && (
        <div className="pf-term" ref={termRef}>
          {beforeTerm}
          <Terminal
            entries={pageEntries(state.entries, entryStart)}
            cwdLabel={displayPath(world, world.cwd)}
            branch={repo ? branchOf(repo) : null}
            onRun={run}
            onComplete={(line) => completeLine(world, line)}
            waiting={pending ? 'Git is waiting for your message in the box below.' : undefined}
            autoFocus={autoFocus}
            done={ok}
            prefill={fill}
            onInput={setTyped}
            placeholder={placeholder}
            expect={full}
          />
          {helpers && page.note && noteOpen && !ok && (
            <div className="pf-note">
              <div className="pf-note-text">
                <RichText text={page.note} />
              </div>
              <button type="button" className="pf-note-x" aria-label="Hide this note" onClick={() => setNoteOpen(false)}>
                ×
              </button>
            </div>
          )}
          {ok && report && (
            <div className="pf-report">
              <RichText text={report} />
            </div>
          )}
          {file && !pending && !ok && (
            <div className="pf-editor pf-editor-file">
              <Editor
                key={file}
                name={file.slice(file.lastIndexOf('/') + 1)}
                initial={world.files[file] ?? ''}
                kind="file"
                onSave={(text) => saveFile(file, text)}
                onClose={() => closeFile(file)}
                notice={notice ? <FeedbackCard explain={notice} onCommand={run} /> : undefined}
              />
            </div>
          )}
          {pending && !ok && (
            <div className="pf-editor">
              <Editor name="COMMIT_EDITMSG" initial={pending.text} kind="message" onSave={(text) => editorDone(text)} onClose={() => editorDone(null)} />
            </div>
          )}
        </div>
      )}
      {helpers && liveAtStart && !ok && !pending && !file && (
        <p className="pf-hint">
          Not sure?{' '}
          <button type="button" className="pf-link" onClick={() => setFill((f) => ({ text: full, seq: (f?.seq ?? 0) + 1 }))}>
            Type it for me
          </button>
        </p>
      )}
      {!inPlace && (
        <div className="pf-result" aria-live="polite" ref={resultRef}>
          {ok && (
            <div className="pf-good">
              <span className="pf-good-i" aria-hidden="true">
                ✓
              </span>
              <span>
                <RichText text={page.done} />
              </span>
            </div>
          )}
        </div>
      )}
    </>
  )
}

