import type { World } from '../../engine/types'
import { hasMarkers, treeFile, workFile } from '../../lessons/checks'

/** Lines one text has that the other does not, in order. */
const only = (a: string, b: string): string[] => {
  const other = new Set(b.split('\n'))
  return a.split('\n').filter((l) => l.trim() !== '' && !other.has(l))
}

/** The first conflicted block in a file's text, from the opening marker to the closing one. */
function conflictBlock(text: string | undefined): string | null {
  if (text === undefined) return null
  const lines = text.split('\n')
  const start = lines.findIndex((l) => l.startsWith('<<<<<<<'))
  const end = lines.findIndex((l, i) => i > start && l.startsWith('>>>>>>>'))
  return start >= 0 && end > start ? lines.slice(start, end + 1).join('\n') : null
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
    // The block Git really wrote, so the labels match the editor (a rebase labels its side with the replayed commit).
    const written = conflictBlock(workFile(world, file))
    const raw = written ?? ['<<<<<<< HEAD', ...mine, '=======', ...their, '>>>>>>> ' + theirs].join('\n')
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
  // Once the saved file has no markers left, show which side(s) it kept.
  const saved = workFile(world, file)
  const settled = saved !== undefined && !hasMarkers(saved)
  const has = (lines: string[]) => lines.length > 0 && lines.every((l) => saved!.split('\n').includes(l))
  const kept = { cur: settled && has(mine), inc: settled && has(their) }
  const anyKept = kept.cur || kept.inc
  const side = (kind: 'cur' | 'inc', label: string, branch: string, lines: string[]) => (
    <section className={`cv-side cv-${kind}${anyKept ? (kept[kind] ? ' cv-kept' : ' cv-dim') : ''}`} aria-label={`${label}, ${branch}`}>
      <h3>
        {label} <code>{branch}</code>
        {kept[kind] && <span className="cv-tag">Kept</span>}
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
