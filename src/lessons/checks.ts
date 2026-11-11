import type { World } from '../engine/types'
import { resolvePath } from '../engine/paths'
import { tokenize } from '../engine/tokenize'
import { activeRepo, getStatus, headTree } from '../engine/git/repoState'
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
