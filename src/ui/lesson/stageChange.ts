import type { World } from '../../engine/types'
import { getStatus, ignorePatterns, workingFiles } from '../../engine/git/repoState'
import { isIgnored } from '../../engine/git/ignore'
import { savedCommits } from '../repomap/RepoMap'

type Kind = 'new' | 'modified' | 'deleted'

/** What the three boxes hold right now, boiled down so two moments can be compared. */
export interface StageSnap {
  changed: Record<string, Kind>
  staged: Record<string, Kind>
  saved: string[]
  shelf: number
  ignored: string[]
  /** The branch you are on (null when detached), so a switch is not mistaken for a save. */
  branch: string | null
}

export interface StageChange {
  /** One plain sentence saying what the last command did to the boxes. */
  caption: string
  /** True when something really moved into Staged or Saved (the ring may follow it). */
  advanced: boolean
  tone: 'ok' | 'warn'
}

export function snapStage(world: World): StageSnap {
  const status = getStatus(world)
  const repo = world.repo
  const changed: Record<string, Kind> = {}
  const staged: Record<string, Kind> = {}
  if (status) {
    for (const c of status.unstaged) changed[c.path] = c.kind
    for (const p of status.untracked) changed[p] = 'new'
    for (const c of status.staged) staged[c.path] = c.kind
  }
  let ignored: string[] = []
  if (repo) {
    const patterns = ignorePatterns(world, repo)
    ignored = Object.keys(workingFiles(world, repo))
      .filter((p) => !(p in repo.index) && isIgnored(patterns, p))
      .sort()
  }
  return { changed, staged, saved: repo ? savedCommits(repo).map((c) => c.id) : [], shelf: repo ? repo.stash.length : 0, ignored, branch: status ? status.branch : null }
}

const list = (ps: string[]): string => (ps.length <= 2 ? ps.join(' and ') : `${ps[0]} and ${ps.length - 1} more`)
const files = (n: number): string => (n === 1 ? '1 file' : `${n} files`)

/** Compare two moments and say, in one sentence, what the command changed. Null when nothing visible changed. */
export function diffStage(a: StageSnap, b: StageSnap): StageChange | null {
  const keys = (o: Record<string, Kind>): string[] => Object.keys(o)
  const intoStaged = keys(b.staged).filter((p) => !(p in a.staged) || a.staged[p] !== b.staged[p])
  const left = keys(a.staged).filter((p) => !(p in b.staged) || a.staged[p] !== b.staged[p])
  if (a.branch !== b.branch) {
    return { caption: `Switched to ${b.branch ?? 'an older save'}. The boxes now show what is there.`, advanced: false, tone: 'ok' }
  }
  const newSaves = b.saved.filter((id) => !a.saved.includes(id))

  if (newSaves.length && a.saved.some((id) => !b.saved.includes(id))) {
    const n = left.length
    return {
      caption: `Your last save was replaced by ${(newSaves[0] ?? '').slice(0, 7)}${n > 0 ? `: it now includes ${files(n)} more` : ''}. The old one is gone from the list.`,
      advanced: true,
      tone: 'ok',
    }
  }
  if (newSaves.length) {
    const n = left.length
    const what = n > 0 ? `${files(n)} saved` : 'Saved'
    return { caption: `${what} as ${(newSaves[0] ?? '').slice(0, 7)}, the id Git just printed.`, advanced: true, tone: 'ok' }
  }
  if (b.shelf > a.shelf) {
    const gone = keys(a.changed).filter((p) => !(p in b.changed))
    return { caption: `${gone.length ? list(gone) : 'Your changes'} put on the shelf. The Folder is clean again.`, advanced: false, tone: 'ok' }
  }
  if (b.shelf < a.shelf) {
    const back = keys(b.changed).filter((p) => !(p in a.changed))
    return { caption: `${back.length ? list(back) : 'Your changes'} came back off the shelf into the Folder.`, advanced: false, tone: 'ok' }
  }
  if (intoStaged.length) {
    return { caption: `${list(intoStaged)} moved from Folder to Staged.`, advanced: true, tone: 'ok' }
  }
  const back = left.filter((p) => p in b.changed)
  if (back.length) return { caption: `${list(back)} moved back from Staged to the Folder.`, advanced: false, tone: 'ok' }
  const thrown = keys(a.changed).filter((p) => !(p in b.changed) && !(p in b.staged))
  if (thrown.length && b.ignored.length === a.ignored.length) {
    return { caption: `The change to ${list(thrown)} was thrown away. It cannot come back.`, advanced: false, tone: 'warn' }
  }
  const nowIgnored = b.ignored.filter((p) => !a.ignored.includes(p))
  if (nowIgnored.length) return { caption: `${list(nowIgnored)} ${nowIgnored.length === 1 ? 'is' : 'are'} now ignored: Git stops listing ${nowIgnored.length === 1 ? 'it' : 'them'}.`, advanced: false, tone: 'ok' }
  const fresh = keys(b.changed).filter((p) => !(p in a.changed) || a.changed[p] !== b.changed[p])
  if (fresh.length) {
    const one = fresh[0] ?? ''
    const what = b.changed[one] === 'new' ? 'is a new file' : b.changed[one] === 'deleted' ? 'was deleted' : 'has changed'
    const verb = fresh.length === 1 ? what : 'have changed'
    return { caption: `${list(fresh)} ${verb} in the Folder. Git has not saved ${fresh.length === 1 ? 'it' : 'them'} yet.`, advanced: false, tone: 'ok' }
  }
  return null
}
