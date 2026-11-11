import { createWorld } from '../../engine/world'
import { layoutGraph, type GraphNode } from './layout'
import type { Commit, Repo } from '../../engine/types'

function repoWith(n: number): Repo {
  const commits = Array.from({ length: n }, (_, i) => ({ message: `c${i}`, files: { [`f${i}.txt`]: String(i) } }))
  return createWorld({ repo: { at: 'p', commits } }).repo as Repo
}

describe('layoutGraph', () => {
  it('lays out 3 linear commits', () => {
    const repo = repoWith(3)
    const g = layoutGraph(repo)
    expect(g.nodes.map((n) => n.x)).toEqual([0, 46, 92])
    expect(g.nodes.every((n) => n.lane === 0)).toBe(true)
    expect(g.nodes.map((n) => n.isHead)).toEqual([false, false, true])
    expect(g.edges).toHaveLength(2)
    expect(g.labels).toEqual([{ name: 'main', commitId: g.nodes[2]!.id, lane: 0, current: true }])
  })

  it('truncates with a marker node', () => {
    const g = layoutGraph(repoWith(10), { maxCommits: 8 })
    expect(g.nodes).toHaveLength(9)
    expect(g.nodes[0]).toMatchObject({ id: '…', x: 0, lane: 0, isHead: false, message: '' })
    expect(g.nodes[1]!.x).toBe(46)
    expect(g.edges).toHaveLength(8)
  })

  it('returns nothing for an unborn repo', () => {
    const repo = createWorld({ repo: { at: 'p' } }).repo as Repo
    const g = layoutGraph(repo)
    expect(g.nodes).toHaveLength(0)
    expect(g.labels).toHaveLength(0)
  })

  it('puts a second branch on lane 1 and detached commits after the last lane', () => {
    const repo = repoWith(2)
    const [a, b] = Object.values(repo.commits).sort((x, y) => x.time - y.time) as [Commit, Commit]
    const extra = { ...b, id: 'feed123', parents: [a.id], message: 'x', time: 99 }
    repo.commits[extra.id] = extra
    repo.branches.topic = extra.id
    const g = layoutGraph(repo)
    const byId: Record<string, GraphNode> = Object.fromEntries(g.nodes.map((n) => [n.id, n]))
    expect(byId[b.id]!.lane).toBe(0)
    expect(byId[extra.id]!.lane).toBe(1)
    expect(byId[extra.id]!.y).toBeLessThan(byId[b.id]!.y)
    expect(g.labels.find((l) => l.name === 'topic')?.current).toBe(false)
    repo.head = { kind: 'detached', id: extra.id }
    expect(layoutGraph(repo).labels.some((l) => l.current)).toBe(false)
  })
})
