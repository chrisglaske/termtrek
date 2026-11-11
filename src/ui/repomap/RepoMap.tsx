import type { Repo, World } from '../../engine/types'
import { getStatus, headCommitId } from '../../engine/git/repoState'
import { RichText } from '../RichText'
import { DEFAULT_GAP, layoutGraph } from './layout'
import './RepoMap.css'

const LABEL_CHAR = 7.4
const LABEL_PAD = 18
const MAX_SHOWN = 3

function labelWidth(text: string): number {
  return text.length * LABEL_CHAR + LABEL_PAD
}

function labelText(name: string, current: boolean): string {
  return current ? `${name} · HEAD` : name
}

function ariaSummary(world: World): string {
  const repo = world.repo
  if (!repo) return ''
  const n = Object.keys(repo.commits).length
  const noun = n === 1 ? 'commit' : 'commits'
  const headId = headCommitId(repo)
  const id7 = headId ? headId.slice(0, 7) : ''
  if (!id7) return `${n} ${noun}.`
  if (repo.head.kind === 'detached') return `${n} ${noun}. HEAD is detached at ${id7}.`
  return `${n} ${noun} on ${repo.head.name}. HEAD is on ${repo.head.name} at ${id7}.`
}

function savedCommits(repo: Repo): { id: string; message: string }[] {
  const out: { id: string; message: string }[] = []
  const seen = new Set<string>()
  let id = headCommitId(repo)
  while (id && !seen.has(id)) {
    seen.add(id)
    const c: Repo['commits'][string] | undefined = repo.commits[id]
    if (!c) break
    out.push({ id: c.id, message: c.message })
    id = c.parents[0] ?? null
  }
  return out
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
  const changed = status ? [...status.unstaged.map((c) => c.path), ...status.untracked] : []
  const staged = status ? status.staged.map((c) => c.path) : []
  const saved = savedCommits(repo)
  const headId = headCommitId(repo)
  const branchName = repo.head.kind === 'branch' ? repo.head.name : null
  const g = layoutGraph(repo)
  const nodeById = new Map(g.nodes.map((n) => [n.id, n]))
  const head = g.nodes.find((n) => n.isHead)
  const stubX = head ? head.x + DEFAULT_GAP : 0
  const widest = Math.max(0, ...g.labels.map((l) => labelWidth(labelText(l.name, l.current))))
  const padX = Math.max(20, Math.ceil(widest / 2) + 4)
  const totalW = g.width + padX

  return (
    <section className="repomap">
      <div className="repomap-head">
        <span className="repomap-branch">
          <i className={`dot ${branchName === null || branchName === 'main' ? 'dot-main' : 'dot-branch'}`} aria-hidden="true" />
          {branchName ?? `HEAD detached at ${headId ? headId.slice(0, 7) : ''}`}
        </span>
      </div>
      {g.nodes.length === 0 ? (
        <p className="repomap-empty">No commits yet</p>
      ) : (
        <div className="repomap-graph">
          <svg role="img" aria-label={ariaSummary(world)} width={totalW} height={g.height} viewBox={`0 0 ${totalW} ${g.height}`}>
            <g transform={`translate(${padX} 0)`} aria-hidden="true">
              {g.edges.map((e) => {
                const a = nodeById.get(e.from)
                const b = nodeById.get(e.to)
                if (!a || !b) return null
                const mid = (a.x + b.x) / 2
                const main = b.lane === 0
                return (
                  <path
                    key={`${e.from}-${e.to}`}
                    className="edge"
                    d={`M${a.x} ${a.y} C${mid} ${a.y} ${mid} ${b.y} ${b.x} ${b.y}`}
                    fill="none"
                    stroke={main ? 'var(--g-main)' : 'var(--g-branch)'}
                    strokeWidth="3"
                    strokeOpacity={main ? 0.45 : 1}
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
                const text = labelText(l.name, l.current)
                const w = labelWidth(text)
                const y = l.lane === 0 ? n.y + 24 : n.y - 42
                const fill = l.lane === 0 ? 'var(--g-main-lbl)' : 'var(--g-branch)'
                return (
                  <g key={l.name}>
                    <rect x={n.x - w / 2} y={y} width={w} height="22" rx="11" fill={fill} stroke={l.current ? 'var(--g-head)' : 'none'} strokeWidth="2" />
                    <text x={n.x} y={y + 15} textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="600" fill={l.lane === 0 ? '#fff' : '#1b1306'}>{text}</text>
                  </g>
                )
              })}
            </g>
          </svg>
          <ol className="sr-only">
            {g.nodes
              .filter((n) => n.id !== '…')
              .map((n) => (
                <li key={n.id}>{`${n.id.slice(0, 7)} ${n.message}`}</li>
              ))}
          </ol>
        </div>
      )}

      <div className="zones">
        <Area kind="folder" title="Folder" count={changed.length} empty="Nothing changed">
          {changed.map((p) => <li key={p} className="file file-changed" title={p}><i aria-hidden="true" />{p}</li>)}
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
