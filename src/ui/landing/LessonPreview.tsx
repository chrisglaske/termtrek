import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import type { World } from '../../engine/types'
import { activeRepo } from '../../engine/git/repoState'
import { branchOf } from '../../engine/git/refs'
import { displayPath } from '../../engine/paths'
import { firstCommit } from '../../lessons/foundations/first-commit'
import type { StageBox } from '../../lessons/schema'
import { RichText } from '../RichText'
import { CommandPill } from '../CommandPill'
import { Terminal } from '../terminal/Terminal'
import type { TermEntry } from '../terminal/Terminal'
import { FeedbackCard } from '../terminal/FeedbackCard'
import { StageVisual } from '../lesson/StageVisual'
import { CommandCard } from '../lesson/CommandCard'
import { STAGE_PAGE, previewFrames } from './previewFrames'
import type { PreviewFrame, PreviewStep } from './previewFrames'
import '../buttons.css'
import '../lesson/PageFlow.css'
import './LessonPreview.css'

export type { PreviewStep } from './previewFrames'

/** How long each step stays up while the preview plays. */
const DURATION: Record<PreviewStep, number> = { 0: 3200, 1: 4200, 2: 3600, 3: 4200 }
const LABEL = 'A TermTrek lesson: you type git add notes.txt and the file moves from Folder to Staged'
/** How fast the preview types its command, one letter at a time. */
const TYPE_MS = 70

let cached: PreviewFrame[] | null = null
const frames = (): PreviewFrame[] => (cached ??= previewFrames())

const visual = STAGE_PAGE.visual.kind === 'stage' ? STAGE_PAGE.visual : { show: ['folder', 'staged'] as StageBox[], hot: 'folder' as StageBox }
const pages = firstCommit.pages ?? []
const pageAt = pages.indexOf(STAGE_PAGE)

const noop = () => {}
const noComplete = (line: string) => ({ line, options: [] })

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The boxes as they look on the lesson page. Each step's picture first sees the lesson's starting world,
 * so a step whose command moved a file gets the real caption and the ring that follows the file.
 */
function StageFrom({ start, world, advance, last }: { start: World; world: World; advance: boolean; last?: string }): React.JSX.Element {
  const [shown, setShown] = useState(start)
  useLayoutEffect(() => setShown(world), [world])
  return <StageVisual world={shown} show={visual.show} hot={visual.hot} advance={advance} compact last={last} />
}

/** One moment of the real "Choose the file" lesson page, drawn by the lesson's own parts. Nothing in it can be focused. */
export function LessonPreview({ step, typedSoFar }: { step: PreviewStep; typedSoFar?: string }): React.JSX.Element {
  const all = frames()
  const frame = all[step]!
  const typed = typedSoFar ?? frame.typed
  // The step's command has been entered: its output, and what it changed, show.
  const ran = frame.entries.length > 0 && typed === frame.typed
  const repo = activeRepo(frame.world)
  const prompt = { cwd: displayPath(frame.world, frame.world.cwd), branch: repo ? branchOf(repo) : null }
  const entries: TermEntry[] = ran ? frame.entries.map((e) => ({ ...e, explain: undefined })) : [{ prompt, input: typed, lines: [] }]
  const explain = ran && frame.hint ? frame.entries.at(-1)?.explain : undefined
  const ok = ran && frame.staged

  return (
    <div className={`lp-body${ran ? '' : ' lp-typing'}`} role="img" aria-label={LABEL}>
      <div className="lp-page" aria-hidden="true" inert>
        <div className="lp-left">
          <p className="pf-kick">{STAGE_PAGE.kicker}</p>
          <p className="pf-title">{STAGE_PAGE.title}</p>
          <div className="pf-lead">
            <RichText text={STAGE_PAGE.body} />
          </div>
          <StageFrom key={step} start={frame.from} world={frame.world} advance={ok} last={ran ? frame.entries.at(-1)?.input : undefined} />
        </div>
        <div className="lp-right">
          <CommandCard parts={STAGE_PAGE.command} typed={ran ? '' : typed} />
          <div className="pf-term">
            <Terminal entries={entries} cwdLabel={prompt.cwd} branch={prompt.branch} onRun={noop} onComplete={noComplete} done />
            {/* The engine's own feedback card, drawn without its click-to-run button so the picture holds nothing focusable. */}
            {explain && <FeedbackCard explain={explain} />}
          </div>
          <div className="pf-result">
            {ok && (
              <div className="pf-good">
                <span className="pf-good-i">✓</span>
                <span>
                  <RichText text={STAGE_PAGE.done} />
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="lp-foot" aria-hidden="true">
        <span className="btn pf-back">Back</span>
        <span className={`btn btn-p${ok ? ' lp-go' : ''}`}>Continue</span>
      </div>
    </div>
  )
}

const STEPS: { title: string; text: React.ReactNode }[] = [
  { title: 'Understand the idea', text: 'One idea per page, in plain words: what the command does and why teams care.' },
  { title: 'Type it yourself', text: 'Real Git commands in a practice terminal. Any correct approach counts.' },
  { title: 'See what changed', text: 'The picture moves with every command, so staging, commits and branches stop being invisible.' },
  {
    title: 'Get unstuck fast',
    text: (
      <>
        Ask for a hint, or type <CommandPill cmd="status" /> by mistake and it asks if you meant <CommandPill cmd="git status" />.
      </>
    ),
  },
]

/** The four steps as a plain list, for phones, where the playing lesson beside them does not fit. */
export function HowSteps(): React.JSX.Element {
  return (
    <ol className="how-list">
      {STEPS.map((s, i) => (
        <li key={s.title}>
          <span className="lp-n" aria-hidden="true">
            {i + 1}
          </span>
          <span className="lp-st">
            <span className="lp-h">{s.title}</span>
            <span className="lp-d">{s.text}</span>
          </span>
        </li>
      ))}
    </ol>
  )
}

function useHidden(): boolean {
  const [hidden, setHidden] = useState(() => typeof document !== 'undefined' && document.hidden)
  useEffect(() => {
    const on = () => setHidden(document.hidden)
    document.addEventListener('visibilitychange', on)
    return () => document.removeEventListener('visibilitychange', on)
  }, [])
  return hidden
}

/** "How it works": the four parts of every lesson, with a live preview of a real lesson page playing beside them. */
export function HowItWorks(): React.JSX.Element {
  // With reduced motion the preview holds on the moment the file moves, and only changes when asked.
  const [still] = useState(reducedMotion)
  const first: PreviewStep = still ? 2 : 0
  const [step, setStep] = useState<PreviewStep>(first)
  const [seq, setSeq] = useState(0)
  const [chars, setChars] = useState(0)
  const typedRef = useRef(0)
  // What is left of the current step's time; a new object per step, so a paused step resumes where its bar stopped.
  const left = useRef({ ms: DURATION[first] })
  const [playing, setPlaying] = useState(!still)
  const hidden = useHidden()
  const id = useId()
  const target = frames()[step]!.typed
  const typedSoFar = still ? target : target.slice(0, chars)
  const paused = !playing || hidden

  const go = (n: PreviewStep) => {
    setStep(n)
    setChars(0)
    typedRef.current = 0
    left.current = { ms: DURATION[n] }
    setSeq((s) => s + 1)
  }
  const watch = (n: PreviewStep) => {
    setPlaying(!still)
    go(n)
  }

  // Type the step's command one letter at a time.
  useEffect(() => {
    if (still || paused || typedRef.current >= target.length) return
    const t = window.setInterval(() => {
      typedRef.current += 1
      setChars(typedRef.current)
      if (typedRef.current >= target.length) window.clearInterval(t)
    }, TYPE_MS)
    return () => window.clearInterval(t)
  }, [still, paused, target, seq])

  useEffect(() => {
    if (paused) return
    const run = left.current
    const began = Date.now()
    const t = window.setTimeout(() => go(((step + 1) % 4) as PreviewStep), run.ms)
    return () => {
      window.clearTimeout(t)
      run.ms = Math.max(0, run.ms - (Date.now() - began))
    }
  }, [paused, step, seq])

  return (
    <div className={`how lp${paused ? ' lp-paused' : ''}`} style={{ '--dur': `${DURATION[step]}ms` } as React.CSSProperties}>
      <ol className="lp-steps">
        {STEPS.map((s, i) => (
          <li key={s.title}>
            <button type="button" aria-pressed={i === step} aria-labelledby={`${id}-t${i}`} aria-describedby={`${id}-d${i}`} onClick={() => watch(i as PreviewStep)}>
              <span className="lp-n" aria-hidden="true">
                {i + 1}
              </span>
              <span className="lp-st">
                <span className="lp-h" id={`${id}-t${i}`}>
                  {s.title}
                </span>
                <span className="lp-d" id={`${id}-d${i}`}>
                  {s.text}
                </span>
              </span>
              {i === step && !still && (
                <span className="lp-bar" aria-hidden="true">
                  <i key={seq} />
                </span>
              )}
            </button>
          </li>
        ))}
      </ol>
      <div className="lp-prev">
        <div className="lp-top">
          <span className="lp-crs" aria-hidden="true">
            <svg width="13" height="13" viewBox="0 0 24 24" focusable="false">
              <path d="M4 7h16M4 12h16M4 17h16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
            <span className="lp-crs-t">Lessons</span>
          </span>
          <span className="lp-name">{firstCommit.title}</span>
          <span className="pf-dots" aria-hidden="true">
            {pages.map((p, i) => (
              <i key={p.id} className={i < pageAt ? 'd' : i === pageAt ? 'c' : undefined} />
            ))}
          </span>
          <button type="button" className="lp-pause" aria-label={playing ? 'Pause the lesson preview' : 'Play the lesson preview'} onClick={() => setPlaying((p) => !p)}>
            <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true" focusable="false">
              {playing ? <path d="M2 1h2v8H2zM6 1h2v8H6z" fill="currentColor" /> : <path d="M2 1l7 4-7 4z" fill="currentColor" />}
            </svg>
            {playing ? 'Pause' : 'Play'}
          </button>
        </div>
        <LessonPreview step={step} typedSoFar={typedSoFar} />
      </div>
    </div>
  )
}
