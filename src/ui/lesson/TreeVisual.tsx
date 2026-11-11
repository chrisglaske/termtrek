import { useRef } from 'react'
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
      out.push({
        key: d,
        name: d.slice(prefix.length),
        dir: true,
        depth,
        here: d === world.cwd,
      })
      walk(d, depth + 1)
    }
    for (const f of files)
      out.push({
        key: f,
        name: f.slice(prefix.length),
        dir: false,
        depth,
        here: false,
      })
  }
  out.push({
    key: world.home,
    name: HOME_LABEL(),
    dir: true,
    depth: 0,
    here: world.cwd === world.home,
  })
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

/** The file `cat` just printed, as a world path, or null. */
function catFile(world: World, last: string | undefined): string | null {
  const m = last?.trim().match(/^cat\s+(\S+)$/)
  if (!m?.[1]) return null
  const arg = m[1]
  const abs = arg.startsWith('/') ? arg : arg.startsWith('~/') ? world.home + arg.slice(1) : `${world.cwd}/${arg.replace(/^\.\//, '')}`
  return abs in world.files ? abs : null
}

const leaf = (p: string): string => p.slice(p.lastIndexOf('/') + 1)

interface Seen {
  sig: string
  cwd: string
  fresh: Set<string>
  gone: string[]
  moved: string | null
}

/** A quiet folder tree read from the real world, so it updates as the learner makes things. */
/** `last` is the line the learner just ran; after `ls` the tree marks what `ls` listed and dims the rest. */
export function TreeVisual({ world, last }: { world: World; last?: string }): React.JSX.Element {
  const list = rows(world)
  const here = list.find((r) => r.here)
  const listed = listedBy(world, last)
  const catted = catFile(world, last)
  const pwd = last?.trim() === 'pwd'
  // Compare with the moment before: what is new, what went, and where you moved.
  const seen = useRef<Seen | null>(null)
  const paths = [...world.dirs, ...Object.keys(world.files)].filter((x) => x.startsWith(world.home + '/'))
  const sig = paths.join('|') + '#' + world.cwd + '#' + (last ?? '')
  if (!seen.current)
    seen.current = {
      sig,
      cwd: world.cwd,
      fresh: new Set(),
      gone: [],
      moved: null,
    }
  else if (seen.current.sig !== sig) {
    const before = new Set(seen.current.sig.split('#')[0]?.split('|') ?? [])
    const now = new Set(paths)
    seen.current = {
      sig,
      cwd: world.cwd,
      fresh: new Set(paths.filter((x) => !before.has(x))),
      gone: [...before].filter((x) => x && !now.has(x)).map(leaf),
      moved: seen.current.cwd !== world.cwd ? leaf(world.cwd) : null,
    }
  }
  const { fresh, gone, moved } = seen.current
  const ancestors = (key: string): boolean => pwd && (world.cwd === key || world.cwd.startsWith(key + '/'))
  const note = fresh.size
    ? `${[...fresh].map(leaf).join(', ')} ${fresh.size === 1 ? 'was' : 'were'} just made.`
    : gone.length
      ? `${gone.join(', ')} ${gone.length === 1 ? 'was' : 'were'} removed.`
      : moved
        ? `You moved into ${moved}.`
        : null
  return (
    <>
      <figure
        className={listed ? 'pf-tree pf-tree-ls' : 'pf-tree'}
        aria-label={`Your folders and files. You are in ${here?.name ?? 'home'}.${listed ? ` The command ls listed ${listed.size === 1 ? '1 item' : `${listed.size} items`}, the ones directly inside it.` : ''}`}
      >
        <ul>
          {list.map((r) => {
            const hit = (listed?.has(r.key) ?? false) || r.key === catted || ancestors(r.key)
            const isNew = fresh.has(r.key)
            const cls = [r.here ? 'pf-tree-here' : '', isNew ? 'pf-tree-fresh' : '', hit ? 'pf-tree-hit' : '', listed && !hit && !r.here ? 'pf-tree-dim' : '']
              .filter(Boolean)
              .join(' ')
            return (
              <li key={r.key} className={cls || undefined} style={{ paddingLeft: `${r.depth * 18 + 8}px` }}>
                <span className="pf-tree-i" aria-hidden="true">
                  {r.dir ? '▸' : '·'}
                </span>
                <span className={r.dir ? 'pf-tree-dir' : 'pf-tree-file'}>
                  {r.name}
                  {r.dir && !r.name.startsWith('~ ') ? '/' : ''}
                </span>
                {r.here && <span className="pf-tree-tag">you are here</span>}
                {isNew && <span className="pf-tree-tag pf-tree-new-tag">new</span>}
                {r.key === catted && <span className="pf-tree-tag pf-tree-ls-tag">cat shows this file</span>}
                {pwd && r.here && <span className="pf-tree-tag pf-tree-ls-tag">pwd prints this path</span>}
                {listed && hit && <span className="pf-tree-tag pf-tree-ls-tag">ls shows this</span>}
              </li>
            )
          })}
        </ul>
      </figure>
      {note && (
        <p className="pf-tree-note" role="status" key={sig}>
          {note}
        </p>
      )}
    </>
  )
}
