import type { Commit, Repo } from '../../engine/types'
import { headCommitId } from '../../engine/git/repoState'
import { reachableFromRefs } from '../../engine/git/refs'

export interface GraphNode { id: string; x: number; y: number; lane: number; isHead: boolean; message: string; lost: boolean }
export interface GraphEdge { from: string; to: string }
export interface GraphLabel { name: string; commitId: string; lane: number; current: boolean; slot: number }
export interface GraphLayout { nodes: GraphNode[]; edges: GraphEdge[]; labels: GraphLabel[]; width: number; height: number }

export const DEFAULT_GAP = 46
export const LABEL_H = 22
const PADDING = 8
const RING = 13
const LABEL_ROOM = 120

/** Top of a label relative to its node: slot 0 sits below, the rest stack above. */
export function labelOffset(slot: number): number {
  return slot === 0 ? 24 : -42 - 26 * (slot - 1)
}

function topoOrder(repo: Repo, keep: Set<string>): string[] {
  const ids = Object.keys(repo.commits).filter((id) => keep.has(id))
  const children: Record<string, string[]> = {}
  const pending: Record<string, number> = {}
  for (const id of ids) {
    const parents = (repo.commits[id]?.parents ?? []).filter((p) => keep.has(p))
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

/** `main` (or `master`) first, then the other branches in insertion order. */
export function branchOrder(repo: Repo): string[] {
  const names = Object.keys(repo.branches)
  const trunk = names.includes('main') ? 'main' : names.includes('master') ? 'master' : null
  return trunk ? [trunk, ...names.filter((n) => n !== trunk)] : names
}

function assignLanes(repo: Repo, names: string[], reachable: Set<string>): Record<string, number> {
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
  // A merged branch whose label moved onto the trunk keeps its old commits on its own lane.
  const claimed = new Set(Object.values(lanes))
  names.forEach((name, lane) => {
    if (claimed.has(lane)) return
    const stack = [repo.branches[name]]
    const seen = new Set<string>()
    while (stack.length) {
      const id = stack.pop()
      if (!id || seen.has(id) || !repo.commits[id]) continue
      seen.add(id)
      lanes[id] ??= lane
      stack.push(...repo.commits[id].parents)
    }
  })
  for (const id of reachable) lanes[id] ??= names.length
  return lanes
}

export function layoutGraph(repo: Repo, opts: { gap?: number; laneGap?: number; maxCommits?: number } = {}): GraphLayout {
  const gap = opts.gap ?? DEFAULT_GAP
  const laneGap = opts.laneGap ?? 66
  const maxCommits = opts.maxCommits ?? 8
  const names = branchOrder(repo)
  const reachable = reachableFromRefs(repo)
  const lostSet = new Set(repo.reflog.map((e) => e.id).filter((id) => id in repo.commits && !reachable.has(id)))
  const order = topoOrder(repo, new Set([...reachable, ...lostSet]))
  if (order.length === 0) return { nodes: [], edges: [], labels: [], width: 0, height: 0 }

  const rawLanes = assignLanes(repo, names, reachable)
  const truncated = order.length > maxCommits
  const shown = truncated ? order.slice(order.length - maxCommits) : order
  const shownSet = new Set(shown)

  // Lane 0 stays the trunk; the other lanes in use close up, and lost commits get one extra lane on top.
  const used = [...new Set(shown.filter((id) => !lostSet.has(id)).map((id) => rawLanes[id] ?? 0))].filter((l) => l > 0).sort((a, b) => a - b)
  const rank = new Map(used.map((l, i) => [l, i + 1]))
  const lostLane = used.length + 1
  const laneOf = (id: string) => (lostSet.has(id) ? lostLane : (rank.get(rawLanes[id] ?? 0) ?? 0))
  const offset = truncated ? 1 : 0
  const headId = headCommitId(repo)

  const nodes: GraphNode[] = []
  if (truncated) nodes.push({ id: '…', x: 0, y: 0, lane: 0, isHead: false, message: '', lost: false })
  shown.forEach((id, i) => {
    const lane = laneOf(id)
    nodes.push({ id, x: (i + offset) * gap, y: -lane * laneGap, lane, isHead: id === headId, message: repo.commits[id]?.message ?? '', lost: lostSet.has(id) })
  })
  const laneById = new Map(nodes.map((n) => [n.id, n.lane]))

  const edges: GraphEdge[] = []
  for (const id of shown) {
    for (const p of repo.commits[id]?.parents ?? []) if (shownSet.has(p)) edges.push({ from: p, to: id })
  }
  if (truncated) edges.push({ from: '…', to: shown[0] as string })

  const labels: GraphLabel[] = []
  const slots: Record<string, number> = {}
  const place = (name: string, commitId: string, current: boolean, trunk: boolean) => {
    const slot = trunk ? 0 : Math.max(1, slots[commitId] ?? 1)
    if (!trunk) slots[commitId] = slot + 1
    labels.push({ name, commitId, lane: laneById.get(commitId) ?? 0, current, slot })
  }
  names.forEach((name, i) => {
    const tip = repo.branches[name]
    if (tip && shownSet.has(tip)) place(name, tip, repo.head.kind === 'branch' && repo.head.name === name, i === 0)
  })
  if (repo.head.kind === 'detached' && headId && shownSet.has(headId)) place('HEAD', headId, true, false)

  // Fit the drawing to every node ring and label, so nothing clips.
  let minY = -RING
  let maxY = RING
  for (const n of nodes) {
    minY = Math.min(minY, n.y - RING)
    maxY = Math.max(maxY, n.y + RING)
  }
  for (const l of labels) {
    const top = (nodes.find((n) => n.id === l.commitId)?.y ?? 0) + labelOffset(l.slot)
    minY = Math.min(minY, top - 1)
    maxY = Math.max(maxY, top + LABEL_H + 1)
  }
  const shift = PADDING - minY
  for (const n of nodes) n.y += shift

  const lastX = (shown.length - 1 + offset) * gap
  return { nodes, edges, labels, width: lastX + LABEL_ROOM, height: maxY - minY + 2 * PADDING }
}
