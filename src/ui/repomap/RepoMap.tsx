import type { Repo, RepoOp, World } from '../../engine/types'
import { getStatus, headCommitId } from '../../engine/git/repoState'
import { RichText } from '../RichText'
import { reachableFromRefs } from '../../engine/git/refs'
import { trackingSummary } from '../../engine/git/tracking'
import { DEFAULT_GAP, LABEL_H, branchOrder, isDefaultRemote, labelOffset, labelText, labelWidth, layoutGraph } from './layout'
import './RepoMap.css'

const MAX_SHOWN = 3

function listOf(names: string[]): string {
  return names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`
}

function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`
}

function ariaSummary(repo: Repo): string {
  const n = reachableFromRefs(repo).size
  const branches = branchOrder(repo).filter((b) => repo.branches[b])
  const headId = headCommitId(repo)
  const id7 = headId ? headId.slice(0, 7) : ''
  const parts = [`${plural(n, 'commit', 'commits')}${branches.length ? ` on ${listOf(branches)}` : ''}.`]
  if (id7) parts.push(repo.head.kind === 'detached' ? `HEAD is detached at ${id7}.` : `HEAD is on ${repo.head.name} at ${id7}.`)
  const op = repo.op
  if (op) {
    const doing = opLabel(op)
    parts.push(op.conflicts.length ? `${doing}: ${plural(op.conflicts.length, 'conflict', 'conflicts')} to fix.` : `${doing}: conflicts fixed.`)
  }
  const remotes = Object.keys(repo.remoteRefs).filter((r) => r !== 'origin/HEAD').sort()
  if (remotes.length) parts.push(`Remote branches: ${listOf(remotes.map((r) => `${r} at ${repo.remoteRefs[r]!.slice(0, 7)}`))}.`)
  if (repo.stash.length) parts.push(`Stash: ${plural(repo.stash.length, 'entry', 'entries')}.`)
  return parts.join(' ')
}

/** Every commit HEAD reaches, newest first. */
function savedCommits(repo: Repo): { id: string; message: string }[] {
  const seen = new Set<string>()
  const stack = [headCommitId(repo)]
  while (stack.length) {
    const id = stack.pop()
    if (!id || seen.has(id) || !repo.commits[id]) continue
    seen.add(id)
    stack.push(...repo.commits[id].parents)
  }
  return [...seen]
    .map((id) => repo.commits[id]!)
    .sort((a, b) => b.time - a.time || (a.id < b.id ? -1 : 1))
    .map((c) => ({ id: c.id, message: c.message }))
}

/** The ahead/behind chip text for a branch with an upstream, from the last fetch. */
function syncText(t: { ahead: number; behind: number; gone: boolean }): string {
  if (t.gone) return 'Upstream gone'
  if (t.ahead && t.behind) return `↑${t.ahead} to push · ↓${t.behind} to pull`
  if (t.ahead) return `↑${t.ahead} to push`
  if (t.behind) return `↓${t.behind} to pull`
  return 'In sync'
}

function Area({ kind, title, count, empty, children }: { kind: string; title: string; count: number; empty: string; children: React.ReactNode[] }): React.JSX.Element {
  const hid = `repomap-area-${kind}`
  const more = count - MAX_SHOWN
  return (
    <section className={`zone zone-${kind}`} aria-labelledby={hid}>
      <h3 id={hid}>
        {title}
        <em aria-label={`${count} ${count === 1 ? 'item' : 'items'}`}>{count}</em>
      </h3>
      {count === 0 ? (
        <div className="zone-empty"><RichText text={empty} /></div>
      ) : (
        <ul>
          {children.slice(0, MAX_SHOWN)}
          {more > 0 && <li className="zone-more">+{more} more</li>}
        </ul>
      )}
    </section>
  )
}

function Connector({ label }: { label: string }): React.JSX.Element {
  return (
    <div className="arrow" aria-hidden="true">
      <span className="arrow-glyph">→</span>
      <code className="cmd">{label}</code>
    </div>
  )
}


const opLabel = (op: RepoOp): string =>
  op.kind === 'merge' ? `Merging ${op.theirsLabel}` : op.kind === 'rebase' ? `Rebasing ${op.rebase?.branch ?? ''}`.trim() : 'Reverting'
export function RepoMap({ world }: { world: World }): React.JSX.Element {
  const repo = world.repo
  if (!repo) {
    return (
      <section className="repomap">
        <div className="repomap-empty">
          <RichText text="Not a Git repository yet. Run `git init` to start one." />
        </div>
      </section>
    )
  }

  const status = getStatus(world)
  const conflicts = repo.op ? [...repo.op.conflicts].sort() : []
  const changed = status ? [...status.unstaged.map((c) => c.path), ...status.untracked].filter((p) => !conflicts.includes(p)) : []
  const staged = status ? status.staged.map((c) => c.path) : []
  const saved = savedCommits(repo)
  const headId = headCommitId(repo)
  const branchName = repo.head.kind === 'branch' ? repo.head.name : null
  const sync = branchName ? trackingSummary(repo, branchName) : null
  const g = layoutGraph(repo)
  const nodeById = new Map(g.nodes.map((n) => [n.id, n]))
  const head = g.nodes.find((n) => n.isHead)
  const stubX = head ? head.x + DEFAULT_GAP : 0
  const widest = Math.max(0, ...g.labels.map((l) => labelWidth(labelText(l))))
  const padX = Math.max(20, Math.ceil(widest / 2) + 4)
  const totalW = g.width + padX

  return (
    <section className="repomap">
      <div className="repomap-head">
        {repo.op && <span className="repomap-chip repomap-op">{opLabel(repo.op)}</span>}
        {repo.stash.length > 0 && <span className="repomap-chip repomap-stash">{`Stash: ${repo.stash.length}`}</span>}
        {sync && (
          <span className="repomap-chip repomap-sync" title={`Compared with ${sync.upstream} as of your last fetch`}>
            <span aria-hidden="true">{syncText(sync)}</span>
            <span className="sr-only">{`${syncText(sync)}, compared with ${sync.upstream}, as of your last fetch`}</span>
          </span>
        )}
        <span className="repomap-branch">
          <i className={`dot ${branchName === null || branchName === 'main' ? 'dot-main' : 'dot-branch'}`} aria-hidden="true" />
          {branchName ?? `HEAD detached at ${headId ? headId.slice(0, 7) : ''}`}
        </span>
      </div>
      {g.nodes.length === 0 ? (
        <p className="repomap-empty">No commits yet</p>
      ) : (
        <div className="repomap-graph">
          <svg role="img" aria-label={ariaSummary(repo)} width={totalW} height={g.height} viewBox={`0 0 ${totalW} ${g.height}`}>
            <g transform={`translate(${padX} 0)`} aria-hidden="true">
              {g.edges.map((e) => {
                const a = nodeById.get(e.from)
                const b = nodeById.get(e.to)
                if (!a || !b) return null
                const mid = (a.x + b.x) / 2
                const lost = a.lost || b.lost
                const main = lost || (a.lane === 0 && b.lane === 0)
                return (
                  <path
                    key={`${e.from}-${e.to}`}
                    className={lost ? 'edge edge-lost' : 'edge'}
                    d={`M${a.x} ${a.y} C${mid} ${a.y} ${mid} ${b.y} ${b.x} ${b.y}`}
                    fill="none"
                    stroke={main ? 'var(--g-main)' : 'var(--g-branch)'}
                    strokeWidth="3"
                    strokeOpacity={lost ? 0.4 : main ? 0.45 : 1}
                    strokeDasharray={lost ? '4 4' : undefined}
                  />
                )
              })}
              {head && (
                <>
                  <line className="stub" x1={head.x} y1={head.y} x2={stubX} y2={head.y} stroke="var(--g-future)" strokeWidth="3" strokeDasharray="4 4" />
                  <circle cx={stubX} cy={head.y} r="8" fill="var(--g-hollow)" stroke="var(--g-future)" strokeWidth="2" strokeDasharray="3 3" />
                </>
              )}
              {g.nodes.map((n) =>
                n.id === '…' ? (
                  <text key={n.id} x={n.x} y={n.y + 5} textAnchor="middle" fill="var(--mute)" fontFamily="var(--mono)" fontSize="16">…</text>
                ) : n.lost ? (
                  <circle key={n.id} className="node-lost" cx={n.x} cy={n.y} r="7" fill="var(--g-hollow)" stroke="var(--g-main)" strokeWidth="2" strokeDasharray="3 3" opacity="0.4" />
                ) : (
                  <g key={n.id}>
                    {n.isHead && <circle cx={n.x} cy={n.y} r="13" fill="none" stroke="var(--g-head)" strokeWidth="3" />}
                    <circle cx={n.x} cy={n.y} r="8" fill={n.lane === 0 ? 'var(--g-main)' : 'var(--g-branch)'} />
                  </g>
                ),
              )}
              {g.labels.map((l) => {
                const n = nodeById.get(l.commitId)
                if (!n) return null
                const text = labelText(l)
                const w = labelWidth(text)
                const y = n.y + labelOffset(l.slot)
                const amber = l.remote ? !isDefaultRemote(repo, l.name) : l.slot > 0 && l.name !== 'HEAD'
                if (l.remote) {
                  const stroke = amber ? 'var(--g-branch)' : 'var(--g-main)'
                  return (
                    <g key={l.name} className="label-remote">
                      <rect x={n.x - w / 2} y={y} width={w} height={LABEL_H} rx={LABEL_H / 2} fill="var(--surface)" stroke={stroke} strokeWidth="2" />
                      <text x={n.x} y={y + 15} textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="600" fill="var(--ink2)">{text}</text>
                    </g>
                  )
                }
                return (
                  <g key={l.name}>
                    <rect x={n.x - w / 2} y={y} width={w} height={LABEL_H} rx={LABEL_H / 2} fill={amber ? 'var(--g-branch)' : 'var(--g-main-lbl)'} stroke={l.current ? 'var(--g-head)' : 'none'} strokeWidth="2" />
                    <text x={n.x} y={y + 15} textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="600" fill={amber ? 'var(--cmd-bg)' : 'var(--on-accent)'}>{text}</text>
                  </g>
                )
              })}
            </g>
          </svg>
          <ol className="sr-only">
            {g.nodes
              .filter((n) => n.id !== '…')
              .map((n) => (
                <li key={n.id}>{`${n.id.slice(0, 7)} ${n.message}${n.lost ? ' (lost: only the reflog reaches it)' : ''}`}</li>
              ))}
          </ol>
        </div>
      )}

      <div className="zones">
        <Area kind="folder" title="Folder" count={conflicts.length + changed.length} empty="Nothing changed">
          {[
            ...conflicts.map((p) => (
              <li key={p} className="file file-conflict" title={`${p} (conflict)`}>
                <b className="file-badge" aria-hidden="true">!</b>
                <span className="file-name">{p}</span>
                <span className="file-tag">conflict</span>
              </li>
            )),
            ...changed.map((p) => <li key={p} className="file file-changed" title={p}><i aria-hidden="true" />{p}</li>),
          ]}
        </Area>
        <Connector label="add" />
        <Area kind="staged" title="Staged" count={staged.length} empty="Nothing staged yet. Stage a change with `git add`.">
          {staged.map((p) => <li key={p} className="file file-staged" title={p}><i aria-hidden="true" />{p}</li>)}
        </Area>
        <Connector label="commit" />
        <Area kind="saved" title="Saved" count={saved.length} empty="No commits yet. Save one with `git commit`.">
          {saved.map((c) => <li key={c.id} className="saved" title={`${c.id.slice(0, 7)} ${c.message}`}><b>{c.id.slice(0, 7)}</b><span>{c.message}</span></li>)}
        </Area>
      </div>
    </section>
  )
}
