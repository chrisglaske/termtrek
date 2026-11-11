import { useEffect, useId, useRef } from 'react'
import type { Step } from '../../lessons/schema'
import type { RunnerState } from '../../lessons/runner'
import { CommandPill } from '../CommandPill'
import { RichText } from '../RichText'
import '../buttons.css'
import './LearnCard.css'

export function LearnCard({
  step,
  status,
  hintLevel,
  showMe,
  run,
  hint,
  onNext,
  focusInTerminal,
}: {
  step: Step
  status: RunnerState['status']
  hintLevel: number
  showMe: string | null
  run: (line: string) => void
  hint: () => void
  onNext: () => void
  focusInTerminal: () => boolean
}): React.JSX.Element {
  const nextRef = useRef<HTMLButtonElement>(null)
  const showMeRef = useRef<HTMLDivElement>(null)
  const focusShowMe = useRef(false)
  const done = status !== 'working'
  const titleId = useId()

  // Leave a learner who is typing in the terminal there (Enter on an empty line moves on).
  // Only when focus was lost, e.g. the Show me pill went away, hand it to "Next step".
  const inTerminal = useRef(focusInTerminal)
  inTerminal.current = focusInTerminal
  useEffect(() => {
    if (status === 'step-done' && !inTerminal.current()) nextRef.current?.focus()
  }, [status])

  // The Hint button goes away after the last hint, so move focus to "Show me".
  useEffect(() => {
    if (showMe && focusShowMe.current) {
      focusShowMe.current = false
      showMeRef.current?.querySelector('button')?.focus()
    }
  }, [showMe])

  const hints = step.hints.slice(0, hintLevel)
  const moreHints = hintLevel < step.hints.length

  return (
    <section className="learn" aria-labelledby={titleId}>
      <p className="learn-k">Learn</p>
      <h2 id={titleId} className="learn-title">
        {step.title}
      </h2>
      <div className="learn-body">
        <RichText text={step.learn} onCommand={run} />
      </div>
      <div className={done ? 'learn-task is-done' : 'learn-task'}>
        <div className="learn-task-head">
          <span>Your task</span>
          {done && (
            <span className="learn-done">
              <svg width="10" height="10" viewBox="0 0 12 12" aria-hidden="true" focusable="false">
                <path d="M2.5 6.2 5 8.6 9.6 3.6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              Done
            </span>
          )}
        </div>
        <RichText text={step.task} />
      </div>
      {hints.length > 0 && (
        <ol className="learn-hints" aria-label="Hints">
          {hints.map((h, i) => (
            <li key={i}>
              <span className="learn-hint-n" aria-hidden="true">
                {i + 1}
              </span>
              <div>
                <RichText text={h} />
              </div>
            </li>
          ))}
        </ol>
      )}
      {showMe && !done && (
        <div className="showme" ref={showMeRef}>
          <p className="showme-k">
            Show me <span className="showme-note">Select the command to run it.</span>
          </p>
          <CommandPill cmd={showMe} onRun={run} />
        </div>
      )}
      {status === 'step-done' && (
        <div className="learn-note">
          <RichText text="Press Enter in the terminal or select **Next step**." />
        </div>
      )}
      <div className="learn-btns">
        <button ref={nextRef} type="button" className="btn btn-p btn-sm" disabled={status !== 'step-done'} onClick={onNext}>
          Next step
          <span aria-hidden="true">→</span>
        </button>
        {moreHints && !done && (
          <button
            type="button"
            className="btn btn-s btn-sm"
            onClick={() => {
              if (hintLevel + 1 === step.hints.length) focusShowMe.current = true
              hint()
            }}
          >
            Hint
          </button>
        )}
      </div>
    </section>
  )
}
