import type { Commit, Repo } from '../../engine/types'
import { headCommitId } from '../../engine/git/repoState'

export interface GraphNode { id: string; x: number; y: number; lane: number; isHead: boolean; message: string }
export interface GraphEdge { from: string; to: string }
export interface GraphLabel { name: string; commitId: string; lane: number; current: boolean }
export interface GraphLayout { nodes: GraphNode[]; edges: GraphEdge[]; labels: GraphLabel[]; width: number; height: number }

export const DEFAULT_GAP = 46
const PADDING = 34
const LABEL_ROOM = 120

function topoOrder(repo: Repo): string[] {
  const ids = Object.keys(repo.commits)
  const children: Record<string, string[]> = {}
  const pending: Record<string, number> = {}
  for (const id of ids) {
    const parents = (repo.commits[id]?.parents ?? []).filter((p) => p in repo.commits)
    pending[id] = parents.length
    for (const p of parents) (children[p] ??= []).push(id)
  }
  const before = (a: string, b: string) => {
    const d = (repo.commits[a]?.time ?? 0) - (repo.commits[b]?.time ?? 0)
    return d !== 0 ? d : a < b ? -1 : a > b ? 1 : 0
  }
  const ready = ids.filter((id) => pending[id] === 0).sort(before)
  const out: string[] = []
  while (ready.length) {
    const id = ready.shift() as string
    out.push(id)
    for (const c of children[id] ?? []) {
      const left = (pending[c] ?? 1) - 1
      pending[c] = left
      if (left === 0) {
        ready.push(c)
        ready.sort(before)
      }
    }
  }
  return out
}

function assignLanes(repo: Repo, names: string[]): Record<string, number> {
  const lanes: Record<string, number> = {}
  names.forEach((name, lane) => {
    let id: string | null | undefined = repo.branches[name]
    while (id && !(id in lanes)) {
      const commit: Commit | undefined = repo.commits[id]
      if (!commit) break
      lanes[id] = lane
      id = commit.parents[0]
    }
  })
  for (const id of Object.keys(repo.commits)) lanes[id] ??= names.length
  return lanes
}

export function layoutGraph(repo: Repo, opts: { gap?: number; laneGap?: number; maxCommits?: number } = {}): GraphLayout {
  const gap = opts.gap ?? DEFAULT_GAP
  const laneGap = opts.laneGap ?? 66
  const maxCommits = opts.maxCommits ?? 8
  const names = Object.keys(repo.branches)
  const order = topoOrder(repo)
  if (order.length === 0) return { nodes: [], edges: [], labels: [], width: 0, height: 0 }

  const lanes = assignLanes(repo, names)
  const truncated = order.length > maxCommits
  const shown = truncated ? order.slice(order.length - maxCommits) : order
  const shownSet = new Set(shown)
  const laneOf = (id: string) => lanes[id] ?? 0
  const maxLane = Math.max(0, ...shown.map(laneOf))
  const top = maxLane * laneGap + PADDING
  const offset = truncated ? 1 : 0
  const headId = headCommitId(repo)

  const nodes: GraphNode[] = []
  if (truncated) nodes.push({ id: '…', x: 0, y: top, lane: 0, isHead: false, message: '' })
  shown.forEach((id, i) => {
    const lane = laneOf(id)
    nodes.push({ id, x: (i + offset) * gap, y: top - lane * laneGap, lane, isHead: id === headId, message: repo.commits[id]?.message ?? '' })
  })

  const edges: GraphEdge[] = []
  for (const id of shown) {
    for (const p of repo.commits[id]?.parents ?? []) if (shownSet.has(p)) edges.push({ from: p, to: id })
  }
  if (truncated) edges.push({ from: '…', to: shown[0] as string })

  const labels: GraphLabel[] = []
  names.forEach((name, lane) => {
    const tip = repo.branches[name]
    if (tip && shownSet.has(tip)) {
      labels.push({ name, commitId: tip, lane, current: repo.head.kind === 'branch' && repo.head.name === name })
    }
  })

  const lastX = (shown.length - 1 + offset) * gap
  return { nodes, edges, labels, width: lastX + LABEL_ROOM, height: top + PADDING + 10 }
}
