import { createWorld } from '../../engine/world'
import { buildWorld } from '../../engine/setup'
import { LABEL_H, labelOffset, layoutGraph, type GraphNode } from './layout'
import type { Commit, Repo } from '../../engine/types'

const config = { 'user.name': 'Sam', 'user.email': 's@x.com' }
const built = (run: string[]): Repo =>
  buildWorld({ cwd: 'p', config, repo: { at: 'p' }, files: { 'p/notes.txt': 'base\n' }, run: ['git add .', 'git commit -m "c1"', ...run] }).repo as Repo
const FEATURE = ['git switch -c feature', 'echo f > f.txt', 'git add .', 'git commit -m "f1"']
const MAIN = ['echo m > m.txt', 'git add .', 'git commit -m "m1"']
const nodeMap = (repo: Repo) => Object.fromEntries(layoutGraph(repo).nodes.map((n) => [n.id, n])) as Record<string, GraphNode>

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
    expect(g.labels).toEqual([{ name: 'main', commitId: g.nodes[2]!.id, lane: 0, current: true, slot: 0 }])
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
  })

  it('main is lane 0 regardless of key order', () => {
    const repo = built([...FEATURE])
    repo.branches = { feature: repo.branches.feature!, main: repo.branches.main! }
    const byId = nodeMap(repo)
    expect(byId[repo.branches.main!]!.lane).toBe(0)
    expect(byId[repo.branches.feature!]!.lane).toBe(1)
    expect(layoutGraph(repo).labels.find((l) => l.name === 'main')?.slot).toBe(0)
  })

  it('feature commits on lane 1', () => {
    const repo = built([...FEATURE, 'echo g > g.txt', 'git add .', 'git commit -m "f2"', 'git switch main', ...MAIN])
    const g = layoutGraph(repo)
    const byMsg = Object.fromEntries(g.nodes.map((n) => [n.message, n]))
    expect(byMsg.c1!.lane).toBe(0)
    expect(byMsg.m1!.lane).toBe(0)
    expect(byMsg.f1!.lane).toBe(1)
    expect(byMsg.f2!.lane).toBe(1)
    expect(g.nodes.some((n) => n.lost)).toBe(false)
  })

  it('fast-forwarded labels stack', () => {
    const repo = built([...FEATURE, 'git switch main', 'git merge feature'])
    const g = layoutGraph(repo)
    const tip = repo.branches.main!
    expect(repo.branches.feature).toBe(tip)
    const at = g.labels.filter((l) => l.commitId === tip).map((l) => [l.name, l.slot])
    expect(at).toEqual([['main', 0], ['feature', 1]])
  })

  it('merge commit has two incoming edges', () => {
    const repo = built([...FEATURE, 'git switch main', ...MAIN, 'git merge --no-edit feature'])
    const g = layoutGraph(repo)
    const tip = repo.branches.main!
    expect(repo.commits[tip]!.parents).toHaveLength(2)
    const into = g.edges.filter((e) => e.to === tip).map((e) => e.from).sort()
    expect(into).toEqual([...repo.commits[tip]!.parents].sort())
    expect(nodeMap(repo)[tip]!.lane).toBe(0)
  })

  it('keeps a merged branch on its lane after its label joins main', () => {
    const repo = built([...FEATURE, 'git switch main', ...MAIN, 'git merge --no-edit feature', 'git switch -c clash', 'echo c > c.txt', 'git add .', 'git commit -m "k1"', 'git switch feature', 'git merge main'])
    const byMsg = Object.fromEntries(layoutGraph(repo).nodes.map((n) => [n.message, n]))
    expect(byMsg.f1!.lane).toBe(1)
    expect(byMsg.k1!.lane).toBe(2)
  })

  it('reset --hard leaves a lost node', () => {
    const repo = built([...MAIN, 'git reset --hard HEAD~1'])
    const g = layoutGraph(repo)
    const lost = g.nodes.filter((n) => n.lost)
    expect(lost.map((n) => n.message)).toEqual(['m1'])
    const kept = g.nodes.find((n) => n.message === 'c1')!
    expect(kept.lost).toBe(false)
    expect(lost[0]!.lane).toBeGreaterThan(kept.lane)
    expect(lost[0]!.y).toBeLessThan(kept.y)
    expect(g.height).toBeGreaterThan(layoutGraph(built([])).height)
  })

  it('leaves out commits that neither refs nor the reflog reach', () => {
    const repo = built([...MAIN, 'git reset --hard HEAD~1'])
    repo.reflog = repo.reflog.filter((e) => repo.commits[e.id]?.message !== 'm1')
    expect(layoutGraph(repo).nodes.map((n) => n.message)).toEqual(['c1'])
  })

  it('detached HEAD label', () => {
    const repo = built([...MAIN])
    const first = Object.values(repo.commits).find((c) => c.message === 'c1')!
    repo.head = { kind: 'detached', id: first.id }
    const g = layoutGraph(repo)
    expect(g.labels.filter((l) => l.current).map((l) => [l.name, l.commitId, l.slot])).toEqual([['HEAD', first.id, 1]])
    expect(g.labels.find((l) => l.name === 'main')?.current).toBe(false)
  })

  it('keeps every label inside the drawing', () => {
    const repo = built([...FEATURE, 'git switch main', 'git merge feature'])
    const g = layoutGraph(repo)
    for (const l of g.labels) {
      const n = g.nodes.find((x) => x.id === l.commitId)!
      const top = n.y + labelOffset(l.slot)
      expect(top).toBeGreaterThanOrEqual(0)
      expect(top + LABEL_H).toBeLessThanOrEqual(g.height)
    }
  })
})
