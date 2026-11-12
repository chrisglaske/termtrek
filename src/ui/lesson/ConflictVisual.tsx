import type { World } from '../../engine/types'
import { treeFile } from '../../lessons/checks'

/** Lines one text has that the other does not, in order. */
const only = (a: string, b: string): string[] => {
  const other = new Set(b.split('\n'))
  return a.split('\n').filter((l) => l.trim() !== '' && !other.has(l))
}

/**
 * The two versions of the lines that clash in `file`, side by side, from the live world:
 * the branch you are on (current) against `theirs` (incoming). The words match the editor's Keep buttons.
 */
export function ConflictVisual({ world, file, theirs, markers }: { world: World; file: string; theirs: string; markers?: boolean }): React.JSX.Element | null {
  const repo = world.repo
  const ours = treeFile(world, 'HEAD', file)
  const incoming = treeFile(world, theirs, file)
  if (!repo || ours === undefined || incoming === undefined) return null
  const mine = only(ours, incoming)
  const their = only(incoming, ours)
  if (mine.length === 0 && their.length === 0) return null
  const here = repo.head.kind === 'branch' ? repo.head.name : 'HEAD'
  if (markers) {
    const raw = ['<<<<<<< HEAD', ...mine, '=======', ...their, '>>>>>>> ' + theirs].join('\n')
    return (
      <figure className="pf-conflict">
        <pre className="cv-raw" aria-label={`${file} with conflict markers`}>
          {raw}
        </pre>
        <figcaption>
          What Git wrote into <code>{file}</code>
        </figcaption>
      </figure>
    )
  }
  const side = (kind: 'cur' | 'inc', label: string, branch: string, lines: string[]) => (
    <section className={`cv-side cv-${kind}`} aria-label={`${label}, ${branch}`}>
      <h3>
        {label} <code>{branch}</code>
      </h3>
      {lines.map((l, i) => (
        <p key={i}>{l}</p>
      ))}
    </section>
  )
  return (
    <figure className="pf-conflict">
      <div className="cv-sides">
        {side('cur', 'Current', here, mine)}
        {side('inc', 'Incoming', theirs, their)}
      </div>
      <figcaption>
        The same line in <code>{file}</code>, changed two ways
      </figcaption>
    </figure>
  )
}
