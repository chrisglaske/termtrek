import { useEffect, useId, useImperativeHandle, useRef, useState } from 'react'
import type { RunnerState } from '../../lessons/runner'
import { activeRepo } from '../../engine/git/repoState'
import { branchOf } from '../../engine/git/refs'
import { EDITOR_WAITING } from '../../engine/git/editor'
import { displayPath } from '../../engine/paths'
import { complete as completeLine } from '../../engine/suggest'
import { Terminal } from '../terminal/Terminal'
import { FeedbackCard } from '../terminal/FeedbackCard'
import { Editor } from '../editor/Editor'
import './Workspace.css'

const TERMINAL = 'terminal'
const MESSAGE = 'message'

/** What the lesson screen can ask of the workspace. */
export interface WorkspaceHandle {
  /** Runs a command from outside the terminal (the Learn card). While Git waits for a message, shows that editor instead. */
  run(line: string): void
  /** Shows the Terminal tab and puts focus in its input. */
  focusTerminal(opts?: { preventScroll?: boolean }): void
}

export interface WorkspaceProps {
  ref?: React.Ref<WorkspaceHandle>
  state: RunnerState
  onRun(line: string): void
  saveFile(path: string, text: string): void
  closeFile(path: string): void
  editorDone(text?: string | null): void
}

interface Tab {
  key: string
  label: string
}

const baseName = (path: string) => path.slice(path.lastIndexOf('/') + 1)

/** The terminal plus one editor tab per open file, and COMMIT_EDITMSG while Git waits for a message. */
export function Workspace({ ref, state, onRun, saveFile, closeFile, editorDone }: WorkspaceProps): React.JSX.Element {
  const { world, open, lastOpened } = state
  const pending = world.pending
  const [picked, setPicked] = useState(TERMINAL)
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const [asks, setAsks] = useState<Record<string, number>>({})
  const rootRef = useRef<HTMLDivElement>(null)
  const id = useId()

  const tabs: Tab[] = [
    { key: TERMINAL, label: 'Terminal' },
    ...open.map((p) => ({ key: p, label: baseName(p) })),
    ...(pending ? [{ key: MESSAGE, label: 'COMMIT_EDITMSG' }] : []),
  ]
  // A closed file or a finished commit message falls back to the terminal.
  const active = tabs.some((t) => t.key === picked) ? picked : TERMINAL

  const panelOf = (key: string) =>
    Array.from(rootRef.current?.querySelectorAll<HTMLElement>('[data-panel]') ?? []).find((el) => el.dataset.panel === key)
  const focusIn = (key: string, preventScroll = true) =>
    panelOf(key)
      ?.querySelector<HTMLElement>(key === TERMINAL ? 'input' : 'textarea')
      ?.focus({ preventScroll })

  // A command's output always shows: a new typed (non-note) entry brings the terminal forward.
  // This runs before the open/commit effects below, so a `code` or `git commit` still ends on its own tab.
  const { entries } = state
  const seen = useRef(entries.length)
  useEffect(() => {
    const grew = entries.length > seen.current
    seen.current = entries.length
    if (grew && !entries[entries.length - 1]?.note) setPicked(TERMINAL)
  }, [entries])

  // Opening a file or starting a commit moves focus into the new tab. `follow` holds the focus to apply once it shows.
  const follow = useRef<{ preventScroll: boolean } | null>(null)
  const shown = useRef(active)
  useEffect(() => {
    if (!lastOpened) return
    setPicked(lastOpened.path)
    if (lastOpened.path === shown.current) focusIn(lastOpened.path)
    else follow.current = { preventScroll: true }
  }, [lastOpened])
  const waiting = !!pending
  useEffect(() => {
    if (!waiting) return
    setPicked(MESSAGE)
    follow.current = { preventScroll: true }
  }, [waiting])

  // Focus follows a tab that opened, or the terminal when the active tab went away; picking a tab by hand keeps focus on the tab.
  const keys = tabs.map((t) => t.key).join('\n')
  useEffect(() => {
    if (shown.current === active) return
    const gone = !keys.split('\n').includes(shown.current)
    shown.current = active
    // The log can't scroll while hidden, so catch up when the terminal shows again.
    if (active === TERMINAL) {
      const log = panelOf(TERMINAL)?.querySelector<HTMLElement>('.term-log')
      if (log) log.scrollTop = log.scrollHeight
    }
    const f = follow.current
    follow.current = null
    if (f || gone) focusIn(active, f?.preventScroll ?? true)
  }, [active, keys])

  useImperativeHandle(
    ref,
    () => ({
      run(line) {
        if (pending) {
          if (shown.current === MESSAGE) focusIn(MESSAGE)
          else {
            setPicked(MESSAGE)
            follow.current = { preventScroll: true }
          }
        } else onRun(line)
      },
      focusTerminal(opts) {
        const preventScroll = opts?.preventScroll ?? true
        if (shown.current === TERMINAL) focusIn(TERMINAL, preventScroll)
        else {
          setPicked(TERMINAL)
          follow.current = { preventScroll }
        }
      },
    }),
    [pending, onRun],
  )

  // On narrow screens the tab strip scrolls; keep the active tab in view without moving the page.
  const stripRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const strip = stripRef.current
    const tab = strip?.querySelector<HTMLElement>('[aria-selected="true"]')
    if (!strip || !tab) return
    if (tab.offsetLeft < strip.scrollLeft) strip.scrollLeft = tab.offsetLeft
    else if (tab.offsetLeft + tab.offsetWidth > strip.scrollLeft + strip.clientWidth)
      strip.scrollLeft = tab.offsetLeft + tab.offsetWidth - strip.clientWidth
  }, [active, keys])

  const tabId = (i: number) => `${id}-tab-${i}`
  const panelId = (i: number) => `${id}-panel-${i}`

  const without = <T,>(m: Record<string, T>, path: string) => Object.fromEntries(Object.entries(m).filter(([p]) => p !== path))
  const close = (path: string) => {
    closeFile(path)
    setDirty((m) => without(m, path))
    setAsks((m) => without(m, path))
  }
  const askClose = (path: string) => {
    setPicked(path)
    setAsks((a) => ({ ...a, [path]: (a[path] ?? 0) + 1 }))
  }

  const onTabKey = (e: React.KeyboardEvent, i: number) => {
    const last = tabs.length - 1
    const to =
      e.key === 'ArrowRight' ? (i === last ? 0 : i + 1)
      : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1)
      : e.key === 'Home' ? 0
      : e.key === 'End' ? last
      : null
    if (to !== null) {
      e.preventDefault()
      const tab = tabs[to]
      if (tab) setPicked(tab.key)
      document.getElementById(tabId(to))?.focus()
    } else if (e.key === 'Delete' && tabs[i] && tabs[i].key !== TERMINAL && tabs[i].key !== MESSAGE) {
      e.preventDefault()
      askClose(tabs[i].key)
    }
  }

  const cwd = displayPath(world, world.cwd)
  const repo = activeRepo(world)

  return (
    <div className="ws" ref={rootRef}>
      <div className="ws-strip">
        <div className="ws-tabs" role="tablist" aria-label="Workspace" ref={stripRef}>
          {tabs.map((t, i) => {
            const isFile = t.key !== TERMINAL && t.key !== MESSAGE
            const selected = t.key === active
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                id={tabId(i)}
                aria-selected={selected}
                aria-controls={panelId(i)}
                aria-keyshortcuts={isFile ? 'Delete' : undefined}
                tabIndex={selected ? 0 : -1}
                className={`ws-tab${t.key === TERMINAL ? '' : ' ws-tab-file'}`}
                title={isFile ? t.key : undefined}
                onClick={() => setPicked(t.key)}
                onKeyDown={(e) => onTabKey(e, i)}
              >
                {t.label}
                {dirty[t.key] && (
                  <>
                    <span className="ws-dot" aria-hidden="true" />
                    <span className="sr-only"> (unsaved)</span>
                  </>
                )}
                {isFile && (
                  // The close control isn't a nested button (tabs can't hold one); keyboard users press Delete or use Close in the editor.
                  <span
                    className="ws-x"
                    aria-hidden="true"
                    onClick={(e) => {
                      e.stopPropagation()
                      askClose(t.key)
                    }}
                  >
                    ×
                  </span>
                )}
              </button>
            )
          })}
        </div>
        <span className="ws-title">{cwd} — bash</span>
      </div>
      {tabs.map((t, i) => (
        <div
          key={t.key}
          role="tabpanel"
          id={panelId(i)}
          aria-labelledby={tabId(i)}
          data-panel={t.key}
          className="ws-panel"
          hidden={t.key !== active}
        >
          {t.key === TERMINAL ? (
            <Terminal
              entries={state.entries}
              cwdLabel={cwd}
              branch={repo ? branchOf(repo) : null}
              onRun={onRun}
              onComplete={(line) => completeLine(world, line)}
              waiting={pending ? EDITOR_WAITING : undefined}
            />
          ) : t.key === MESSAGE ? (
            <Editor
              name="COMMIT_EDITMSG"
              initial={pending?.text ?? ''}
              kind="message"
              onSave={(text) => editorDone(text)}
              onClose={() => editorDone(null)}
            />
          ) : (
            <Editor
              name={t.label}
              initial={world.files[t.key] ?? ''}
              kind="file"
              onSave={(text) => saveFile(t.key, text)}
              onClose={() => close(t.key)}
              onDirty={(d) => setDirty((m) => (!!m[t.key] === d ? m : { ...m, [t.key]: d }))}
              askClose={asks[t.key] ?? 0}
              notice={state.notice?.path === t.key ? <FeedbackCard explain={state.notice.explain} onCommand={onRun} /> : undefined}
            />
          )}
        </div>
      ))}
    </div>
  )
}
