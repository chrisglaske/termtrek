import { Fragment, useLayoutEffect, useRef } from 'react'
import { diffStage, snapStage } from './stageChange'
import type { StageChange, StageSnap } from './stageChange'
import type { World } from '../../engine/types'
import type { StageBox } from '../../lessons/schema'
import { getStatus, workingFiles } from '../../engine/git/repoState'
import { savedCommits } from '../repomap/RepoMap'

const BOXES: { key: StageBox; title: string; sub: string; empty: string }[] = [
  {
    key: 'folder',
    title: 'Folder',
    sub: 'Your files, as they are now',
    empty: 'No files yet',
  },
  {
    key: 'staged',
    title: 'Staged',
    sub: 'Chosen for the next save',
    empty: 'Nothing chosen yet',
  },
  {
    key: 'saved',
    title: 'Saved',
    sub: 'Snapshots you can go back to',
    empty: 'No saves yet',
  },
]

const NEXT_BOX: Record<StageBox, StageBox> = {
  folder: 'staged',
  staged: 'saved',
  saved: 'saved',
}
const MAX_SHOWN = 3
const STAGED_ANY = 'staged-any'

const reducedMotion = (): boolean =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

/**
 * The Folder, Staged and Saved boxes, filled from the real world.
 * A file that moves between boxes flies to its new place; a new snapshot flies in from the staged file.
 */
export function StageVisual({
  world,
  show,
  hot,
  advance = false,
  compact = false,
  last,
  refused = false,
}: {
  world: World
  show: StageBox[]
  hot?: StageBox
  /** True once the page's command has passed: the ring then follows the file, but only if a file really moved. */
  advance?: boolean
  /** The line the learner just ran, so read-only commands (status, diff) can be tied to the boxes. */
  last?: string
  /** Git refused a switch because the Folder holds unsaved changes. */
  refused?: boolean
  /** Smaller boxes kept side by side on phones, so the command and terminal stay in view. */
  compact?: boolean
}): React.JSX.Element {
  const rootRef = useRef<HTMLDivElement>(null)
  const rects = useRef(new Map<string, DOMRect>())
  const seen = useRef<{
    key: string
    snap: StageSnap
    change: StageChange | null
  } | null>(null)

  // Compare with the previous moment; keep the last sentence until something else changes.
  const snap = snapStage(world)
  const key = JSON.stringify(snap)
  if (!seen.current) seen.current = { key, snap, change: null }
  else if (seen.current.key !== key) {
    const change = diffStage(seen.current.snap, snap)
    seen.current = { key, snap, change: change ?? seen.current.change }
  }
  const change = seen.current.change
  const ringHot = hot && advance && change?.advanced ? NEXT_BOX[hot] : hot
  const tone = advance && change?.advanced ? 'ok' : 'accent'

  const status = getStatus(world)
  const repo = world.repo
  // A file stays in the Folder after it is staged or saved; it just shows quietly, with what happened to it.
  const changed = new Set(status ? [...status.unstaged.map((c) => c.path), ...status.untracked] : [])
  const chosen = new Set(status ? status.staged.map((c) => c.path) : [])
  const onDisk = repo
    ? Object.keys(workingFiles(world, repo)).filter((p) => p in repo.index)
    : Object.keys(world.files).map((p) => p.slice(p.lastIndexOf('/') + 1))
  const folderPaths = [...new Set([...changed, ...onDisk])].sort()
  const ignoredFiles = snap.ignored
  const items: Record<
    StageBox,
    {
      key: string
      from?: string
      ghost?: string
      tag?: string
      node: React.ReactNode
    }[]
  > = {
    folder: folderPaths.map((p) =>
      changed.has(p) || !repo
        ? {
            key: `file:${p}`,
            ghost: undefined,
            tag: repo ? snap.changed[p] : undefined,
            node: p,
          }
        : {
            key: `ghost:${p}`,
            ghost: chosen.has(p) ? 'also staged' : 'saved',
            node: p,
          },
    ),
    staged: status
      ? status.staged.map((c) => ({
          key: `file:${c.path}`,
          tag: c.kind,
          node: c.path,
        }))
      : [],
    saved: repo
      ? savedCommits(repo).map((c) => ({
          key: `commit:${c.id}`,
          from: STAGED_ANY,
          node: (
            <>
              <b>{c.id.slice(0, 7)}</b>
              <span>{c.message}</span>
            </>
          ),
        }))
      : [],
  }

  // Read-only commands change nothing; tie what they print to the boxes instead.
  const cmd = last?.trim() ?? ''
  let read: { caption: string; cmp?: [StageBox, StageBox] } | null = null
  const tagItems = (box: StageBox, tag: (path: string) => string | undefined) => {
    items[box] = items[box].map((it) => {
      const path = it.key.startsWith('file:') ? it.key.slice(5) : null
      const t = path ? tag(path) : undefined
      return t ? { ...it, tag: t, ghost: undefined } : it
    })
  }
  if (status && /^git status\b/.test(cmd)) {
    const kind = (p: string) => (snap.changed[p] === 'new' ? 'untracked' : snap.changed[p] === 'deleted' ? 'deleted' : 'modified')
    tagItems('folder', (p) => (p in snap.changed ? kind(p) : undefined))
    tagItems('staged', () => 'to be committed')
    const parts = [
      status.untracked.length ? `${status.untracked.length} untracked` : '',
      status.unstaged.length ? `${status.unstaged.length} changed but not staged` : '',
      status.staged.length ? `${status.staged.length} staged` : '',
    ].filter(Boolean)
    read = { caption: parts.length ? `git status listed ${parts.join(', ')}. Each file below carries the same label.` : 'git status found nothing to do: the Folder matches your last save.' }
  } else if (status && /^git diff\b/.test(cmd)) {
    const cached = /--(staged|cached)\b/.test(cmd)
    const pair: [StageBox, StageBox] = cached ? ['staged', 'saved'] : ['folder', show.includes('staged') ? 'staged' : 'saved']
    const names = { folder: 'the Folder', staged: 'Staged', saved: 'your last save' } as const
    const paths = cached ? status.staged.map((c) => c.path) : status.unstaged.map((c) => c.path)
    tagItems(cached ? 'staged' : 'folder', (p) => (paths.includes(p) ? 'differs' : undefined))
    read = {
      caption: paths.length
        ? `git diff compares ${names[pair[0]]} with ${names[pair[1]]}. ${paths.join(' and ')} ${paths.length === 1 ? 'differs' : 'differ'}, so that is what it printed.`
        : `git diff compares ${names[pair[0]]} with ${names[pair[1]]}. Nothing differs, so it printed nothing.${!cached && status.untracked.length ? ' (A new file Git has never saved is not part of a diff.)' : ''}`,
      cmp: pair,
    }
  }

  if (refused) tagItems('folder', (p) => (p in snap.changed ? 'would be overwritten' : undefined))

  // FLIP: remember where every chip was, and slide any that moved (or just arrived from a staged file).
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const still = reducedMotion()
    const now = new Map<string, DOMRect>()
    root.querySelectorAll<HTMLElement>('[data-fly]').forEach((el) => {
      const r = el.getBoundingClientRect()
      const key = el.dataset.fly!
      now.set(key, r)
      if (el.closest('.sv-staged') && !now.has(STAGED_ANY)) now.set(STAGED_ANY, r)
      const from = rects.current.get(key) ?? (el.dataset.from ? rects.current.get(el.dataset.from) : undefined)
      if (!from || still || typeof el.animate !== 'function') return
      const dx = from.left - r.left
      const dy = from.top - r.top
      if (Math.abs(dx) < 2 && Math.abs(dy) < 2) return
      el.animate(
        [
          { transform: `translate(${dx}px, ${dy}px)` },
          {
            transform: `translate(${dx / 2}px, ${dy / 2 - 24}px) scale(1.06)`,
            offset: 0.5,
          },
          { transform: 'none' },
        ],
        { duration: 750, easing: 'cubic-bezier(.4,0,.2,1)' },
      )
    })
    rects.current = now
  })

  return (
    <>
      <div className={`sv sv-n${show.length}${compact ? ' sv-compact' : ''}`} ref={rootRef}>
        {BOXES.map((b, i) => {
          const on = show.includes(b.key)
          const list = items[b.key]
          const cls = ['sv-box', `sv-${b.key}`, read?.cmp?.includes(b.key) ? 'sv-cmp' : '', on ? '' : 'sv-off', ringHot === b.key ? `sv-hot sv-hot-${tone}` : ringHot && on ? 'sv-dim' : '']
            .filter(Boolean)
            .join(' ')
          return (
            <Fragment key={b.key}>
              {i > 0 && (
                <span className={`sv-arrow${on ? '' : ' sv-off'}`} aria-hidden="true">
                  →
                </span>
              )}
              <section className={cls} aria-hidden={on ? undefined : true} aria-label={on ? b.title : undefined}>
                <h3>
                  {b.title}
                  {read?.cmp?.includes(b.key) && <span className="sv-cmp-tag">compared</span>}
                </h3>
                <small>{b.sub}</small>
                <div className="sv-in">
                  {list.length === 0 ? (
                    <p className="sv-empty">{b.empty}</p>
                  ) : (
                    <ul>
                      {list.slice(0, MAX_SHOWN).map((it) => (
                        <li
                          key={it.key}
                          data-fly={it.key}
                          data-from={it.from}
                          className={b.key === 'saved' ? 'sv-snap' : it.ghost ? 'sv-file sv-ghost' : refused && b.key === 'folder' && it.tag ? 'sv-file sv-refused' : 'sv-file'}
                        >
                          {b.key !== 'saved' && <i aria-hidden="true" />}
                          {it.node}
                          {(it.ghost ?? it.tag) && <em className="sv-tag">{it.ghost ?? it.tag}</em>}
                        </li>
                      ))}
                      {list.length > MAX_SHOWN && <li className="sv-more">+{list.length - MAX_SHOWN} more</li>}
                      {b.key === 'folder' &&
                        ignoredFiles.slice(0, 2).map((p) => (
                          <li key={`ign:${p}`} className="sv-file sv-ghost sv-ignored">
                            <i aria-hidden="true" />
                            {p}
                            <em className="sv-tag">ignored</em>
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </section>
            </Fragment>
          )
        })}
      </div>
      {(read ?? change) && (
        <p className={`sv-change sv-change-${read ? 'ok' : change!.tone}`} role="status" key={read ? cmd : key}>
          {read ? read.caption : change!.caption}
        </p>
      )}
      {snap.shelf > 0 && <p className="sv-shelf">On the shelf: {snap.shelf === 1 ? '1 stash entry' : `${snap.shelf} stash entries`}</p>}
    </>
  )
}
