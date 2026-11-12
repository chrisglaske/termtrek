import { useLayoutEffect, useRef } from 'react'
import type { Repo, World } from '../../engine/types'
import type { PageVisual } from '../../lessons/schema'
import { headCommitId } from '../../engine/git/repoState'
import { RepoGraph, ariaSummary, savedCommits } from '../repomap/RepoMap'

type GraphSpec = Extract<PageVisual, { kind: 'graph' }>

const short = (id: string | null | undefined): string => (id ?? '').slice(0, 7)

/** Everything `tip` can reach, newest first as the log lists it. */
function reach(repo: Repo, tip: string | null | undefined): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  const stack = tip ? [tip] : []
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id) || !repo.commits[id]) continue
    seen.add(id)
    out.push(id)
    stack.push(...repo.commits[id].parents)
  }
  return out.sort((a, b) => (repo.commits[b]!.time - repo.commits[a]!.time) || (a < b ? -1 : 1))
}

interface Snap {
  sig: string
  head: string
  headId: string | null
  tips: Record<string, string | null>
  ids: string[]
  messages: Record<string, string>
  /** Commits each branch tip can reach, to tell a forward move from a replaced commit. */
  reach: Record<string, string[]>
}

function snap(repo: Repo): Snap {
  const head = repo.head.kind === 'branch' ? repo.head.name : `detached at ${short(repo.head.id)}`
  const tips: Record<string, string | null> = { ...repo.branches }
  const reaches: Record<string, string[]> = {}
  for (const [b, t] of Object.entries(tips)) reaches[b] = reach(repo, t)
  const ids = Object.keys(repo.commits)
  const messages = Object.fromEntries(ids.map((id) => [id, repo.commits[id]!.message.split('\n')[0] ?? '']))
  const headId = headCommitId(repo)
  return { sig: JSON.stringify([head, headId, tips, ids]), head, headId, tips, ids, messages, reach: reaches }
}

/** One or two plain sentences saying what the last command did to the graph. Null when nothing changed. */
export function describeChange(a: Snap, b: Snap): string | null {
  const out: string[] = []
  const created = Object.keys(b.tips).filter((n) => !(n in a.tips))
  const removed = Object.keys(a.tips).filter((n) => !(n in b.tips))
  for (const n of Object.keys(b.tips)) {
    const before = a.tips[n]
    const now = b.tips[n]
    if (!(n in a.tips) || before === now || !now || !before) continue
    if (b.reach[n]?.includes(before)) {
      const k = (b.reach[n]?.length ?? 0) - (a.reach[n]?.length ?? 0)
      out.push(`${n} moved forward${k > 0 ? ` ${k} commit${k === 1 ? '' : 's'}` : ''} to ${short(now)}.`)
    } else if (a.reach[n]?.includes(now)) {
      out.push(`${n} moved back from ${short(before)} to ${short(now)}. The newer commits are still in the reflog.`)
    } else {
      const was = a.messages[before] ?? ''
      const is = b.messages[now] ?? ''
      out.push(
        was !== is
          ? `${short(before)} was replaced by ${short(now)}. The message now reads "${is}". The old commit is off the branch.`
          : `${short(before)} was replaced by ${short(now)}: same changes, new id. The old commit is off the branch.`,
      )
    }
  }
  const fresh = b.ids.filter((id) => !a.ids.includes(id))
  if (!out.length && fresh.length) {
    const last = fresh.find((id) => id === b.headId) ?? fresh[0]!
    out.push(fresh.length === 1 ? `New commit ${short(last)}: ${b.messages[last]}.` : `${fresh.length} new commits, the newest ${short(last)}.`)
  }
  for (const n of created) out.push(`Branch ${n} was created. It points at ${short(b.tips[n])}, the same commit.`)
  for (const n of removed) out.push(`The ${n} label was removed. Its commits stay.`)
  if (a.head !== b.head) out.push(`HEAD moved from ${a.head} to ${b.head}.`)
  else if (a.headId !== b.headId && !out.length) out.push(`HEAD now points at ${short(b.headId)}.`)
  return out.length ? out.slice(0, 2).join(' ') : null
}

/** What `git log` / `git log --oneline` just printed, newest first, matching the graph above. */
function LogList({ repo, ids }: { repo: Repo; ids: string[] }): React.JSX.Element {
  const shown = ids.slice(0, 5)
  return (
    <ol className="pf-loglist" aria-label="The commits the log listed, newest first">
      {shown.map((id, i) => (
        <li key={id} style={{ animationDelay: `${i * 120}ms` }}>
          <code>{short(id)}</code>
          <span>{repo.commits[id]!.message.split('\n')[0]}</span>
          {i === 0 && <em>newest</em>}
        </li>
      ))}
      {ids.length > shown.length && <li className="pf-loglist-more">+{ids.length - shown.length} older</li>}
    </ol>
  )
}

/** The commit graph for a lesson page, with a sentence on what the last command changed. */
export function GraphVisual({ world, v, last }: { world: World; v: GraphSpec; last?: string }): React.JSX.Element | null {
  const seen = useRef<{ snap: Snap; caption: string | null } | null>(null)
  const root = useRef<HTMLElement>(null)
  const rects = useRef(new Map<string, DOMRect>())
  const repo = world.repo
  // Slide the branch labels and the HEAD ring from where they were to where they are now.
  useLayoutEffect(() => {
    const el = root.current
    if (!el) return
    const still = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    const svg = el.querySelector('svg')
    const vb = svg?.viewBox.baseVal.width
    const scale = svg && vb ? svg.getBoundingClientRect().width / vb : 1
    const now = new Map<string, DOMRect>()
    el.querySelectorAll<SVGElement>('[data-flip]').forEach((n) => {
      const key = n.dataset.flip!
      const r = n.getBoundingClientRect()
      now.set(key, r)
      const from = rects.current.get(key)
      if (!from || still || typeof n.animate !== 'function' || !scale) return
      const dx = (from.left - r.left) / scale
      const dy = (from.top - r.top) / scale
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return
      n.animate([{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], { duration: 650, easing: 'cubic-bezier(.4,0,.2,1)' })
    })
    rects.current = now
  })
  const id = repo ? headCommitId(repo) : null
  const commit = id ? repo?.commits[id] : undefined
  if (!repo || !commit) return null
  const now = snap(repo)
  if (!seen.current) seen.current = { snap: now, caption: null }
  else if (seen.current.snap.sig !== now.sig) seen.current = { snap: now, caption: describeChange(seen.current.snap, now) ?? seen.current.caption }
  const change = seen.current.caption
  const changeLine = change ? (
    <span className="pf-gchange" role="status" key={now.sig}>
      {change}
    </span>
  ) : null

  const logged = v.log && /^git\s+log\b/.test(last?.trim() ?? '')
  const list = logged ? <LogList repo={repo} ids={reach(repo, id)} /> : null

  if (v.branches) {
    const op = repo.op?.kind === 'merge' ? repo.op : null
    const shelf = repo.stash.length
    return (
      <figure className="pf-graph pf-graph-all pf-branches" ref={root}>
        <RepoGraph repo={repo} stub={false} ids label={`Your branches: ${ariaSummary(repo)}`} />
        <figcaption>
          {changeLine}
          <span>
            {op
              ? op.conflicts.length
                ? `Merging ${op.theirsLabel}: paused, ${op.conflicts.length === 1 ? '1 file' : `${op.conflicts.length} files`} to fix`
                : `Merging ${op.theirsLabel}: fixed, ready to commit`
              : 'Each label is a branch. The ring marks HEAD, where you are.'}
            {shelf > 0 && ` On the shelf: ${shelf === 1 ? '1 stash entry' : `${shelf} stash entries`}.`}
          </span>
        </figcaption>
      </figure>
    )
  }
  if (v.all) {
    const n = savedCommits(repo).length
    return (
      <figure className="pf-graph pf-graph-all" ref={root}>
        <RepoGraph repo={repo} stub={false} ids label={`Your history: ${n} commits in a row, the newest on the right.`} />
        {list}
        <figcaption>
          {changeLine}
          <span>Oldest on the left, newest on the right</span>
        </figcaption>
      </figure>
    )
  }
  const branch = repo.head.kind === 'branch' ? repo.head.name : 'HEAD'
  return (
    <figure className="pf-graph" ref={root}>
      <RepoGraph repo={repo} stub={false} label={`Your history: one dot, labelled ${branch} and HEAD, with the ID ${id!.slice(0, 7)}.`} />
      <figcaption>
        {changeLine}
        <code>{commit.id.slice(0, 7)}</code>
        <span>{commit.message}</span>
      </figcaption>
    </figure>
  )
}
