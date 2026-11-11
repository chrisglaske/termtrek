import { useState } from 'react'
import type { PullRequest, Remote } from '../../engine/types'
import { mergeState, prCommits, prFiles } from '../../engine/remote/pr'
import { DiffView } from './DiffView'

export interface NewPrInput {
  head: string
  base: string
  title: string
  body: string
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

export function NewPullRequest({
  remote,
  onCreate,
}: {
  remote: Remote
  onCreate(input: NewPrInput): void
}): React.JSX.Element {
  const def = remote.defaultBranch
  const names = Object.keys(remote.branches).sort((a, b) => (a === def ? -1 : b === def ? 1 : a < b ? -1 : 1))
  // Newest pushed branch that isn't the default one, by the time of its tip commit.
  const newest = names
    .filter((n) => n !== def)
    .sort((a, b) => (remote.commits[remote.branches[b]!]?.time ?? 0) - (remote.commits[remote.branches[a]!]?.time ?? 0))[0]
  const [base, setBase] = useState(def)
  const [pickedHead, setHead] = useState<string | null>(null)
  const head = pickedHead ?? newest ?? def
  const [typedTitle, setTitle] = useState<string | null>(null)
  const [body, setBody] = useState('')

  const draft: PullRequest = { number: 0, title: '', body: '', head, base, author: '', state: 'open', comments: [], openedAt: 0 }
  const commits = head === base ? [] : prCommits(remote, draft)
  const files = head === base ? [] : prFiles(remote, draft)
  const conflicts = commits.length > 0 && mergeState(remote, draft) === 'conflicts'
  const title = typedTitle ?? (commits.length === 1 ? commits[0]!.message.split('\n')[0]! : '')

  let summary: React.ReactNode
  if (head === base) summary = 'Pick two different branches.'
  else if (commits.length === 0)
    summary = (
      <>
        <b>{head}</b> has nothing that <b>{base}</b> doesn&apos;t already have.
      </>
    )
  else
    summary = (
      <>
        {plural(commits.length, 'commit')}, {plural(files.length, 'file')} changed.{' '}
        {conflicts ? (
          <>
            Conflicts with <b>{base}</b>.
          </>
        ) : (
          <>
            No conflicts with <b>{base}</b>.
          </>
        )}
      </>
    )

  return (
    <form
      className="rp-form"
      onSubmit={(e) => {
        e.preventDefault()
        onCreate({ head, base, title, body })
      }}
    >
      <div className="rp-pick">
        <label>
          <span className="rp-lbl">Compare</span>
          <select className="rp-select" value={head} onChange={(e) => setHead(e.target.value)}>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span aria-hidden="true">into</span>
        <label>
          <span className="rp-lbl">Base</span>
          <select className="rp-select" value={base} onChange={(e) => setBase(e.target.value)}>
            {names.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
      </div>
      <p className="rp-summary" aria-live="polite">
        {summary}
      </p>
      <label className="rp-f">
        Title
        <input className="rp-in" value={title} onChange={(e) => setTitle(e.target.value)} />
      </label>
      <label className="rp-f">
        Description
        <textarea className="rp-in rp-area" placeholder="What changed and why (optional)" value={body} onChange={(e) => setBody(e.target.value)} />
      </label>
      {files.length > 0 && <DiffView files={files} />}
      <button type="submit" className="rp-btn rp-pri">
        Create pull request
      </button>
    </form>
  )
}
