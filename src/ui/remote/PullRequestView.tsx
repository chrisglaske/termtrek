import { useState } from 'react'
import type { PrComment, PullRequest, Remote, World } from '../../engine/types'
import { behindBase, mergeState, prCommits, prFiles } from '../../engine/remote/pr'
import { DiffView } from './DiffView'
import { BranchChip } from './RemoteOverview'

type Tab = 'conversation' | 'commits' | 'files'

const MARKS: Record<'approve' | 'changes', { cls: string; icon: string; text: string }> = {
  approve: { cls: 'rp-mark-ok', icon: '✓', text: 'approved these changes' },
  changes: { cls: 'rp-mark-warn', icon: '!', text: 'requested changes' },
}

function Comment({ c, me }: { c: PrComment; me: string | undefined }): React.JSX.Element {
  const you = !!me && c.author === me
  const mark = c.kind === 'comment' ? null : MARKS[c.kind]
  return (
    <li className="rp-c">
      <span className={you ? 'rp-av rp-av-you' : 'rp-av rp-av-alex'} aria-hidden="true">
        {c.author[0]?.toUpperCase() ?? '?'}
      </span>
      <div>
        <div className="rp-who">
          <b>{c.author}</b>
          {mark ? (
            <span className={`rp-mark ${mark.cls}`}>
              <i aria-hidden="true">{mark.icon}</i>
              {mark.text}
            </span>
          ) : (
            ' commented'
          )}
        </div>
        {c.body && <div className="rp-body">{c.body}</div>}
      </div>
    </li>
  )
}

function MergeBox({
  pr,
  remote,
  onMerge,
  onDeleteBranch,
}: {
  pr: PullRequest
  remote: Remote
  onMerge(): void
  onDeleteBranch(): void
}): React.JSX.Element {
  const headExists = Object.prototype.hasOwnProperty.call(remote.branches, pr.head)
  const state = mergeState(remote, pr)
  if (state === 'merged') {
    return (
      <div className="rp-mbox">
        <div className="rp-top">
          <span className="rp-ic rp-ic-ok" aria-hidden="true">
            {'✓'}
          </span>
          <span>
            Merged into <b>{pr.base}</b> as <span className="rp-id">{pr.mergeCommit?.slice(0, 7)}</span>.
            {headExists && ' The branch is no longer needed.'}
          </span>
        </div>
        {headExists && (
          <div className="rp-go">
            <button type="button" className="rp-btn" onClick={onDeleteBranch}>
              Delete branch
            </button>
          </div>
        )}
      </div>
    )
  }
  if (!headExists) {
    return (
      <div className="rp-mbox">
        <div className="rp-top">
          <span className="rp-ic rp-ic-warn" aria-hidden="true">
            !
          </span>
          <span>
            The <b>{pr.head}</b> branch was deleted, so this pull request can&apos;t be merged. Run <code>git push</code> to bring the branch back.
          </span>
        </div>
      </div>
    )
  }
  if (state === 'conflicts') {
    return (
      <div className="rp-mbox">
        <div className="rp-top">
          <span className="rp-ic rp-ic-warn" aria-hidden="true">
            !
          </span>
          <span>
            <b>This branch has conflicts with {pr.base}.</b> Update it on your computer, then push.
          </span>
        </div>
      </div>
    )
  }
  const behind = behindBase(remote, pr)
  return (
    <div className="rp-mbox">
      <div className="rp-top">
        <span className="rp-ic rp-ic-ok" aria-hidden="true">
          {'✓'}
        </span>
        <span>
          <b>No conflicts with {pr.base}.</b> This branch can be merged.
        </span>
      </div>
      {behind > 0 && (
        <div className="rp-top">
          <span className="rp-ic rp-ic-tip" aria-hidden="true">
            i
          </span>
          <span>
            <b>{pr.base}</b> has {behind} new commit{behind === 1 ? '' : 's'} since this branch started.
          </span>
        </div>
      )}
      <div className="rp-go">
        <button type="button" className="rp-btn rp-pri" onClick={onMerge}>
          Create a merge commit
        </button>
      </div>
      <ul className="rp-ways">
        <li>
          <b>Create a merge commit</b> keeps every commit and adds one that joins the branch into {pr.base}.
        </li>
        <li>
          <b>Squash and merge</b> combines all the branch&apos;s commits into one new commit on {pr.base}.
        </li>
        <li>
          <b>Rebase and merge</b> replays each commit on top of {pr.base} without a merge commit.
        </li>
        <li className="rp-foot">Teams usually pick one style in the repository settings.</li>
      </ul>
    </div>
  )
}

export function PullRequestView({
  world,
  remote,
  pr,
  onMerge,
  onDeleteBranch,
}: {
  world: World
  remote: Remote
  pr: PullRequest
  onMerge(): void
  onDeleteBranch(name: string): void
}): React.JSX.Element {
  const [tab, setTab] = useState<Tab>('conversation')
  const me = world.config['user.name']
  const commits = prCommits(remote, pr)
  const files = prFiles(remote, pr)
  const def = remote.defaultBranch
  const tabs: { id: Tab; label: string; n?: number }[] = [
    { id: 'conversation', label: 'Conversation' },
    { id: 'commits', label: 'Commits', n: commits.length },
    { id: 'files', label: 'Files changed', n: files.length },
  ]
  return (
    <div className="rp-pr-view">
      <div className="rp-prh">
        <h3>
          {pr.title} <span className="rp-id-n">#{pr.number}</span>
        </h3>
        <div className="rp-meta">
          <span className={pr.state === 'open' ? 'rp-state rp-state-open' : 'rp-state rp-state-merged'}>{pr.state === 'open' ? 'Open' : 'Merged'}</span>
          <BranchChip name={pr.head} main={pr.head === def} />
          <span aria-hidden="true">{'→'}</span>
          <span className="sr-only">into</span>
          <BranchChip name={pr.base} main={pr.base === def} />
        </div>
      </div>
      <div className="rp-subtabs" role="tablist" aria-label="Pull request sections">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`rp-tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`rp-panel-${t.id}`}
            className={tab === t.id ? 'rp-tab on' : 'rp-tab'}
            onClick={() => setTab(t.id)}
          >
            {t.label} {t.n !== undefined && <span className="rp-tn">{t.n}</span>}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`rp-panel-${tab}`} aria-labelledby={`rp-tab-${tab}`} className="rp-tabpanel">
        {tab === 'conversation' && (
          <>
            <ul className="rp-thread">
              <li className="rp-c">
                <span className={me && pr.author === me ? 'rp-av rp-av-you' : 'rp-av rp-av-alex'} aria-hidden="true">
                  {pr.author[0]?.toUpperCase() ?? '?'}
                </span>
                <div>
                  <div className="rp-who">
                    <b>{pr.author}</b> opened this
                  </div>
                  <div className="rp-body">{pr.body.trim() || <span className="rp-mute">No description.</span>}</div>
                </div>
              </li>
              {pr.comments.map((c, i) => (
                <Comment key={i} c={c} me={me} />
              ))}
            </ul>
            <MergeBox pr={pr} remote={remote} onMerge={onMerge} onDeleteBranch={() => onDeleteBranch(pr.head)} />
          </>
        )}
        {tab === 'commits' && (
          <ul className="rp-rows rp-pad">
            {commits.map((c) => (
              <li key={c.id} className="rp-row rp-row-2">
                <span className="rp-id">{c.id.slice(0, 7)}</span>
                <span className="rp-sub">{c.message.split('\n')[0]}</span>
                <span className="rp-side">{me && c.author.name === me ? 'you' : c.author.name}</span>
              </li>
            ))}
            {commits.length === 0 && <li className="rp-note">No commits.</li>}
          </ul>
        )}
        {tab === 'files' && (
          <div className="rp-pad">
            <DiffView files={files} />
          </div>
        )}
      </div>
    </div>
  )
}
