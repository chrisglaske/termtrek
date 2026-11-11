import { useEffect, useId, useLayoutEffect, useRef } from 'react'
import { useParams } from 'react-router'
import { findLesson, nextLesson } from '../../lessons/course'
import type { Lesson } from '../../lessons/schema'
import { useLessonRunner } from '../../lessons/useLessonRunner'
import { useProgress } from '../../progress/ProgressContext'
import type { World } from '../../engine/types'
import { RepoMap } from '../repomap/RepoMap'
import { Nav } from '../layout/Nav'
import { useDocumentTitle } from '../layout/useDocumentTitle'
import { NotFound } from '../NotFound'
import { Sidebar } from './Sidebar'
import { LessonHeader } from './LessonHeader'
import { LearnCard } from './LearnCard'
import { LessonDone } from './LessonDone'
import { Workspace } from './Workspace'
import type { WorkspaceHandle } from './Workspace'
import './LessonScreen.css'

// Phones and narrow tablets: don't pop the on-screen keyboard or jump the page on load.
function isWide(): boolean {
  return typeof window.matchMedia !== 'function' || window.matchMedia('(min-width: 980px)').matches
}

function RepoPanel({ world }: { world: World }): React.JSX.Element {
  const tabId = useId()
  const panelId = useId()
  return (
    <section className="lesson-repo" aria-label="Repository">
      <div className="repo-tabs" role="tablist" aria-label="Repository views">
        <button type="button" role="tab" id={tabId} aria-selected="true" aria-controls={panelId} tabIndex={0}>
          Your repo
        </button>
      </div>
      <div role="tabpanel" id={panelId} aria-labelledby={tabId}>
        <RepoMap world={world} />
      </div>
    </section>
  )
}

function LessonRun({ lesson }: { lesson: Lesson }): React.JSX.Element {
  const { complete } = useProgress()
  const { state, run, hint, next, reset, saveFile, closeFile, editorDone, showMe } = useLessonRunner(lesson, complete)
  const termRef = useRef<HTMLDivElement>(null)
  const { world, status } = state
  const step = lesson.steps[state.stepIndex]

  const runRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WorkspaceHandle>(null)
  const focusTerminal = () => wsRef.current?.focusTerminal({ preventScroll: isWide() })
  const runFromCard = (line: string) => wsRef.current?.run(line)
  const focusInTerminal = () => !!termRef.current?.contains(document.activeElement)

  useEffect(() => {
    if (isWide()) termRef.current?.querySelector('input')?.focus({ preventScroll: true })
  }, [])

  // The sticky terminal fills the space under the lesson header, which can wrap to two lines.
  useLayoutEffect(() => {
    const root = runRef.current
    const head = root?.querySelector('.lh')
    if (!root || !head || typeof ResizeObserver !== 'function') return
    const ro = new ResizeObserver(() => {
      root.style.setProperty('--lh-h', `${head.getBoundingClientRect().height}px`)
    })
    ro.observe(head)
    return () => ro.disconnect()
  }, [])

  // Enter on an empty line moves on once the step is solved, so keyboard users never leave the terminal.
  const onRun = (line: string) => {
    if (line.trim() === '' && status === 'step-done') next()
    else run(line)
  }

  return (
    <div className="lesson-run" ref={runRef}>
      <LessonHeader
        lesson={lesson}
        state={state}
        onReset={() => {
          reset()
          focusTerminal()
        }}
      />
      <p className="sr-only" role="status">
        {status === 'lesson-done' ? 'Lesson complete' : ''}
      </p>
      <div className="lesson-work">
        <div className="lesson-learn">
          {status === 'lesson-done' ? (
            <LessonDone lesson={lesson} next={nextLesson(lesson.id)} focusInTerminal={focusInTerminal} />
          ) : (
            step && (
              <LearnCard
                step={step}
                status={status}
                hintLevel={state.hintLevel}
                showMe={showMe}
                run={runFromCard}
                hint={hint}
                focusInTerminal={focusInTerminal}
                onNext={() => {
                  next()
                  focusTerminal()
                }}
              />
            )
          )}
        </div>
        <div className="lesson-term" ref={termRef}>
          <Workspace ref={wsRef} state={state} onRun={onRun} saveFile={saveFile} closeFile={closeFile} editorDone={editorDone} />
        </div>
        <RepoPanel world={world} />
      </div>
    </div>
  )
}

function LessonPage({ lesson }: { lesson: Lesson }): React.JSX.Element {
  const { setLast } = useProgress()
  useDocumentTitle(`${lesson.title} · TermTrek`)
  const setLastRef = useRef(setLast)
  setLastRef.current = setLast
  useEffect(() => {
    setLastRef.current(lesson.id)
  }, [lesson.id])

  return (
    <>
      <Nav />
      <div className="lesson-shell">
        <Sidebar currentId={lesson.id} />
        <main id="main" className="lesson-main" tabIndex={-1}>
          <LessonRun key={lesson.id} lesson={lesson} />
        </main>
      </div>
    </>
  )
}

export function LessonScreen(): React.JSX.Element {
  const { lessonId } = useParams()
  const lesson = lessonId ? findLesson(lessonId) : undefined
  if (!lesson) return <NotFound />
  return <LessonPage lesson={lesson} />
}
