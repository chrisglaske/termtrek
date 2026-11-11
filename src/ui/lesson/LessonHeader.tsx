import { useEffect, useId, useRef, useState } from 'react'
import type { Lesson } from '../../lessons/schema'
import type { RunnerState } from '../../lessons/runner'
import { COURSE_DRAWER_ID } from './Sidebar'
import './LessonHeader.css'

const RESET_CONFIRM = 'Start this lesson over? Your progress on other lessons is kept.'

export function OptionsMenu({ onReset }: { onReset: () => void }): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        btnRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="lh-menu" ref={ref}>
      <button
        ref={btnRef}
        type="button"
        className="lh-more"
        aria-label="Lesson options"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <circle cx="5" cy="12" r="1.8" fill="currentColor" />
          <circle cx="12" cy="12" r="1.8" fill="currentColor" />
          <circle cx="19" cy="12" r="1.8" fill="currentColor" />
        </svg>
      </button>
      <div id={menuId} className="lh-pop" hidden={!open}>
        <button
          type="button"
          onClick={() => {
            setOpen(false)
            btnRef.current?.focus()
            if (window.confirm(RESET_CONFIRM)) onReset()
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M3 12a9 9 0 1 0 3-6.7M3 4v5h5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Reset this lesson
        </button>
      </div>
    </div>
  )
}

export function LessonHeader({
  lesson,
  state,
  onReset,
  courseOpen,
  onToggleCourse,
}: {
  lesson: Lesson
  state: RunnerState
  onReset: () => void
  courseOpen: boolean
  onToggleCourse: () => void
}): React.JSX.Element {
  const total = lesson.steps.length
  const doneCount = state.stepIndex + (state.status === 'working' ? 0 : 1)
  const n = state.stepIndex + 1
  return (
    <header className="lh">
      <button type="button" className="lh-course" aria-expanded={courseOpen} aria-controls={COURSE_DRAWER_ID} onClick={onToggleCourse}>
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
        Course
      </button>
      <div className="lh-head">
        <div className="lh-titlerow">
          <h1 className="lh-title">{lesson.title}</h1>
          <span className="lh-tag">
            {lesson.level}, {lesson.minutes} min
          </span>
        </div>
        {lesson.assumes && <p className="lh-assumes">Assumes: {lesson.assumes}</p>}
      </div>
      <div className="lh-progress">
        <div
          className="lh-bar"
          role="progressbar"
          aria-label="Lesson progress"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={doneCount}
          aria-valuetext={`${doneCount} of ${total} steps done`}
        >
          {lesson.steps.map((s, i) => (
            <i key={s.id} className={i < doneCount ? 'd' : i === state.stepIndex ? 'c' : undefined} />
          ))}
        </div>
        <span className="lh-count">
          Step {n} of {total}
        </span>
      </div>
      <OptionsMenu onReset={onReset} />
    </header>
  )
}
