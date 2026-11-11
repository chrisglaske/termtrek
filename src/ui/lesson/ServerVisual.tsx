import { useRef } from 'react'
import type { Commit, World } from '../../engine/types'

const MAX_SHOWN = 4

/** Every commit `tips` reach in `commits`, newest first. */
function history(commits: Record<string, Commit>, tips: (string | null | undefined)[]): Commit[] {
  const seen = new Set<string>()
  const stack = tips.filter((t): t is string => !!t)
  while (stack.length) {
    const id = stack.pop()!
    if (seen.has(id) || !commits[id]) continue
    seen.add(id)
    stack.push(...commits[id].parents)
  }
  return [...seen].map((id) => commits[id]!).sort((a, b) => b.time - a.time || (a.id < b.id ? -1 : 1))
}

const plural = (n: number) => `${n} ${n === 1 ? 'commit' : 'commits'}`

interface Row {
  c: Commit
  chips: string[]
  only: boolean
  /** Arrived on this side with the last command. */
  fresh: boolean
}

/** What the sides held at one moment, so two moments can be compared. */
interface Snap {
  sig: string
  mine: string[]
  theirs: string[]
  localTip: string | null
  trackTip: string | null
  hadRepo: boolean
}

interface Move {
  dir: 'toServer' | 'toYou' | 'none'
  /** The git command word that moved things, when the line just run was one. */
  verb: string | null
  caption: string
}

const VERB = /^git\s+(push|fetch|pull|clone)\b/

const n = (k: number, one: string, many = one + 's') => `${k} ${k === 1 ? one : many}`

function Side({ kind, title, sub, rows, empty }: { kind: 'you' | 'server'; title: string; sub: string; rows: Row[]; empty: string }): React.JSX.Element {
  const shown = rows.slice(0, MAX_SHOWN)
  const more = rows.length - shown.length
  return (
    <section className={`sv-side sv-${kind}`} aria-label={`${title}, ${sub}`}>
      <h3>
        {title} <code>{sub}</code>
      </h3>
      {rows.length === 0 ? (
        <p className="sv-empty">{empty}</p>
      ) : (
        <ul>
          {shown.map((r) => (
            <li key={r.c.id} className={[r.only ? 'sv-only' : '', r.fresh ? `sv-fresh sv-fresh-${kind}` : ''].filter(Boolean).join(' ') || undefined}>
              <span className="sv-dot" aria-hidden="true" />
              <span className="sv-msg">{r.c.message.split('\n')[0]}</span>
              {r.chips.map((chip) => (
                <span key={chip} className="sv-chip">
                  {chip}
                </span>
              ))}
              {r.fresh && <span className="sv-tag sv-new">new</span>}
              {r.only && <span className="sv-tag">only here</span>}
            </li>
          ))}
          {more > 0 && <li className="sv-more">+{more} older</li>}
        </ul>
      )}
    </section>
  )
}

/**
 * Your computer next to the server for one branch, from the live world, newest commit on top.
 * Commits the other side has no copy of are marked "only here" in text; the caption says who is ahead on this branch.
 */
export function ServerVisual({ world, branch, last }: { world: World; branch?: string; last?: string }): React.JSX.Element | null {
  const seen = useRef<{
    snap: Snap
    move: Move | null
    freshYou: Set<string>
    freshServer: Set<string>
  } | null>(null)
  const remote = world.remote
  if (!remote) return null
  const repo = world.repo
  const name = branch ?? (repo?.head.kind === 'branch' ? repo.head.name : remote.defaultBranch)
  const tracking = `origin/${name}`
  const localTip = repo && Object.hasOwn(repo.branches, name) ? repo.branches[name] : null
  const trackTip = repo && Object.hasOwn(repo.remoteRefs, tracking) ? repo.remoteRefs[tracking] : null
  const serverTip = Object.hasOwn(remote.branches, name) ? remote.branches[name] : null

  const mine = repo ? history(repo.commits, [localTip, trackTip]) : []
  const theirs = history(remote.commits, [serverTip])
  const theirIds = new Set(theirs.map((c) => c.id))
  const onBranch = new Set(repo ? history(repo.commits, [localTip]).map((c) => c.id) : [])
  const ahead = [...onBranch].filter((id) => !theirIds.has(id)).length
  const behind = theirs.filter((c) => !onBranch.has(c.id)).length

  const now: Snap = {
    sig: '',
    mine: mine.map((c) => c.id),
    theirs: theirs.map((c) => c.id),
    localTip: localTip ?? null,
    trackTip: trackTip ?? null,
    hadRepo: !!repo,
  }
  now.sig = JSON.stringify([now.mine, now.theirs, now.localTip, now.trackTip, now.hadRepo, last ?? ''])
  const verb = last?.trim().match(VERB)?.[1] ?? null
  if (!seen.current)
    seen.current = {
      snap: now,
      move: null,
      freshYou: new Set(),
      freshServer: new Set(),
    }
  else if (seen.current.snap.sig !== now.sig) {
    const was = seen.current.snap
    const toServer = now.theirs.filter((id) => !was.theirs.includes(id))
    const toYou = now.mine.filter((id) => !was.mine.includes(id))
    let move: Move | null = null
    if (toServer.length) {
      move = {
        dir: 'toServer',
        verb,
        caption: `Push sent ${n(toServer.length, 'commit')} to the server. Both sides now have ${toServer.length === 1 ? 'it' : 'them'}.`,
      }
    } else if (toYou.length) {
      const verbWord = verb ?? 'The command'
      const kept = was.localTip === now.localTip
      move = {
        dir: 'toYou',
        verb,
        caption: !was.hadRepo
          ? `Clone copied ${n(toYou.length, 'commit')} from the server to your computer.`
          : kept
            ? `${verbWord === 'fetch' ? 'Fetch' : verbWord} brought ${n(toYou.length, 'commit')} to your computer. Your ${name} has not moved yet.`
            : `${verbWord === 'pull' ? 'Pull' : verbWord} brought ${n(toYou.length, 'commit')} to your computer and moved your ${name} forward.`,
      }
    } else if (now.trackTip !== was.trackTip || now.localTip !== was.localTip) {
      move = {
        dir: 'none',
        verb,
        caption: now.localTip !== was.localTip ? `Your ${name} moved.` : `origin/${name} moved to match the server.`,
      }
    } else if (verb) {
      move = {
        dir: 'none',
        verb,
        caption:
          verb === 'push' ? 'Nothing moved. The server still has the same commits.' : verb === 'fetch' ? 'Nothing new on the server.' : 'Nothing to bring in.',
      }
    }
    seen.current = {
      snap: now,
      move,
      freshYou: new Set(toYou),
      freshServer: new Set(toServer),
    }
  }
  const { move, freshYou, freshServer } = seen.current

  // "Only here" means the other side has no copy of the commit at all, on any branch. It says something only when both sides have commits.
  const both = mine.length > 0 && theirs.length > 0
  const youRows: Row[] = mine.map((c) => ({
    c,
    chips: [...(c.id === localTip ? [name] : []), ...(c.id === trackTip ? [tracking] : [])],
    only: both && !Object.hasOwn(remote.commits, c.id),
    fresh: freshYou.has(c.id),
  }))
  const serverRows: Row[] = theirs.map((c) => ({
    c,
    chips: c.id === serverTip ? [name] : [],
    only: both && !Object.hasOwn(repo?.commits ?? {}, c.id),
    fresh: freshServer.has(c.id),
  }))

  let caption: string
  if (!repo) caption = `The server has ${plural(theirs.length)}. Your computer has no copy yet.`
  else if (Object.keys(remote.branches).length === 0) caption = 'The server is empty. Nothing has been sent yet.'
  else if (!serverTip) caption = `The server has no ${name} branch.`
  else if (!localTip) caption = `Your computer has no ${name} branch.`
  else if (ahead && behind) caption = `Your ${name} and the server's have split: ${plural(ahead)} only you have, ${plural(behind)} only the server has.`
  else if (ahead) caption = `Your ${name} is ${plural(ahead)} ahead. The server does not have ${ahead === 1 ? 'it' : 'them'} yet.`
  else if (behind) caption = `The server's ${name} has ${plural(behind)} your ${name} does not have yet.`
  else caption = `Your ${name} and the server's match.`

  return (
    <figure className="pf-server">
      <div className="sv-sides">
        <Side kind="you" title="Your computer" sub={name} rows={youRows} empty={repo ? 'No commits yet' : 'No copy yet'} />
        <span className={`sv-link${move && move.dir !== 'none' ? ` sv-link-go sv-link-${move.dir}` : ''}`} key={seen.current.snap.sig} aria-hidden="true">
          {move?.dir === 'toServer' ? '→' : move?.dir === 'toYou' ? '←' : '⇄'}
          {move && move.dir !== 'none' && move.verb && <small>git {move.verb}</small>}
        </span>
        <Side kind="server" title="Server" sub={name} rows={serverRows} empty={Object.keys(remote.branches).length ? `No ${name} branch` : 'Empty'} />
      </div>
      <figcaption>
        {move && (
          <span className="sv-moved" role="status">
            {move.caption}
          </span>
        )}
        <span className="sv-state">{caption}</span>
      </figcaption>
    </figure>
  )
}
