import { useState } from 'react'
import { Link } from 'react-router'
import { allLessons, course } from '../../lessons/course'
import type { Lesson } from '../../lessons/schema'
import { useProgress } from '../../progress/ProgressContext'
import { Nav } from '../layout/Nav'
import { useDocumentTitle } from '../layout/useDocumentTitle'
import '../buttons.css'
import './Home.css'

const STEPS = [
  { title: 'One idea at a time', text: 'Each page teaches a single thing, in plain words.' },
  { title: 'You type the commands', text: "A safe practice terminal. You can't break anything." },
  { title: 'See what happened', text: 'A live map shows your project change after every command.' },
]

function Ring({ done, total }: { done: number; total: number }): React.JSX.Element {
  const r = 36
  const c = 2 * Math.PI * r
  return (
    <div className="home-ring" role="img" aria-label={`${done} of ${total} lessons done`}>
      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true" focusable="false">
        <circle cx="42" cy="42" r={r} className="home-ring-bg" />
        <circle cx="42" cy="42" r={r} className="home-ring-fg" strokeDasharray={c} strokeDashoffset={c * (1 - (total ? done / total : 0))} />
      </svg>
      <b aria-hidden="true">{done}</b>
    </div>
  )
}

function Chevron(): React.JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="home-chev">
      <path d="m6 9 6 6 6-6" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

/** The lesson to continue with: the last one opened if it is not finished, else the first unfinished one. */
function pickNext(done: Record<string, unknown>, last?: string): Lesson | undefined {
  const all = allLessons()
  const lastLesson = all.find((l) => l.id === last)
  if (lastLesson && !done[lastLesson.id]) return lastLesson
  return all.find((l) => !done[l.id])
}

export function Home(): React.JSX.Element {
  useDocumentTitle('Your course · TermTrek', 'Learn Git by typing real commands in a practice terminal and watching your project history change. Free, no account.')
  const { progress } = useProgress()
  const all = allLessons()
  const total = all.filter((l) => course.some((s) => s.status === 'launch' && s.lessons.includes(l))).length
  const doneCount = all.filter((l) => progress.completed[l.id]).length
  const returning = doneCount > 0 || !!progress.lastLesson
  const next = pickNext(progress.completed, progress.lastLesson)
  const first = all[0]
  const skipTo = all.find((l) => l.id === 'what-is-git')
  const startedFirst = next?.id === first?.id && !progress.completed[first?.id ?? '']
  const sectionOf = next ? course.find((s) => s.lessons.includes(next)) : undefined
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const defaultOpen = sectionOf?.id ?? course[0]?.id
  const isOpen = (id: string) => open[id] ?? id === defaultOpen

  return (
    <>
      <Nav />
      <main id="main" className="home" tabIndex={-1}>
        {!returning || !next ? (
          <>
            {returning && !next ? (
              <>
                <p className="home-kick">All done</p>
                <h1>You finished every lesson</h1>
                <p className="home-lead">Revisit any lesson below, or try things out in the Playground.</p>
                <Link className="btn btn-p home-cta" to="/playground">
                  Open the Playground
                </Link>
              </>
            ) : (
              <>
                <p className="home-kick">Welcome</p>
                <h1>Learn Git by doing it</h1>
                <p className="home-lead">
                  No experience needed. You'll type real commands in a practice terminal and watch your project's history change as you go.
                </p>
                <div className="home-actions">
                  {first && (
                    <Link className="btn btn-p home-cta" to={`/learn/${first.id}`}>
                      Start the course
                    </Link>
                  )}
                  {skipTo && (
                    <Link className="home-link" to={`/learn/${skipTo.id}`}>
                      I already know the terminal. Skip to Git
                    </Link>
                  )}
                </div>
                <ol className="home-how">
                  {STEPS.map((s, i) => (
                    <li key={s.title}>
                      <i aria-hidden="true">{i + 1}</i>
                      <b>{s.title}</b>
                      <span>{s.text}</span>
                    </li>
                  ))}
                </ol>
                <p className="home-safe">Free, no account. Your progress stays on this device.</p>
              </>
            )}
          </>
        ) : (
          <>
            <p className="home-kick">Welcome back</p>
            <h1>Pick up where you left off</h1>
            <section className="home-cont" aria-label="Continue">
              <Ring done={doneCount} total={total} />
              <div className="home-cont-t">
                <small>{startedFirst && doneCount === 0 ? 'Start' : 'Continue'}</small>
                <h2>{next.title}</h2>
                <p>
                  {sectionOf?.title} · about {next.minutes} min
                </p>
              </div>
              <Link className="btn btn-p" to={`/learn/${next.id}`}>
                {startedFirst && doneCount === 0 ? 'Start' : 'Continue'}
              </Link>
            </section>
          </>
        )}

        <h2 className="home-h">{returning ? 'Your course' : "What you'll learn"}</h2>
        <p className="home-sub">
          {returning
            ? `${doneCount} of ${total} lessons done.`
            : `${total} short lessons, about 5 minutes each. Go in order, or jump to what you need.`}
        </p>
        <div className="home-secs">
          {course.map((s) => {
            const later = s.status === 'later'
            const d = s.lessons.filter((l) => progress.completed[l.id]).length
            const n = s.lessons.length
            const o = !later && isOpen(s.id)
            const listId = `home-list-${s.id}`
            return (
              <section key={s.id} className={later ? 'home-sec later' : o ? 'home-sec open' : 'home-sec'}>
                {later ? (
                  <div className="home-sh">
                    <div className="home-sh-t">
                      <h3>{s.title}</h3>
                      <p>{s.summary}</p>
                    </div>
                    <span className="home-badge">Coming next</span>
                  </div>
                ) : (
                  <>
                    <h3 className="home-sh-h">
                      <button type="button" className="home-sh" aria-expanded={o} aria-controls={listId} onClick={() => setOpen((v) => ({ ...v, [s.id]: !o }))}>
                        <span className="home-sh-t">
                          <span className="home-sh-name">{s.title}</span>
                          <span className="home-sh-sum">{s.summary}</span>
                        </span>
                        <span className="home-bar" aria-hidden="true">
                          <i style={{ width: `${n ? (d / n) * 100 : 0}%` }} />
                        </span>
                        <span className="home-cnt">
                          {d}/{n}
                          <span className="sr-only"> lessons done</span>
                        </span>
                        <Chevron />
                      </button>
                    </h3>
                    <ol className="home-ls" id={listId} hidden={!o}>
                      {s.lessons.map((l, j) => {
                        const isDone = !!progress.completed[l.id]
                        const isNext = returning && l.id === next?.id
                        return (
                          <li key={l.id}>
                            <Link className={isDone ? 'home-l d' : isNext ? 'home-l n' : 'home-l'} to={`/learn/${l.id}`} aria-current={isNext ? 'step' : undefined}>
                              <span className="home-dot" aria-hidden="true">
                                {isDone ? '✓' : isNext ? j + 1 : ''}
                              </span>
                              <span>{l.title}</span>
                              {isDone && <span className="sr-only"> (completed)</span>}
                            </Link>
                          </li>
                        )
                      })}
                    </ol>
                  </>
                )}
              </section>
            )
          })}
        </div>
      </main>
    </>
  )
}
