import { useEffect, useId, useRef } from 'react'
import { Link } from 'react-router'
import type { Lesson } from '../../lessons/schema'
import { savedNote } from '../../progress/store'
import '../buttons.css'
import './LearnCard.css'

export function LessonDone({
  lesson,
  next,
  focusInTerminal,
}: {
  lesson: Lesson
  next: Lesson | undefined
  focusInTerminal: () => boolean
}): React.JSX.Element {
  const headRef = useRef<HTMLHeadingElement>(null)
  const titleId = useId()
  const inTerminal = useRef(focusInTerminal)
  useEffect(() => {
    // A learner typing in the terminal keeps focus there; the live region announces completion.
    if (!inTerminal.current()) headRef.current?.focus()
  }, [])
  return (
    <section className="learn lesson-done" aria-labelledby={titleId}>
      <span className="done-icon" aria-hidden="true">
        <svg width="22" height="22" viewBox="0 0 12 12" focusable="false">
          <path d="M2.5 6.2 5 8.6 9.6 3.6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <h2 id={titleId} className="learn-title" ref={headRef} tabIndex={-1}>
        Lesson complete
      </h2>
      <p className="done-sub">
        You finished <strong>{lesson.title}</strong>. {savedNote()}
      </p>
      {next ? (
        <p className="done-next">
          Up next: <strong>{next.title}</strong>
        </p>
      ) : (
        <p className="done-next">You've finished every lesson that's out so far.</p>
      )}
      <DoneLinks lesson={lesson} next={next} className="learn-btns" size="btn-sm" />
    </section>
  )
}

/** Where to go after a lesson: the next one, the course, and the Playground after the team section. */
export function DoneLinks({
  lesson,
  next,
  className,
  size = '',
  nextRef,
  nextLabel = 'Next lesson',
}: {
  lesson: Lesson
  next: Lesson | undefined
  className: string
  size?: string
  nextRef?: React.Ref<HTMLAnchorElement>
  nextLabel?: string
}): React.JSX.Element {
  const sz = size ? ` ${size}` : ''
  return (
    <div className={className}>
      {next && (
        <Link className={`btn btn-p${sz}`} to={`/learn/${next.id}`} ref={nextRef}>
          {nextLabel}
          <span aria-hidden="true">→</span>
        </Link>
      )}
      <Link className={`btn btn-s${sz}`} to="/#course">
        Back to course
      </Link>
      {lesson.section === 'team' && next?.section !== 'team' && (
        <Link className={`btn btn-s${sz}`} to="/playground">
          Keep practicing in the Playground
        </Link>
      )}
    </div>
  )
}
