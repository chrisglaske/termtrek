import { useEffect, useReducer, useRef, useState } from 'react'
import { Link } from 'react-router'
import { firstCommit } from '../../lessons/foundations/first-commit'
import { initRunner, runnerReducer } from '../../lessons/runner'
import { activeRepo, headCommitId } from '../../engine/git/repoState'
import type { DoPage } from '../../lessons/schema'
import { RichText } from '../RichText'
import { StageVisual } from '../lesson/StageVisual'
import { DoBody, FailedNote, Head, usePageStarts } from '../lesson/PageParts'
import '../buttons.css'
import '../lesson/PageFlow.css'
import './LessonPreview.css'
import './HeroLesson.css'

const pages = firstCommit.pages ?? []
const doPage = (id: string): DoPage => pages.find((p): p is DoPage => p.kind === 'do' && p.id === id)!
/** The lesson's two do pages, "Choose the file" and "Save it", in order. */
const MOVES = [doPage('stage'), doPage('commit')] as const
/** How long the first move's success shows before the second move starts. */
const BEAT_MS = 1200

const noop = () => {}

const matches = (query: string): boolean => typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches

/** Focus may move here only when the visitor is not busy somewhere else on the page. */
const focusIsFree = (root: HTMLElement | null): boolean => {
  const a = document.activeElement
  return !a || a === document.body || !!root?.contains(a)
}

/**
 * The first lesson's two do pages, drawn by the lesson's own parts and checked by the real runner,
 * ready to type into. Nothing is saved: the practice world lives only in this component.
 */
export function HeroLesson(): React.JSX.Element {
  const [state, dispatch] = useReducer(runnerReducer, firstCommit, initRunner)
  const [round, setRound] = useState(0)
  // The "Try it" cue shows until the visitor types their first key.
  const [used, setUsed] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const startRef = useRef<HTMLAnchorElement>(null)
  const page = MOVES[Math.min(state.stepIndex, MOVES.length - 1)]!
  const finished = state.status === 'lesson-done'
  const ok = state.stepIndex === page.step && state.status !== 'working'
  const v = page.visual.kind === 'stage' ? page.visual : null
  // The page's done line, and on the commit page what Git's report adds: the new commit's ID.
  const repo = activeRepo(state.world)
  const head = page.report && repo ? headCommitId(repo) : null
  const said = head ? `${page.done} \`${head.slice(0, 7)}\` is your commit's ID.` : page.done

  // As in the lesson, each page's terminal shows only its own commands.
  const starts = usePageStarts(state)
  const from = starts.from(page.step)
  // True when the visitor's last command was typed into this terminal, so its input had focus.
  const typedHere = useRef(false)

  // After the first move passes, a short beat to see it, then the second move.
  useEffect(() => {
    if (state.stepIndex !== 0 || state.status !== 'step-done') return
    const t = window.setTimeout(() => dispatch({ type: 'next' }), matches('(prefers-reduced-motion: reduce)') ? 0 : BEAT_MS)
    return () => window.clearTimeout(t)
  }, [state.stepIndex, state.status])

  // Ready to type: on load the terminal takes focus only with a mouse or trackpad, so a phone's keyboard never pops up.
  // Move 2 takes it back from move 1's input on any device: the visitor was typing, so the keyboard is already open.
  useEffect(() => {
    const keep = page.step > 0 && typedHere.current
    if ((!keep && !matches('(pointer: fine)')) || !focusIsFree(rootRef.current)) return
    rootRef.current?.querySelector<HTMLInputElement>('.term-input')?.focus({ preventScroll: true })
  }, [page.id, page.step, round])

  useEffect(() => {
    if (!finished || !focusIsFree(rootRef.current)) return
    startRef.current?.focus({ preventScroll: true })
    startRef.current?.scrollIntoView?.({ block: 'nearest' })
  }, [finished])

  const run = (line: string) => {
    const a = document.activeElement
    typedHere.current = !!a && a.classList.contains('term-input') && !!rootRef.current?.contains(a)
    dispatch({ type: 'run', line })
  }

  const again = () => {
    starts.reset()
    typedHere.current = false
    dispatch({ type: 'reset' })
    setRound((r) => r + 1)
  }

  return (
    <div className={used ? 'hl-wrap hl-used' : 'hl-wrap'} onInput={used ? undefined : () => setUsed(true)}>
      <div className="lp-prev hl" role="group" aria-label="Try the first lesson" ref={rootRef}>
        <div className="lp-top">
          <span className="lp-crs" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" focusable="false">
              <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span className="lp-crs-t">Lessons</span>
          </span>
          <span className="lp-name">{firstCommit.title}</span>
          <span className="pf-dots" aria-hidden="true">
            {pages.map((p, i) => {
              const at = pages.indexOf(page)
              return <i key={p.id} className={i < at ? 'd' : i === at ? 'c' : undefined} />
            })}
          </span>
        </div>
        <div className="lp-body lp-live">
          <div className="lp-page" key={`${page.id}-${round}`}>
            <div className="lp-left">
              <Head page={page} />
              {v && <StageVisual world={state.world} show={v.show} hot={v.hot} advance={ok} compact last={state.ran.at(-1)} />}
              {!ok && <FailedNote state={state} from={from} />}
            </div>
            <div className="lp-right">
              <DoBody
                page={page}
                state={state}
                liveAtStart
                entryStart={from}
                run={run}
                editorDone={(text) => dispatch({ type: 'editor-done', text })}
                saveFile={noop}
                closeFile={noop}
                doneAt={1}
                autoFocus={false}
                helpers={false}
                placeholder="Type the command here"
                beforeTerm={
                  <div className="hl-cue-slot" aria-hidden="true">
                    {!used && (
                      <span className="hl-cue">
                        <i className="hl-cue-dot" />
                        Try it: type below
                      </span>
                    )}
                  </div>
                }
                outcome={
                  <div className="hl-out">
                    <div className="pf-good">
                      <span className="pf-good-i" aria-hidden="true">
                        ✓
                      </span>
                      <span>
                        <RichText text={said} />
                      </span>
                    </div>
                    {finished && (
                      <div className="hl-end">
                        <p className="hl-end-t">You just made your first commit.</p>
                        <Link className="btn btn-p" to="/learn" ref={startRef}>
                          Start the course
                        </Link>
                        <button type="button" className="btn btn-s" onClick={again}>
                          Try again
                        </button>
                      </div>
                    )}
                  </div>
                }
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
