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

/** The names a plain `ls` (or `ls -a`) just printed: the direct children of the current folder, or null if the last command was not one. */
function listedBy(world: World, last: string | undefined): Set<string> | null {
  const m = last?.trim().match(/^ls((?:\s+-[a-zA-Z]+)*)$/)
  if (!m) return null
  const all = /a/.test(m[1] ?? '')
  const prefix = world.cwd + '/'
  const direct = (p: string): boolean => p.startsWith(prefix) && !p.slice(prefix.length).includes('/')
  const keys = [...world.dirs, ...Object.keys(world.files)].filter((p) => direct(p) && (all || !p.slice(prefix.length).startsWith('.')))
  return new Set(keys)
}

/** A quiet folder tree read from the real world, so it updates as the learner makes things. */
/** `last` is the line the learner just ran; after `ls` the tree marks what `ls` listed and dims the rest. */
export function TreeVisual({ world, last }: { world: World; last?: string }): React.JSX.Element {
  const list = rows(world)
  const here = list.find((r) => r.here)
  const listed = listedBy(world, last)
  return (
    <figure className={listed ? 'pf-tree pf-tree-ls' : 'pf-tree'} aria-label={`Your folders and files. You are in ${here?.name ?? 'home'}.${listed ? ` The command ls listed ${listed.size === 1 ? '1 item' : `${listed.size} items`}, the ones directly inside it.` : ''}`}>
      <ul>
        {list.map((r) => {
          const hit = listed?.has(r.key) ?? false
          const cls = [r.here ? 'pf-tree-here' : '', hit ? 'pf-tree-hit' : '', listed && !hit && !r.here ? 'pf-tree-dim' : ''].filter(Boolean).join(' ')
          return (
          <li key={r.key} className={cls || undefined} style={{ paddingLeft: `${r.depth * 18 + 8}px` }}>
            <span className="pf-tree-i" aria-hidden="true">
              {r.dir ? '▸' : '·'}
            </span>
            <span className={r.dir ? 'pf-tree-dir' : 'pf-tree-file'}>{r.name}{r.dir && !r.name.startsWith('~ ') ? '/' : ''}</span>
            {r.here && <span className="pf-tree-tag">you are here</span>}
            {hit && <span className="pf-tree-tag pf-tree-ls-tag">ls shows this</span>}
          </li>
          )
        })}
      </ul>
    </figure>
  )
}
