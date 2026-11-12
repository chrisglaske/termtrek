import type { Commit, Repo, World } from '../../engine/types'
import { headCommitId } from '../../engine/git/repoState'
import { reachableFromRefs } from '../../engine/git/refs'

const GAP = 76
const PAD_X = 44
const MAX_SHOWN = 5
const Y = 56
const LABEL_H = 22

/** Commits HEAD reaches along its first parents, oldest first, and how many older ones are left out. */
function chainOf(repo: Repo, headId: string): { shown: Commit[]; hidden: number } {
  const all: Commit[] = []
  let id: string | undefined = headId
  while (id && repo.commits[id]) {
    const c: Commit = repo.commits[id]!
    all.push(c)
    id = c.parents[0]
  }
  const hidden = Math.max(0, all.length - MAX_SHOWN)
  return { shown: all.slice(0, MAX_SHOWN).reverse(), hidden }
}

/** Commits no branch reaches any more, but `git reflog` still remembers, that sit on top of HEAD (what a reset leaves behind), oldest first. */
function leftBehind(repo: Repo, headId: string): Commit[] {
  const reachable = reachableFromRefs(repo)
  const ids = [...new Set(repo.reflog.map((e) => e.id))].filter((id) => id in repo.commits && !reachable.has(id))
  const above = (c: Commit): number => {
    let n = 0
    let cur: Commit | undefined = c
    while (cur && cur.id !== headId && n < 500) {
      cur = repo.commits[cur.parents[0] ?? '']
      n++
    }
    return cur?.id === headId ? n : -1
  }
  return ids
    .map((id) => ({ c: repo.commits[id]!, n: above(repo.commits[id]!) }))
    .filter((x) => x.n > 0)
    .sort((a, b) => a.n - b.n)
    .map((x) => x.c)
}

/**
 * One line of history from the live world. Commits a reset left behind are drawn dashed and labelled
 * "recoverable"; HEAD has a ring and a text label, so nothing relies on colour alone.
 */
export function RewindVisual({ world }: { world: World }): React.JSX.Element | null {
  const repo = world.repo
  const headId = repo ? headCommitId(repo) : null
  if (!repo || !headId) return null
  const { shown, hidden } = chainOf(repo, headId)
  const lost = leftBehind(repo, headId)
  const nodes = [...shown.map((c) => ({ c, lost: false })), ...lost.map((c) => ({ c, lost: true }))]
  const offset = hidden > 0 ? 1 : 0
  const x = (i: number) => PAD_X + (i + offset) * GAP
  const width = x(nodes.length - 1) + PAD_X
  const headIndex = shown.length - 1
  const branch = repo.head.kind === 'branch' ? repo.head.name : null
  const labelText = branch ? `${branch} · HEAD` : 'HEAD'
  const labelW = labelText.length * 7.4 + 18
  const id7 = (c: Commit) => c.id.slice(0, 7)

  const summary =
    `History${branch ? ` on ${branch}` : ''}: ${shown.length + hidden} ${shown.length + hidden === 1 ? 'commit' : 'commits'}, HEAD at ${id7(shown[headIndex]!)}.` +
    (lost.length
      ? ` ${lost.length} newer ${lost.length === 1 ? 'commit is' : 'commits are'} still saved but no longer on ${branch ?? 'the branch'}: ${lost.map(id7).join(', ')}. \`git reflog\` can bring ${lost.length === 1 ? 'it' : 'them'} back.`
      : '')

  return (
    <figure className="pf-graph pf-rewind">
      <div className="pf-rewind-scroll">
        <svg role="img" aria-label={summary} width={width} height={128} viewBox={`0 0 ${width} 128`}>
          <g aria-hidden="true">
            {hidden > 0 && (
              <>
                <line x1={x(-1) + 14} y1={Y} x2={x(0)} y2={Y} stroke="var(--g-main)" strokeOpacity="0.45" strokeWidth="3" />
                <text x={x(-1)} y={Y + 5} textAnchor="middle" fill="var(--mute)" fontFamily="var(--mono)" fontSize="16">
                  …
                </text>
              </>
            )}
            {nodes.slice(1).map((n, i) => (
              <line
                key={`e-${n.c.id}`}
                x1={x(i)}
                y1={Y}
                x2={x(i + 1)}
                y2={Y}
                stroke="var(--g-main)"
                strokeOpacity={n.lost ? 0.55 : 0.45}
                strokeWidth="3"
                strokeDasharray={n.lost ? '4 5' : undefined}
              />
            ))}
            {nodes.map((n, i) => (
              <g key={n.c.id} className={n.lost ? 'rw-lost' : 'rw-node'}>
                {i === headIndex && <circle cx={x(i)} cy={Y} r="14" fill="none" stroke="var(--g-head)" strokeWidth="3" />}
                {n.lost ? (
                  <circle cx={x(i)} cy={Y} r="8" fill="var(--g-hollow)" stroke="var(--g-main)" strokeWidth="2" strokeDasharray="3 3" />
                ) : (
                  <circle cx={x(i)} cy={Y} r="8" fill="var(--g-main)" />
                )}
                <text x={x(i)} y={Y + 32} textAnchor="middle" fontFamily="var(--mono)" fontSize="11" fill={n.lost ? 'var(--mute)' : 'var(--ink2)'}>
                  {id7(n.c)}
                </text>
                {n.lost && (
                  <text x={x(i)} y={Y + 48} textAnchor="middle" fontFamily="var(--mono)" fontSize="10" fontWeight="600" fill="var(--ink2)">
                    recoverable
                  </text>
                )}
              </g>
            ))}
            <g className="rw-label">
              <rect x={x(headIndex) - labelW / 2} y={Y - 14 - 8 - LABEL_H} width={labelW} height={LABEL_H} rx={LABEL_H / 2} fill="var(--g-main-lbl)" stroke="var(--g-head)" strokeWidth="2" />
              <text x={x(headIndex)} y={Y - 14 - 8 - LABEL_H + 15} textAnchor="middle" fontFamily="var(--mono)" fontSize="12" fontWeight="600" fill="var(--on-accent)">
                {labelText}
              </text>
            </g>
          </g>
        </svg>
      </div>
      <figcaption>
        {lost.length ? (
          <span>
            Dashed commits are still saved, just not on {branch ?? 'the branch'} any more. <code>git reflog</code> shows them.
          </span>
        ) : (
          <span>Oldest on the left, newest on the right</span>
        )}
      </figcaption>
    </figure>
  )
}
