import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { DoPage, FinishPage, Lesson, LessonPage, ReadPage, StageBox } from '../../lessons/schema'
import type { RunnerState } from '../../lessons/runner'
import { nextLesson } from '../../lessons/course'
import { useLessonRunner } from '../../lessons/useLessonRunner'
import { useProgress } from '../../progress/ProgressContext'
import { activeRepo, headCommitId } from '../../engine/git/repoState'
import { branchOf } from '../../engine/git/refs'
import { displayPath } from '../../engine/paths'
import { complete as completeLine } from '../../engine/suggest'
import { Terminal } from '../terminal/Terminal'
import type { TermEntry } from '../terminal/Terminal'
import { Editor } from '../editor/Editor'
import { RichText } from '../RichText'
import { RepoGraph, ariaSummary, savedCommits } from '../repomap/RepoMap'
import { FeedbackCard } from '../terminal/FeedbackCard'
import { COURSE_DRAWER_ID } from './Sidebar'
import { OptionsMenu } from './LessonHeader'
import { DoneLinks } from './LessonDone'
import { StageVisual } from './StageVisual'
import { TreeVisual } from './TreeVisual'
import { RewindVisual } from './RewindVisual'
import { ConflictVisual } from './ConflictVisual'
import { ServerVisual } from './ServerVisual'
import { PrVisual } from './PrVisual'
import { RemotePanel } from '../remote/RemotePanel'
import type { RemotePanelProps } from '../remote/RemotePanel'
import { CommandCard } from './CommandCard'
import '../buttons.css'
import './PageFlow.css'

/** After a command passes, the same Enter (or a held key) must not also press Continue. */
const GUARD_MS = 500

const NEXT_BOX: Record<StageBox, StageBox> = { folder: 'staged', staged: 'saved', saved: 'saved' }

/** True once the learner has finished the runner step a do page is bound to. */
const passed = (s: RunnerState, step: number): boolean => s.stepIndex > step || (s.stepIndex === step && s.status !== 'working')

/** Entries for this page's terminal: only the current step, without the step's own success card (the page says it). */
function pageEntries(entries: TermEntry[], from: number): TermEntry[] {
  return entries
    .slice(from)
    .map((e) => (e.explain?.kind === 'ok' ? { ...e, explain: undefined } : e))
    .filter((e) => !e.note || e.lines.length > 0 || e.explain)
}

function Dots({ count, at }: { count: number; at: number }): React.JSX.Element {
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

function Head({ page, headRef }: { page: ReadPage | DoPage; headRef: React.Ref<HTMLHeadingElement> }): React.JSX.Element {
  return (
    <>
      <p className="pf-kick">{page.kicker}</p>
      <h2 className="pf-title" ref={headRef} tabIndex={-1}>
        {page.title}
      </h2>
      <div className="pf-lead">
        <RichText text={page.body} />
      </div>
    </>
  )
}

function Visual({ page, state, done }: { page: ReadPage | DoPage; state: RunnerState; done: boolean }): React.JSX.Element | null {
  const v = page.visual
  if (v.kind === 'stage') {
    const hot = done && v.hot ? NEXT_BOX[v.hot] : v.hot
    return <StageVisual world={state.world} show={v.show} hot={hot} tone={done ? 'ok' : 'accent'} compact={page.kind === 'do'} />
  }
  if (v.kind === 'tree') return <TreeVisual world={state.world} />
  if (v.kind === 'rewind') return <RewindVisual world={state.world} />
  if (v.kind === 'conflict') return <ConflictVisual world={state.world} file={v.file} theirs={v.theirs} />
  if (v.kind === 'server') return <ServerVisual world={state.world} branch={v.branch} />
  if (v.kind === 'pr') return <PrVisual world={state.world} />
  if (v.kind === 'graph') {
    const repo = state.world.repo
    const id = repo ? headCommitId(repo) : null
    const commit = id ? repo?.commits[id] : undefined
    if (!repo || !commit) return null
    if (v.branches) {
      const op = repo.op?.kind === 'merge' ? repo.op : null
      const shelf = repo.stash.length
      return (
        <figure className="pf-graph pf-graph-all pf-branches">
          <RepoGraph repo={repo} stub={false} ids label={`Your branches: ${ariaSummary(repo)}`} />
          <figcaption>
            <span>
              {op
                ? op.conflicts.length
                  ? `Merging ${op.theirsLabel}: paused, ${op.conflicts.length === 1 ? '1 file' : `${op.conflicts.length} files`} to fix`
                  : `Merging ${op.theirsLabel}: fixed, ready to commit`
                : 'Each label is a branch. The ring marks HEAD, where you are.'}
              {shelf > 0 && ` On the shelf: ${shelf === 1 ? '1 stash entry' : `${shelf} stash entries`}.`}
            </span>
          </figcaption>
        </figure>
      )
    }
    if (v.all) {
      const n = savedCommits(repo).length
      return (
        <figure className="pf-graph pf-graph-all">
          <RepoGraph repo={repo} stub={false} ids label={`Your history: ${n} commits in a row, the newest on the right.`} />
          <figcaption>
            <span>Oldest on the left, newest on the right</span>
          </figcaption>
        </figure>
      )
    }
    const branch = repo.head.kind === 'branch' ? repo.head.name : 'HEAD'
    return (
      <figure className="pf-graph">
        <RepoGraph repo={repo} stub={false} label={`Your history: one dot, labelled ${branch} and HEAD, with the ID ${id!.slice(0, 7)}.`} />
        <figcaption>
          <code>{commit.id.slice(0, 7)}</code>
          <span>{commit.message}</span>
        </figcaption>
      </figure>
    )
  }
  return null
}

interface Nav {
  index: number
  back(): void
  onContinue(): void
  canContinue: boolean
  continueRef: React.Ref<HTMLButtonElement>
}

function Buttons({ nav }: { nav: Nav }): React.JSX.Element {
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

function DoBody({
  page,
  state,
  liveAtStart,
  entryStart,
  run,
  editorDone,
  saveFile,
  closeFile,
  doneAt,
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
}): React.JSX.Element {
  const ok = passed(state, page.step)
  // Only a file opened (with `code`) on this page shows its editor here.
  const [openedBefore] = useState(state.lastOpened?.seq ?? 0)
  const file = state.lastOpened && state.lastOpened.seq > openedBefore && state.open.includes(state.lastOpened.path) ? state.lastOpened.path : null
  const notice = file && state.notice?.path === file && state.notice.explain.kind !== 'ok' ? state.notice.explain : null
  const [fill, setFill] = useState<{ text: string; seq: number } | undefined>(undefined)
  const [noteOpen, setNoteOpen] = useState(true)
  const resultRef = useRef<HTMLDivElement>(null)
  const { world } = state
  const repo = activeRepo(world)
  const pending = world.pending
  const full = page.command.map((p) => p.text).join(' ')
  const report = ok ? (page.report?.(world) ?? null) : null

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
      <CommandCard parts={page.command} />
      {liveAtStart && (
        <div className="pf-term" ref={termRef}>
          <Terminal
            entries={pageEntries(state.entries, entryStart)}
            cwdLabel={displayPath(world, world.cwd)}
            branch={repo ? branchOf(repo) : null}
            onRun={run}
            onComplete={(line) => completeLine(world, line)}
            waiting={pending ? 'Git is waiting for your message in the box below.' : undefined}
            autoFocus
            done={ok}
            prefill={fill}
          />
          {page.note && noteOpen && !ok && (
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
      {liveAtStart && !ok && !pending && !file && (
        <p className="pf-hint">
          Not sure?{' '}
          <button type="button" className="pf-link" onClick={() => setFill((f) => ({ text: full, seq: (f?.seq ?? 0) + 1 }))}>
            Type it for me
          </button>
        </p>
      )}
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
    </>
  )
}

/** A do page passed with clicks on the server's website instead of a command: its pull request screen sits where the terminal would. */
function ServerBody({
  page,
  state,
  remote,
}: {
  page: DoPage
  state: RunnerState
  remote: Pick<RemotePanelProps, 'onOpenPr' | 'onMergePr' | 'onDeleteBranch'>
}): React.JSX.Element {
  const ok = passed(state, page.step)
  const start = page.view === 'new' ? ({ view: 'new' } as const) : page.view ? ({ view: 'pr', number: page.view.pr } as const) : undefined
  return (
    <>
      {/* Once the step is done the site goes away, so a stray click (merging early, deleting the branch) can't run ahead of the lesson. */}
      {!ok && (
        <div className="pf-server-site" role="group" aria-label="The server's website">
          <RemotePanel world={state.world} error={state.remoteError} start={start} {...remote} />
        </div>
      )}
      <div className="pf-result" aria-live="polite">
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
    </>
  )
}

function FinishBody({ page, lesson }: { page: FinishPage; lesson: Lesson }): React.JSX.Element {
  const next = nextLesson(lesson.id)
  const nextRef = useRef<HTMLAnchorElement>(null)
  const headRef = useRef<HTMLHeadingElement>(null)
  useEffect(() => {
    if (nextRef.current) nextRef.current.focus({ preventScroll: true })
    else headRef.current?.focus({ preventScroll: true })
  }, [])
  return (
    <div className="pf-page pf-finish">
      <span className="pf-big" aria-hidden="true">
        <svg width="34" height="34" viewBox="0 0 12 12" focusable="false">
          <path d="M2.5 6.2 5 8.6 9.6 3.6" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h2 className="pf-title" ref={headRef} tabIndex={-1}>
        {page.title}
      </h2>
      <div className="pf-lead">
        <RichText text={page.body} />
        <p className="pf-saved">It's marked done in the course and saved in this browser.</p>
        {!next && <p>You've finished every lesson that's out so far.</p>}
      </div>
      <DoneLinks lesson={lesson} next={next} className="pf-nav pf-finish-links" nextRef={nextRef} nextLabel={next ? `Next lesson: ${next.title}` : undefined} />
      {next && <p className="pf-key">or press Enter</p>}
    </div>
  )
}

/** A lesson played as calm pages, one idea each. The runner still decides when a do page is passed. */
export function PageRun({
  lesson,
  pages,
  courseOpen,
  onToggleCourse,
}: {
  lesson: Lesson
  pages: LessonPage[]
  courseOpen: boolean
  onToggleCourse: () => void
}): React.JSX.Element {
  const { complete } = useProgress()
  const { state, run, next, reset, editorDone, saveFile, closeFile, openPr, mergePr, deleteRemoteBranch } = useLessonRunner(lesson, complete)
  const [index, setIndex] = useState(0)
  const page = pages[index] ?? pages[0]!
  const navigate = useNavigate()
  const skipTo = nextLesson(lesson.id)

  // Where each runner step's terminal entries begin, so a page shows only its own commands.
  const starts = useRef<Record<number, number>>({ 0: 0 })
  const lastLen = useRef(state.entries.length)
  if (state.entries.length < lastLen.current) starts.current[state.stepIndex] = 0 // `clear` or a reset
  if (starts.current[state.stepIndex] === undefined) starts.current[state.stepIndex] = lastLen.current
  lastLen.current = state.entries.length

  const ok = page.kind === 'do' ? passed(state, page.step) : true
  // Whether this visit started with the step still to do (the terminal shows), or came Back to it done.
  const [live, setLive] = useState<{ page: number; live: boolean }>({ page: 0, live: false })
  const liveAtStart = live.page === index ? live.live : page.kind === 'do' && !ok
  if (live.page !== index) setLive({ page: index, live: liveAtStart })

  const doneAt = useRef(0)
  const [doneSeq, setDoneSeq] = useState(0)
  const was = useRef({ index, ok })
  const continueRef = useRef<HTMLButtonElement>(null)
  useEffect(() => {
    const before = was.current
    was.current = { index, ok }
    // Only a pass seen on this page counts; coming Back to a passed page is not a new success.
    if (ok && !before.ok && before.index === index && page.kind === 'do') {
      doneAt.current = Date.now()
      setDoneSeq((n) => n + 1)
      // The input went away; after the guard, Continue takes focus so Enter or Space moves on.
      const t = window.setTimeout(() => {
        const a = document.activeElement
        if (!a || a === document.body || a.closest('.pf')) continueRef.current?.focus({ preventScroll: true })
      }, GUARD_MS)
      return () => window.clearTimeout(t)
    }
  }, [ok, index, page.kind])

  const headRef = useRef<HTMLHeadingElement>(null)
  const firstRender = useRef(true)
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    document.scrollingElement?.scrollTo?.({ top: 0 })
    // A do page focuses its terminal itself; everything else starts at the page title, so screen readers read the new page.
    if (!(page.kind === 'do' && liveAtStart && page.on !== 'server')) headRef.current?.focus({ preventScroll: true })
    // Only a page change moves focus.
  }, [index])

  const guarded = () => Date.now() - doneAt.current < GUARD_MS
  const onContinue = () => {
    if (!ok || guarded()) return
    if (page.kind === 'do' && state.stepIndex === page.step && state.status === 'step-done') next()
    if (index < pages.length - 1) setIndex(index + 1)
  }
  const back = () => setIndex((i) => Math.max(0, i - 1))

  // Enter anywhere on the page (outside a control) continues, like pressing the button.
  const onEnter = useRef<() => void>(() => {})
  onEnter.current = () => {
    if (page.kind === 'finish') {
      const nx = nextLesson(lesson.id)
      if (nx) void navigate(`/learn/${nx.id}`)
    } else onContinue()
  }
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.defaultPrevented || e.repeat || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const t = e.target as HTMLElement | null
      if (t && t !== document.body && (!t.closest('.pf') || t.closest('input, textarea, select, button, a, [contenteditable="true"], [role="tab"]'))) return
      if (courseOpen) return
      e.preventDefault()
      onEnter.current()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [courseOpen])

  const nav: Nav = { index, back, onContinue, canContinue: ok, continueRef }

  return (
    <div className="pf">
      <header className="pf-top">
        <button type="button" className="lh-course" aria-expanded={courseOpen} aria-controls={COURSE_DRAWER_ID} onClick={onToggleCourse}>
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          Course
        </button>
        <h1 className="pf-lesson">{lesson.title}</h1>
        <Dots count={pages.length} at={index} />
        <OptionsMenu
          onReset={() => {
            reset()
            starts.current = { 0: 0 }
            lastLen.current = 0
            setLive({ page: 0, live: false })
            setIndex(0)
          }}
        />
      </header>
      <p className="sr-only" role="status">
        {state.status === 'lesson-done' ? 'Lesson complete' : ''}
      </p>
      <div className="pf-stage">
        {page.kind === 'finish' ? (
          <FinishBody key={page.id} page={page} lesson={lesson} />
        ) : (
          <div className="pf-page" key={page.id}>
            <Head page={page} headRef={headRef} />
            <Visual page={page} state={state} done={page.kind === 'do' && ok} />
            {page.kind === 'do' && page.on === 'server' && (
              <ServerBody page={page} state={state} remote={{ onOpenPr: openPr, onMergePr: mergePr, onDeleteBranch: deleteRemoteBranch }} />
            )}
            {page.kind === 'do' && page.on !== 'server' && (
              <DoBody
                page={page}
                state={state}
                liveAtStart={liveAtStart}
                entryStart={starts.current[page.step] ?? 0}
                run={run}
                editorDone={editorDone}
                saveFile={saveFile}
                closeFile={closeFile}
                doneAt={doneSeq}
              />
            )}
            <Buttons nav={nav} />
            {ok && <p className="pf-key">or press Enter</p>}
            {lesson.skippable && index === 0 && skipTo && (
              <p className="pf-skip">
                Already comfortable in the terminal? <Link to={`/learn/${skipTo.id}`}>Skip to {skipTo.title}</Link>
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
