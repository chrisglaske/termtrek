import { useRef } from 'react'
import type { World } from '../../engine/types'
import { getConfig } from '../../engine/git/config'

/** Who Git will sign your commits as: the name and email Git has stored, filling in as the learner sets them. */
export function IdentityVisual({ world }: { world: World }): React.JSX.Element {
  const name = getConfig(world, 'user.name')
  const email = getConfig(world, 'user.email')
  const seen = useRef({ name, email, note: null as string | null })
  if (seen.current.name !== name || seen.current.email !== email) {
    seen.current = {
      name,
      email,
      note: name !== seen.current.name ? 'Git saved your name.' : 'Git saved your email.',
    }
  }
  const { note } = seen.current
  return (
    <>
      <figure className="pf-ident" aria-label="Your Git identity">
        <p className="pf-ident-k">Your commits will say</p>
        <dl>
          <div className={name ? 'pf-ident-set' : undefined} key={`n-${name ?? ''}`}>
            <dt>Name</dt>
            <dd>{name ?? <i>not set yet</i>}</dd>
          </div>
          <div className={email ? 'pf-ident-set' : undefined} key={`e-${email ?? ''}`}>
            <dt>Email</dt>
            <dd>{email ?? <i>not set yet</i>}</dd>
          </div>
        </dl>
      </figure>
      {note && (
        <p className="pf-tree-note" role="status" key={`${name}|${email}`}>
          {note}
        </p>
      )}
    </>
  )
}
