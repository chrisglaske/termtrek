import type { Repo } from '../types';
import { headCommitId } from './repoState';

/** Every commit reachable from `id` through parents, including `id` itself. */
export function ancestors(repo: Repo, id: string): Set<string> {
  const seen = new Set<string>();
  const stack = [id];
  while (stack.length) {
    const cur = stack.pop()!;
    if (seen.has(cur)) continue;
    const commit = repo.commits[cur];
    if (!commit) continue;
    seen.add(cur);
    stack.push(...commit.parents);
  }
  return seen;
}

/** True when `a` is reachable from `b`. */
export function isAncestor(repo: Repo, a: string, b: string): boolean {
  return ancestors(repo, b).has(a);
}

/** The common ancestor with the highest time (ties go to the smaller id), or null. */
export function mergeBase(repo: Repo, a: string, b: string): string | null {
  const other = ancestors(repo, b);
  let best: string | null = null;
  for (const id of ancestors(repo, a)) {
    if (!other.has(id)) continue;
    if (best === null) best = id;
    else {
      const t = repo.commits[id]!.time;
      const bt = repo.commits[best]!.time;
      if (t > bt || (t === bt && id < best)) best = id;
    }
  }
  return best;
}

export function reachableFromRefs(repo: Repo): Set<string> {
  const out = new Set<string>();
  const tips = Object.values(repo.branches).filter((t): t is string => t !== null);
  const head = headCommitId(repo);
  if (head) tips.push(head);
  tips.push(...Object.values(repo.remoteRefs));
  for (const tip of tips) for (const id of ancestors(repo, tip)) out.add(id);
  return out;
}

export function logRef(repo: Repo, id: string, message: string): Repo {
  return { ...repo, reflog: [{ id, message }, ...repo.reflog] };
}

export function branchOf(repo: Repo): string | null {
  return repo.head.kind === 'branch' ? repo.head.name : null;
}

/** Commits reachable from `a` but not `b` (ahead), and the reverse (behind). */
export function aheadBehind(repo: Repo, a: string, b: string): { ahead: number; behind: number } {
  const sa = ancestors(repo, a);
  const sb = ancestors(repo, b);
  let ahead = 0;
  let behind = 0;
  for (const id of sa) if (!sb.has(id)) ahead += 1;
  for (const id of sb) if (!sa.has(id)) behind += 1;
  return { ahead, behind };
}
