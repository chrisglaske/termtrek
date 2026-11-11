import { useId, useState } from 'react'
import { Link } from 'react-router'
import { course } from '../../lessons/course'
import { useProgress } from '../../progress/ProgressContext'
import './Sidebar.css'

function Check(): React.JSX.Element {
  return (
    <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
      <path d="M2.5 6.2 5 8.6 9.6 3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

export function Sidebar({ currentId }: { currentId: string }): React.JSX.Element {
  const { progress } = useProgress()
  const [open, setOpen] = useState(false)
  const listId = useId()

  return (
    <nav className="side" aria-label="Course">
      <button
        type="button"
        className="side-toggle"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((o) => !o)}
      >
        Course
        <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <div id={listId} className={open ? 'side-body open' : 'side-body'}>
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
  )
}
