import { useEffect, useRef } from 'react'
import { PLAYGROUND } from '../../lessons/playground'
import { useLessonRunner } from '../../lessons/useLessonRunner'
import { CommandPill } from '../CommandPill'
import { Nav } from '../layout/Nav'
import { useDocumentTitle } from '../layout/useDocumentTitle'
import { RepoPanel } from '../lesson/LessonScreen'
import { Workspace } from '../lesson/Workspace'
import type { WorkspaceHandle } from '../lesson/Workspace'
import { isWide } from '../lesson/isWide'
import '../lesson/LessonScreen.css'
import '../buttons.css'
import './Playground.css'

const SUGGESTED = ['git status', 'git log --oneline', 'git switch -c idea', 'git fetch', 'git push']
const noop = () => {}

function PlaygroundRun(): React.JSX.Element {
  const { state, run, reset, saveFile, closeFile, editorDone, openPr, mergePr, deleteRemoteBranch, remoteError } = useLessonRunner(PLAYGROUND, noop)
  const termRef = useRef<HTMLDivElement>(null)
  const wsRef = useRef<WorkspaceHandle>(null)

  useEffect(() => {
    if (isWide()) termRef.current?.querySelector('input')?.focus({ preventScroll: true })
  }, [])

  return (
    <div className="lesson-run pg-run">
      <div className="lesson-work">
        <div className="lesson-learn">
          <section className="pg-card" aria-label="Free practice">
            <h1>Free practice</h1>
            <p>
              This is the sample project from the course, already cloned from a pretend team server. Break things, try commands and watch the repo map change. Nothing is saved, and Reset puts everything back.
            </p>
            <p className="pg-try">Try one of these</p>
            <div className="pg-pills">
              {SUGGESTED.map((c) => (
                <CommandPill key={c} cmd={c} onRun={(line) => wsRef.current?.run(line)} />
              ))}
            </div>
            <button
              type="button"
              className="btn btn-s"
              onClick={() => {
                reset()
                wsRef.current?.focusTerminal({ preventScroll: isWide() })
              }}
            >
              Reset
            </button>
          </section>
        </div>
        <div className="lesson-term" ref={termRef}>
          <Workspace ref={wsRef} state={state} onRun={run} saveFile={saveFile} closeFile={closeFile} editorDone={editorDone} />
        </div>
        <RepoPanel world={state.world} remoteError={remoteError} onOpenPr={openPr} onMergePr={mergePr} onDeleteBranch={deleteRemoteBranch} />
      </div>
    </div>
  )
}

export function Playground(): React.JSX.Element {
  useDocumentTitle('Playground · TermTrek', 'Practice Git freely on a sample project with a real-feeling terminal, a live repo map and a pretend team server. Nothing is saved.')
  return (
    <>
      <Nav />
      <main id="main" className="lesson-main" tabIndex={-1}>
        <PlaygroundRun />
      </main>
    </>
  )
}
