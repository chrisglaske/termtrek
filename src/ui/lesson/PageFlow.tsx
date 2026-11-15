import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router'
import type { DoPage, FinishPage, Lesson, LessonPage } from '../../lessons/schema'
import type { RunnerState } from '../../lessons/runner'
import { nextLesson } from '../../lessons/course'
import { useLessonRunner } from '../../lessons/useLessonRunner'
import { useProgress } from '../../progress/ProgressContext'
import { savedNote } from '../../progress/store'
import { RichText } from '../RichText'
import { COURSE_DRAWER_ID } from './Sidebar'
import { OptionsMenu } from './LessonHeader'
import { DoneLinks } from './LessonDone'
import { PrVisual } from './PrVisual'
import { RemotePanel } from '../remote/RemotePanel'
import type { RemotePanelProps } from '../remote/RemotePanel'
import '../buttons.css'
import './PageFlow.css'
import { DoBody, FailedNote, GUARD_MS, passed, refusedOverwrite, Dots, Visual, Buttons, Head, usePageStarts } from './PageParts'
export { DoBody, FailedNote, Head, usePageStarts } from './PageParts'
import type { Nav } from './PageParts'

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
      {ok && <PrVisual world={state.world} fresh />}
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
        <p className="pf-saved">{savedNote()}</p>
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

  const starts = usePageStarts(state)

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
          Lessons
        </button>
        <h1 className="pf-lesson">{lesson.title}</h1>
        <Dots count={pages.length} at={index} />
        <OptionsMenu
          onReset={() => {
            reset()
            starts.reset()
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
          <div className={`pf-page${page.kind === 'do' ? ' pf-do' : ''}`} key={page.id}>
            {/* On a wide, short screen the lesson text and picture sit beside the command and terminal, so a page fits without scrolling. */}
            <div className="pf-body">
              <div className="pf-left">
                <Head page={page} headRef={headRef} done={page.kind === 'do' && ok} />
                <Visual page={page} state={state} done={page.kind === 'do' && ok} refused={page.kind === 'do' && !ok && refusedOverwrite(state, starts.from(page.step))} />
                {page.kind === 'do' && !ok && page.visual.kind !== 'none' && <FailedNote state={state} from={starts.from(page.step)} />}
              </div>
              {page.kind === 'do' && (
                <div className="pf-right">
                  {page.on === 'server' ? (
                    <ServerBody page={page} state={state} remote={{ onOpenPr: openPr, onMergePr: mergePr, onDeleteBranch: deleteRemoteBranch }} />
                  ) : (
                    <DoBody
                      page={page}
                      state={state}
                      liveAtStart={liveAtStart}
                      entryStart={starts.from(page.step)}
                      run={run}
                      editorDone={editorDone}
                      saveFile={saveFile}
                      closeFile={closeFile}
                      doneAt={doneSeq}
                    />
                  )}
                </div>
              )}
            </div>
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
