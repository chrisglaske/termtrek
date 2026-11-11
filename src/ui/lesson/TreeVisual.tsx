import type { World } from '../../engine/types'

interface Row {
  key: string
  name: string
  dir: boolean
  depth: number
  here: boolean
}

const HOME_LABEL = (): string => '~ home'

/** The folders and files under home, with a marker on the folder the learner is in. */
function rows(world: World): Row[] {
  const out: Row[] = []
  const walk = (dir: string, depth: number): void => {
    const prefix = dir + '/'
    const dirs = [...world.dirs].filter((d) => d.startsWith(prefix) && !d.slice(prefix.length).includes('/')).sort()
    const files = Object.keys(world.files)
      .filter((f) => f.startsWith(prefix) && !f.slice(prefix.length).includes('/'))
      .sort()
    for (const d of dirs) {
      out.push({ key: d, name: d.slice(prefix.length), dir: true, depth, here: d === world.cwd })
      walk(d, depth + 1)
    }
    for (const f of files) out.push({ key: f, name: f.slice(prefix.length), dir: false, depth, here: false })
  }
  out.push({ key: world.home, name: HOME_LABEL(), dir: true, depth: 0, here: world.cwd === world.home })
  walk(world.home, 1)
  return out
}

/** A quiet folder tree read from the real world, so it updates as the learner makes things. */
export function TreeVisual({ world }: { world: World }): React.JSX.Element {
  const list = rows(world)
  const here = list.find((r) => r.here)
  return (
    <figure className="pf-tree" aria-label={`Your folders and files. You are in ${here?.name ?? 'home'}.`}>
      <ul>
        {list.map((r) => (
          <li key={r.key} className={r.here ? 'pf-tree-here' : undefined} style={{ paddingLeft: `${r.depth * 18}px` }}>
            <span className="pf-tree-i" aria-hidden="true">
              {r.dir ? '▸' : '·'}
            </span>
            <span className={r.dir ? 'pf-tree-dir' : 'pf-tree-file'}>{r.name}{r.dir && !r.name.startsWith('~ ') ? '/' : ''}</span>
            {r.here && <span className="pf-tree-tag">you are here</span>}
          </li>
        ))}
      </ul>
    </figure>
  )
}
