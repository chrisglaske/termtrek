/** One block of Git's conflict markers. `start`, `mid` and `end` are the line indices of the three markers. */
export interface Conflict {
  start: number
  mid: number
  end: number
  ours: string[]
  theirs: string[]
  oursLabel: string
  theirsLabel: string
}

const isMarker = (line: string, mark: string) => line === mark || line.startsWith(`${mark} `)

export function findConflicts(text: string): Conflict[] {
  const lines = text.split('\n')
  const found: Conflict[] = []
  let start = -1
  let mid = -1
  lines.forEach((line, i) => {
    if (isMarker(line, '<<<<<<<')) {
      start = i
      mid = -1
    } else if (line === '=======' && start >= 0 && mid < 0) {
      mid = i
    } else if (isMarker(line, '>>>>>>>') && start >= 0 && mid >= 0) {
      found.push({
        start,
        mid,
        end: i,
        ours: lines.slice(start + 1, mid),
        theirs: lines.slice(mid + 1, i),
        oursLabel: (lines[start] ?? '').slice(8).trim(),
        theirsLabel: line.slice(8).trim(),
      })
      start = -1
      mid = -1
    }
  })
  return found
}

/** Replaces conflict `i` with one side or both, the way VS Code's buttons do. */
export function resolveConflict(text: string, i: number, choice: 'current' | 'incoming' | 'both'): string {
  const c = findConflicts(text)[i]
  if (!c) return text
  const keep = choice === 'current' ? c.ours : choice === 'incoming' ? c.theirs : [...c.ours, ...c.theirs]
  const lines = text.split('\n')
  lines.splice(c.start, c.end - c.start + 1, ...keep)
  return lines.join('\n')
}
