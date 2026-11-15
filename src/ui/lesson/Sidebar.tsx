import { useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { course } from '../../lessons/course'
import { useProgress } from '../../progress/ProgressContext'
import { useFocusTrap } from '../useFocusTrap'
import './Sidebar.css'

function Check(): React.JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M2.5 6.2 5 8.6 9.6 3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export const COURSE_DRAWER_ID = 'course-drawer'

/** The course list, as a drawer that the lesson header's Course button opens. */
export function Sidebar({ currentId, open, onClose }: { currentId: string; open: boolean; onClose: () => void }): React.JSX.Element {
  const { progress } = useProgress()
  const navRef = useRef<HTMLElement>(null)
  // The drawer covers the page: keep Tab inside it and start at this lesson.
  useFocusTrap(navRef, open)
  // On closing, go back to the Lessons button, even when the click that opened the drawer did not focus it (Safari).
  const wasOpen = useRef(false)
  useEffect(() => {
    if (open) navRef.current?.querySelector<HTMLElement>('[aria-current="page"]')?.focus()
    else if (wasOpen.current) document.querySelector<HTMLElement>(`[aria-controls="${COURSE_DRAWER_ID}"]`)?.focus()
    wasOpen.current = open
  }, [open])
  const setOpen = (o: boolean) => {
    if (!o) onClose()
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  return (
    <>
      {open && <div className="side-backdrop" onClick={onClose} aria-hidden="true" />}
      <nav ref={navRef} id={COURSE_DRAWER_ID} className="side" aria-label="Lessons" hidden={!open}>
      <div className="side-top">
        <button type="button" className="side-close" aria-label="Close the lesson list" onClick={onClose}>
          <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          Close
        </button>
      </div>
      <div className="side-body">
        {course.map((section) => {
          const later = section.status === 'later'
          return (
            <section key={section.id} className={later ? 'side-sec later' : 'side-sec'}>
              <h2 className="side-head">
                <span>{section.title}</span>
                {later && <span className="side-badge">Coming next</span>}
              </h2>
              {!later && section.lessons.length === 0 && <p className="side-soon">Lessons coming soon</p>}
              {!later && section.lessons.length > 0 && (
                <ol className="side-list">
                  {section.lessons.map((lesson, i) => {
                    const done = !!progress.completed[lesson.id]
                    const current = lesson.id === currentId
                    const cls = current ? 'side-item now' : done ? 'side-item done' : 'side-item todo'
                    return (
                      <li key={lesson.id}>
                        <Link
                          className={cls}
                          to={`/learn/${lesson.id}`}
                          aria-current={current ? 'page' : undefined}
                          onClick={() => setOpen(false)}
                        >
                          <span className="side-ic" aria-hidden="true">
                            {done ? <Check /> : current ? i + 1 : null}
                          </span>
                          <span className="side-title">{lesson.title}</span>
                          {done && <span className="sr-only"> (completed)</span>}
                        </Link>
                      </li>
                    )
                  })}
                </ol>
              )}
            </section>
          )
        })}
      </div>
      </nav>
    </>
  )
}
