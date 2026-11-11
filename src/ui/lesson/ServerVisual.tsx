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
}

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
            <li key={r.c.id} className={r.only ? 'sv-only' : undefined}>
              <span className="sv-dot" aria-hidden="true" />
              <span className="sv-msg">{r.c.message.split('\n')[0]}</span>
              {r.chips.map((chip) => (
                <span key={chip} className="sv-chip">
                  {chip}
                </span>
              ))}
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
export function ServerVisual({ world, branch }: { world: World; branch?: string }): React.JSX.Element | null {
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

  // "Only here" means the other side has no copy of the commit at all, on any branch. It says something only when both sides have commits.
  const both = mine.length > 0 && theirs.length > 0
  const youRows: Row[] = mine.map((c) => ({
    c,
    chips: [...(c.id === localTip ? [name] : []), ...(c.id === trackTip ? [tracking] : [])],
    only: both && !Object.hasOwn(remote.commits, c.id),
  }))
  const serverRows: Row[] = theirs.map((c) => ({ c, chips: c.id === serverTip ? [name] : [], only: both && !Object.hasOwn(repo?.commits ?? {}, c.id) }))

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
        <span className="sv-link" aria-hidden="true">
          ⇄
        </span>
        <Side kind="server" title="Server" sub={name} rows={serverRows} empty={Object.keys(remote.branches).length ? `No ${name} branch` : 'Empty'} />
      </div>
      <figcaption>{caption}</figcaption>
    </figure>
  )
}
