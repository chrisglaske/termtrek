import { useEffect, useState } from 'react'
import type { World } from '../../engine/types'
import { FeedbackCard } from '../terminal/FeedbackCard'
import { RemoteOverview } from './RemoteOverview'
import { NewPullRequest } from './NewPullRequest'
import { PullRequestView } from './PullRequestView'
import './RemotePanel.css'

type View = { view: 'overview' } | { view: 'pr'; number: number } | { view: 'new'; waiting?: { head: string; known: number[] } }

export interface RemotePanelProps {
  world: World
  error: string | null
  onOpenPr(input: { head: string; base: string; title: string; body: string }): void
  onMergePr(n: number): void
  onDeleteBranch(name: string): void
}

export function RemotePanel({ world, error, onOpenPr, onMergePr, onDeleteBranch }: RemotePanelProps): React.JSX.Element | null {
  const [state, setState] = useState<View>({ view: 'overview' })
  const remote = world.remote
  const waiting = state.view === 'new' ? state.waiting : undefined
  const created = waiting && remote?.prs.find((p) => p.head === waiting.head && !waiting.known.includes(p.number))
  const createdNumber = created ? created.number : null
  // Once the server has the new pull request, show it.
  useEffect(() => {
    if (createdNumber !== null) setState({ view: 'pr', number: createdNumber })
  }, [createdNumber])
  if (!remote) return null
  const toOverview = () => setState({ view: 'overview' })
  return (
    <div className="rp-wrap">
      {error && <FeedbackCard explain={{ kind: 'warn', text: error }} />}
      {state.view === 'overview' ? (
        <RemoteOverview
          world={world}
          remote={remote}
          onOpenPr={(number) => setState({ view: 'pr', number })}
          onNewPr={() => setState({ view: 'new' })}
          onDeleteBranch={onDeleteBranch}
        />
      ) : (
        <>
          <div className="rp-back">
            <button type="button" className="rp-btn rp-btn-ghost" onClick={toOverview}>
              Back
            </button>
            <b>{state.view === 'pr' ? 'Pull requests' : 'New pull request'}</b>
          </div>
          {state.view === 'new' ? (
            <NewPullRequest
              remote={remote}
              onCreate={(input) => {
                setState({ view: 'new', waiting: { head: input.head, known: remote.prs.map((p) => p.number) } })
                onOpenPr(input)
              }}
            />
          ) : (
            (() => {
              const pr = remote.prs.find((p) => p.number === state.number)
              return pr ? (
                <PullRequestView key={pr.number} world={world} remote={remote} pr={pr} onMerge={() => onMergePr(pr.number)} onDeleteBranch={onDeleteBranch} />
              ) : (
                <p className="rp-note rp-pad">There is no pull request #{state.number}.</p>
              )
            })()
          )}
        </>
      )}
    </div>
  )
}
