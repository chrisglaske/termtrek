import type { World } from '../../engine/types'
import { prCommits, prFiles } from '../../engine/remote/pr'

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`

const SAID = { approve: 'approved it', changes: 'asked for changes', comment: 'commented' } as const

/** The newest pull request on the server as a small read-only card: title, branches, size and the latest review, from the live world. */
export function PrVisual({ world }: { world: World }): React.JSX.Element | null {
  const remote = world.remote
  const pr = remote?.prs.reduce<(typeof remote.prs)[number] | undefined>((a, p) => (!a || p.number > a.number ? p : a), undefined)
  if (!remote || !pr) return null
  const commits = prCommits(remote, pr).length
  const files = prFiles(remote, pr).length
  const review = pr.comments.at(-1)
  return (
    <figure className="pf-pr">
      <section className="prv-card" aria-label={`Pull request #${pr.number}: ${pr.title}`}>
        <h3>
          {pr.title} <span className="prv-n">#{pr.number}</span>
          <span className={pr.state === 'open' ? 'prv-state' : 'prv-state prv-merged'}>{pr.state === 'open' ? 'Open' : 'Merged'}</span>
        </h3>
        <p className="prv-row">
          <code>{pr.head}</code> <span aria-hidden="true">→</span>
          <span className="sr-only">into</span> <code>{pr.base}</code>
          <span className="prv-size">
            {plural(commits, 'commit')}, {plural(files, 'file')} changed
          </span>
        </p>
        {review && (
          <p className="prv-review">
            <b>{review.author}</b> {SAID[review.kind]}
            {review.body && <q>{review.body}</q>}
          </p>
        )}
      </section>
      <figcaption>A pull request on the server</figcaption>
    </figure>
  )
}
