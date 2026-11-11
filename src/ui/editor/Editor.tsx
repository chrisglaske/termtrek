import { useEffect, useMemo, useRef, useState } from 'react'
import { findConflicts, resolveConflict } from './conflicts'
import '../buttons.css'
import './Editor.css'

export interface EditorProps {
  name: string
  initial: string
  kind: 'file' | 'message'
  onSave(text: string): void
  onClose(): void
  /** Tells the tab strip whether there are unsaved changes. */
  onDirty?(dirty: boolean): void
  /** Bump to ask the editor to close (e.g. the tab's ×); a dirty file asks first. */
  askClose?: number
  /** Feedback shown right under the toolbar (e.g. the result of the last Save). */
  notice?: React.ReactNode
}

export function Editor({ name, initial, kind, onSave, onClose, onDirty, askClose = 0, notice }: EditorProps): React.JSX.Element {
  const [text, setText] = useState(initial)
  const [saved, setSaved] = useState(initial)
  const [seen, setSeen] = useState(initial)
  const [asking, setAsking] = useState(false)
  const areaRef = useRef<HTMLTextAreaElement>(null)
  const keepRef = useRef<HTMLButtonElement>(null)
  const dirty = kind === 'file' && text !== saved

  // The file changed on disk (e.g. from the terminal): show it, unless there are edits to keep.
  if (initial !== seen) {
    setSeen(initial)
    if (!dirty) {
      setText(initial)
      setSaved(initial)
    }
  }

  const dirtyCb = useRef(onDirty)
  dirtyCb.current = onDirty
  useEffect(() => dirtyCb.current?.(dirty), [dirty])

  const requestClose = () => {
    if (dirty) setAsking(true)
    else onClose()
  }
  const closeRef = useRef(requestClose)
  closeRef.current = requestClose
  // Only a bump after mount asks; a value carried over from an earlier tab must not close a fresh editor.
  const askedAt = useRef(askClose)
  useEffect(() => {
    if (askClose === askedAt.current) return
    askedAt.current = askClose
    closeRef.current()
  }, [askClose])

  useEffect(() => {
    if (asking) keepRef.current?.focus()
  }, [asking])

  const save = () => {
    setSaved(text)
    onSave(text)
  }

  const lines = text.split('\n')
  const conflicts = useMemo(() => findConflicts(text), [text])
  const marks = new Set(conflicts.flatMap((c) => [c.start, c.mid, c.end]))
  const first = conflicts[0]
  const resolve = (choice: 'current' | 'incoming' | 'both') => setText(resolveConflict(text, 0, choice))

  return (
    <div className="ed">
      <div className="ed-bar">
        <span className="ed-file">{name}</span>
        {dirty && (
          <span className="ed-state">
            <span className="ed-dot" aria-hidden="true" />
            Unsaved
          </span>
        )}
        <span className="ed-actions">
          {kind === 'file' ? (
            <>
              <button type="button" className="btn btn-sm btn-p" onClick={save}>
                Save
              </button>
              <button type="button" className="btn btn-sm btn-s" onClick={requestClose}>
                Close
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-sm btn-p" onClick={() => onSave(text)}>
                Save and close
              </button>
              <button type="button" className="btn btn-sm btn-s" onClick={onClose}>
                Close without saving
              </button>
            </>
          )}
        </span>
      </div>
      {notice}
      {kind === 'message' && <p className="ed-note">Git is waiting for this message. Lines starting with # are ignored.</p>}
      {asking && (
        <div className="ed-ask" role="group" aria-label="Close without saving?">
          <span>Close without saving?</span>
          <button type="button" className="btn btn-sm btn-s" onClick={onClose}>
            Close
          </button>
          <button
            type="button"
            ref={keepRef}
            className="btn btn-sm btn-p"
            onClick={() => {
              setAsking(false)
              areaRef.current?.focus()
            }}
          >
            Keep editing
          </button>
        </div>
      )}
      {first && (
        <div className="ed-conflict" role="group" aria-label="Merge conflict">
          <span className="ed-ctitle">
            Conflict 1 of {conflicts.length}
          </span>
          <button type="button" className="btn btn-sm btn-s" onClick={() => resolve('current')}>
            Keep current <span className="ed-lbl">({first.oursLabel || 'HEAD'})</span>
          </button>
          <button type="button" className="btn btn-sm btn-s" onClick={() => resolve('incoming')}>
            Keep incoming <span className="ed-lbl">({first.theirsLabel || 'incoming'})</span>
          </button>
          <button type="button" className="btn btn-sm btn-s" onClick={() => resolve('both')}>
            Keep both
          </button>
        </div>
      )}
      <div className="ed-scroll">
        <div className="ed-gutter" aria-hidden="true">
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
        <div className="ed-code">
          <div className="ed-back" aria-hidden="true">
            {lines.map((_, i) => (
              <div key={i} className={marks.has(i) ? 'ed-mark' : undefined} />
            ))}
          </div>
          <textarea
            ref={areaRef}
            className="ed-area"
            aria-label={`Edit ${name}`}
            value={text}
            rows={lines.length}
            wrap="off"
            spellCheck={false}
            autoCapitalize="off"
            autoComplete="off"
            autoCorrect="off"
            style={{ height: `calc(${lines.length} * 1.6em + 24px)` }}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
                e.preventDefault()
                if (kind === 'file') save()
                else onSave(text)
              }
            }}
          />
        </div>
      </div>
    </div>
  )
}
