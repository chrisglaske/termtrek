import type { Commit, PullRequest, Remote, World } from '../../engine/types'
import { CommandPill } from '../CommandPill'
import { RichText } from '../RichText'

const MAX_COMMITS = 5
const MAX_ACTIVITY = 5

function reachable(commits: Record<string, Commit>, tip: string): Set<string> {
  const seen = new Set<string>()
  const stack = [tip]
  while (stack.length) {
    const id = stack.pop()!
    const c = commits[id]
    if (seen.has(id) || !c) continue
    seen.add(id)
    stack.push(...c.parents)
  }
  return seen
}

const short = (id: string) => id.slice(0, 7)

export function BranchChip({ name, main }: { name: string; main?: boolean }): React.JSX.Element {
  return <span className={main ? 'rp-bc rp-bc-main' : 'rp-bc'}>{name}</span>
}

function PrRow({ pr, defaultBranch, onOpen }: { pr: PullRequest; defaultBranch: string; onOpen: (n: number) => void }): React.JSX.Element {
  return (
    <li>
      <button type="button" className="rp-pr" onClick={() => onOpen(pr.number)}>
        <span className="rp-pr-num">#{pr.number}</span>
        <span className="rp-pr-title">{pr.title}</span>
        <span className="rp-pr-meta">
          <span className={pr.state === 'open' ? 'rp-state rp-state-open' : 'rp-state rp-state-merged'}>{pr.state === 'open' ? 'Open' : 'Merged'}</span>
          <BranchChip name={pr.head} main={pr.head === defaultBranch} />
          <span aria-hidden="true">→</span>
          <span className="sr-only">into</span>
          <BranchChip name={pr.base} main={pr.base === defaultBranch} />
        </span>
      </button>
    </li>
  )
}

export function RemoteOverview({
  world,
  remote,
  onOpenPr,
  onNewPr,
  onDeleteBranch,
}: {
  world: World
  remote: Remote
  onOpenPr(n: number): void
  onNewPr(): void
  onDeleteBranch(name: string): void
}): React.JSX.Element {
  const def = remote.defaultBranch
  const names = Object.keys(remote.branches).sort((a, b) => (a === def ? -1 : b === def ? 1 : a < b ? -1 : 1))
  const empty = names.length === 0
  const me = world.config['user.name']
  const byWho = (c: Commit) => (me && c.author.name === me ? 'you' : c.author.name)
  const defTip = remote.branches[def]
  const onDefault = defTip ? reachable(remote.commits, defTip) : new Set<string>()

  const recent = defTip
    ? [...onDefault]
        .map((id) => remote.commits[id]!)
        .sort((a, b) => b.time - a.time || (a.id < b.id ? -1 : 1))
        .slice(0, MAX_COMMITS)
    : []
  const activity = [...remote.activity].sort((a, b) => b.seq - a.seq).slice(0, MAX_ACTIVITY)
  const open = remote.prs.filter((p) => p.state === 'open').length

  return (
    <div className="rp">
      <div className="rp-head">
        <div className="rp-slug">
          {remote.slug} <small>{empty ? 'empty' : 'origin'}</small>
        </div>
        {!empty && (
          <div className="rp-clone">
            Copy it with <CommandPill cmd={`git clone ${remote.url}`} />
          </div>
        )}
      </div>

      {empty ? (
        <div className="rp-empty">
          <h3>This repository is empty.</h3>
          <p>Send a project you already have on your computer:</p>
          <ol className="rp-steps">
            <li>
              <span>
                Connect your repo to this one, calling it <strong>origin</strong>
                <br />
                <CommandPill cmd={`git remote add origin ${remote.url}`} />
              </span>
            </li>
            <li>
              <span>
                Send <strong>{def}</strong> and remember it as the upstream
                <br />
                <CommandPill cmd={`git push -u origin ${def}`} />
              </span>
            </li>
          </ol>
        </div>
      ) : (
        <>
          <section className="rp-sec" aria-labelledby="rp-h-branches">
            <h3 id="rp-h-branches">
              Branches <span className="rp-n">{names.length}</span>
            </h3>
            <ul className="rp-rows">
              {names.map((name) => {
                const tip = remote.commits[remote.branches[name]!]
                const ahead = name === def ? 0 : [...reachable(remote.commits, remote.branches[name]!)].filter((id) => !onDefault.has(id)).length
                return (
                  <li key={name} className="rp-row rp-branch">
                    <span className="rp-bc-wrap">
                      <BranchChip name={name} main={name === def} />
                      {name === def && <span className="rp-tag">default</span>}
                    </span>
                    <span className="rp-side">
                      {name !== def && <span>{ahead} ahead of {def}</span>}
                      {name !== def && (
                        <button type="button" className="rp-btn rp-btn-ghost" aria-label={`Delete branch ${name}`} onClick={() => onDeleteBranch(name)}>
                          Delete
                        </button>
                      )}
                    </span>
                    <span className="rp-sub">
                      {tip && <span className="rp-id">{short(tip.id)}</span>} {tip?.message}
                    </span>
                  </li>
                )
              })}
            </ul>
          </section>

          <section className="rp-sec" aria-labelledby="rp-h-commits">
            <h3 id="rp-h-commits">
              Recent commits on <BranchChip name={def} main />
            </h3>
            <ul className="rp-rows">
              {recent.map((c) => (
                <li key={c.id} className="rp-row rp-row-2">
                  <span className="rp-id">{short(c.id)}</span>
                  <span className="rp-sub">{c.message}</span>
                  <span className="rp-side">{byWho(c)}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      {!(empty && remote.prs.length === 0) && (
      <section className="rp-sec" aria-labelledby="rp-h-prs">
        <h3 id="rp-h-prs">
          Pull requests <span className="rp-n">{open} open</span>
          <button type="button" className="rp-btn rp-act" onClick={onNewPr}>
            New pull request
          </button>
        </h3>
        {remote.prs.length > 0 && (
          <ul className="rp-prs">
            {remote.prs.map((pr) => (
              <PrRow key={pr.number} pr={pr} defaultBranch={def} onOpen={onOpenPr} />
            ))}
          </ul>
        )}
        <p className="rp-note">GitLab calls these merge requests.</p>
      </section>
      )}

      {activity.length > 0 && (
        <section className="rp-sec" aria-labelledby="rp-h-activity">
          <h3 id="rp-h-activity">Activity</h3>
          <ul className="rp-acts">
            {activity.map((a) => (
              <li key={a.seq}>
                <span className={a.who === 'you' ? 'rp-av rp-av-you' : 'rp-av rp-av-alex'} aria-hidden="true">
                  {a.who === 'you' ? (me?.[0]?.toUpperCase() ?? 'Y') : 'A'}
                </span>
                <div>
                  <RichText text={a.text} />
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
