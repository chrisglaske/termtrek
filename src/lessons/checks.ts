import type { World } from '../engine/types'
import { resolvePath } from '../engine/paths'
import { tokenize } from '../engine/tokenize'
import { activeRepo, getStatus, headCommitId, headTree } from '../engine/git/repoState'
import { resolveRev } from '../engine/git/rev'
import type { StepContext } from './schema'

/** True when a repo exists and the current directory is inside it. `rel` is the expected repo root, relative to home. */
export const inRepo = (w: World, rel?: string): boolean => {
  const repo = activeRepo(w)
  if (!repo) return false
  return rel === undefined || repo.root === resolvePath({ ...w, cwd: w.home }, rel)
}

/** `rel` is relative to the repo root; true when the file is in the HEAD tree. */
export const isTracked = (w: World, rel: string): boolean => (w.repo ? rel in headTree(w.repo) : false)

/** True when the index differs from the HEAD tree for `rel` (including a new file in an unborn repo). */
export const isStaged = (w: World, rel: string): boolean => {
  if (!w.repo) return false
  return w.repo.index[rel] !== headTree(w.repo)[rel]
}

export const isClean = (w: World): boolean => {
  const s = getStatus(w)
  return !!s && s.staged.length === 0 && s.unstaged.length === 0 && s.untracked.length === 0
}

export const commitCount = (w: World): number => (w.repo ? Object.keys(w.repo.commits).length : 0)

/** The message of the commit HEAD points at, or null before the first commit. */
export const headMessage = (w: World): string | null => {
  const id = w.repo ? headCommitId(w.repo) : null
  return (id && w.repo?.commits[id]?.message) ?? null
}

/** How many commits `ref` reaches by following first parents (0 when it doesn't resolve). */
export function historyLength(w: World, ref = 'HEAD'): number {
  const repo = w.repo
  if (!repo) return 0
  let n = 0
  for (let id = resolveRev(repo, ref); id; id = repo.commits[id]?.parents[0] ?? null) n += 1
  return n
}

/** `rel` is relative to the repo root; the file's text in the working folder. */
export const workFile = (w: World, rel: string): string | undefined => (w.repo ? w.files[`${w.repo.root}/${rel}`] : undefined)

/** `rel` is relative to the repo root; the file's text in the commit `ref` names. */
export function treeFile(w: World, ref: string, rel: string): string | undefined {
  const id = w.repo ? resolveRev(w.repo, ref) : null
  return id ? w.repo?.commits[id]?.tree[rel] : undefined
}

export const onBranch = (w: World, name: string): boolean => w.repo?.head.kind === 'branch' && w.repo.head.name === name

export const branchExists = (w: World, name: string): boolean => !!w.repo && Object.hasOwn(w.repo.branches, name)

/** True when the text still has a line that starts with a conflict marker. */
export const hasMarkers = (text: string): boolean => /^(<{7}|={7}|>{7})( |$)/m.test(text)

export const mergeInProgress = (w: World): boolean => w.repo?.op?.kind === 'merge'

/** The number of parents of the HEAD commit: 2 for a merge commit, 0 for the first commit or none. */
export const parentCount = (w: World): number => {
  const id = w.repo ? headCommitId(w.repo) : null
  return (id && w.repo?.commits[id]?.parents.length) || 0
}

export const hasIdentity = (w: World): boolean => !!w.config['user.name'] && !!w.config['user.email']

/** The words of each `&&`- or `;`-separated command in a line; empty when the line doesn't parse. */
export function segmentsOf(line: string): string[][] {
  const t = tokenize(line)
  if (!t.ok) return []
  let seg: string[] = []
  const segments: string[][] = []
  for (const tok of t.tokens) {
    if (tok.kind === 'op' && (tok.value === '&&' || tok.value === ';')) {
      segments.push(seg)
      seg = []
    } else if (tok.kind === 'word') seg.push(tok.value)
  }
  segments.push(seg)
  return segments
}

/** True when any ran line has a `&&`- or `;`-separated segment that starts with `git <sub>`. */
export const ranGit = (ctx: StepContext, sub: string): boolean =>
  ctx.ran.some((line) => segmentsOf(line).some((s) => s[0] === 'git' && s[1] === sub))

/** True when any ran line has a `&&`- or `;`-separated segment whose first word is `cmd`, e.g. `ls`. */
export const ran = (ctx: StepContext, cmd: string): boolean =>
  ctx.ran.some((line) => segmentsOf(line).some((s) => s[0] === cmd))

const VAGUE = new Set(['update', 'updates', 'changes', 'fix', 'fixes', 'stuff', 'wip', 'misc', 'asdf', 'test'])
const ED_ING_OK = new Set([
  'need', 'seed', 'feed', 'speed', 'embed', 'shred', 'bed', 'red', 'shed', 'proceed', 'exceed', 'succeed',
  'bleed', 'breed', 'bring', 'string', 'ping', 'ring', 'sing', 'spring', 'sting', 'swing', 'cling', 'thing',
])

export function messageQuality(msg: string): { ok: true } | { ok: false; reason: string } {
  const trimmed = msg.trim()
  if (!trimmed) return { ok: false, reason: 'Add a message that says what changed.' }
  const summary = (trimmed.split('\n')[0] ?? '').trim()
  if (summary.length > 72) return { ok: false, reason: 'Keep the first line under 72 characters.' }
  if (VAGUE.has(summary.toLowerCase().replace(/\.$/, ''))) {
    return { ok: false, reason: 'Say what changed, like `Add meeting notes`.' }
  }
  const first = (summary.split(/\s+/)[0] ?? '').toLowerCase().replace(/[^a-z]+$/, '')
  if ((first.endsWith('ed') || first.endsWith('ing')) && !ED_ING_OK.has(first)) {
    return { ok: false, reason: 'Write it as a command: `Add`, not `Added`.' }
  }
  return { ok: true }
}
