import { useEffect, useRef, useState } from 'react'
import type { Explain, OutLine, Tone } from '../../engine/types'
import { CommandPill } from '../CommandPill'
import { FeedbackCard } from './FeedbackCard'
import './Terminal.css'

export interface TermEntry {
  prompt: { cwd: string; branch: string | null }
  input: string
  lines: OutLine[]
  explain?: Explain
  /** Output with no command typed (e.g. the editor closing): no prompt row is drawn. */
  note?: boolean
}

export interface TerminalProps {
  entries: TermEntry[]
  cwdLabel: string
  branch: string | null
  onRun: (line: string) => void
  onComplete: (line: string) => { line: string; options: string[] }
  suggestions?: string[]
  title?: string
  autoFocus?: boolean
  /** A card shown above the log, e.g. to explain a practice repo. */
  intro?: Explain
  /** While set, the live line shows this muted text instead of a prompt, and input is disabled. */
  waiting?: string
}

function Prompt({
  cwd,
  branch,
}: {
  cwd: string
  branch: string | null
}): React.JSX.Element {
  return (
    <span className="t-prompt">
      <span className="t-cwd">{cwd}</span>
      {branch !== null && <span className="t-branch"> ({branch})</span>}
      <span className="t-dollar"> $ </span>
    </span>
  )
}

export function Terminal({
  entries,
  cwdLabel,
  branch,
  onRun,
  onComplete,
  suggestions,
  title = 'Terminal',
  autoFocus,
  intro,
  waiting,
}: TerminalProps): React.JSX.Element {
  const [value, setValue] = useState('')
  const [options, setOptions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  // Submitted lines, seeded once from the entries on mount.
  const hist = useRef<string[] | null>(null)
  if (hist.current === null)
    hist.current = entries.map((e) => e.input).filter((h) => h.trim() !== '')
  const cursor = useRef<number | null>(null); // index into history, null = editing the draft
  const draft = useRef('')

  useEffect(() => {
    const el = logRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [entries])

  useEffect(() => {
    if (autoFocus) inputRef.current?.focus()
  }, [autoFocus])

  const history = (): string[] => hist.current ?? []

  const run = (line: string) => {
    const h = hist.current ?? []
    if (line.trim() !== '' && h[h.length - 1] !== line) h.push(line)
    hist.current = h
    cursor.current = null
    draft.current = ''
    setValue('')
    setOptions([])
    onRun(line)
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      run(value)
    } else if (e.key === 'l' && e.ctrlKey) {
      e.preventDefault()
      cursor.current = null
      setOptions([])
      onRun('clear')
    } else if (e.key === 'Tab') {
      e.preventDefault()
      cursor.current = null
      const r = onComplete(value)
      setValue(r.line)
      setOptions(r.options.length > 1 ? r.options : [])
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      const h = history()
      if (h.length === 0) return
      if (cursor.current === null) {
        draft.current = value
        cursor.current = h.length - 1
      } else if (cursor.current > 0) {
        cursor.current -= 1
      }
      setValue(h[cursor.current] ?? '')
      setOptions([])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (cursor.current === null) return
      const h = history()
      if (cursor.current < h.length - 1) {
        cursor.current += 1
        setValue(h[cursor.current] ?? '')
      } else {
        cursor.current = null
        setValue(draft.current)
      }
      setOptions([])
    }
  }

  const tone = (t?: Tone) => `tone-${t ?? 'out'}`

  return (
    <div
      className="term"
      onClick={(e) => {
        if (!(e.target as HTMLElement).closest('button'))
          inputRef.current?.focus()
      }}
    >
      <div className="term-bar">{title}</div>
      <div className="term-log" ref={logRef}>
        {intro && <FeedbackCard explain={intro} onCommand={run} />}
        <div role="log" aria-live="polite">
          {entries.map((en, i) => (
            <div className="term-entry" key={i}>
              {!en.note && (
                <div className="term-line">
                  <Prompt cwd={en.prompt.cwd} branch={en.prompt.branch} />
                  <span className="t-input">{en.input}</span>
                </div>
              )}
              {en.lines.map((line, j) => (
                <div className="term-line" key={j}>
                  {line.every((s) => s.text === '')
                    ? ' '
                    : line.map((s, k) => (
                        <span key={k} className={tone(s.tone)}>
                          {s.text}
                        </span>
                      ))}
                </div>
              ))}
              {en.explain && (
                <FeedbackCard explain={en.explain} onCommand={run} />
              )}
            </div>
          ))}
        </div>
        <div className="term-line term-live">
          {waiting ? (
            <span className="t-wait tone-muted">{waiting}</span>
          ) : (
            <Prompt cwd={cwdLabel} branch={branch} />
          )}
          <input
            ref={inputRef}
            className="term-input"
            aria-label="Terminal input"
            disabled={!!waiting}
            value={value}
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            onChange={(e) => {
              setValue(e.target.value)
              setOptions([])
              cursor.current = null
            }}
            onKeyDown={onKeyDown}
          />
        </div>
        {options.length > 0 && (
          <div className="term-line tone-muted">{options.join(' ')}</div>
        )}
        {suggestions && suggestions.length > 0 && (
          <div
            className="term-suggest"
            role="group"
            aria-label="Suggested commands"
          >
            {suggestions.map((s) => (
              <CommandPill key={s} cmd={s} onRun={run} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
