import type { OutLine, Repo } from '../types';
import { err } from '../shell/fs';
import { headCommitId } from './repoState';

function base(repo: Repo, name: string): string | null {
  if (name === 'HEAD' || name === '@') return headCommitId(repo);
  if (Object.prototype.hasOwnProperty.call(repo.branches, name)) return repo.branches[name] ?? null;
  if (/^[0-9a-f]{4,}$/.test(name)) {
    const hits = Object.keys(repo.commits).filter((id) => id.startsWith(name));
    return hits.length === 1 ? hits[0]! : null;
  }
  return null;
}

/** Resolve a revision spec to a commit id, or null when it can't be resolved. */
export function resolveRev(repo: Repo, spec: string): string | null {
  const reflog = /^(HEAD|)@\{(\d+)\}$/.exec(spec);
  if (reflog) return repo.reflog[Number(reflog[2])]?.id ?? null;
  const m = /^([^~^]+)((?:[~^]\d*)*)$/.exec(spec);
  if (!m) return null;
  let id = base(repo, m[1]!);
  for (const [, op, digits] of m[2]!.matchAll(/([~^])(\d*)/g)) {
    if (id === null) return null;
    const commit = repo.commits[id];
    if (!commit) return null;
    if (op === '^') {
      const n = digits === '' ? 1 : Number(digits);
      id = n === 0 ? id : (commit.parents[n - 1] ?? null);
    } else {
      const n = digits === '' ? 1 : Number(digits);
      for (let i = 0; i < n && id !== null; i++) id = repo.commits[id]?.parents[0] ?? null;
    }
  }
  return id;
}

export function badRevision(spec: string): OutLine[] {
  return [
    err(`fatal: ambiguous argument '${spec}': unknown revision or path not in the working tree.`),
    [{ text: "Use '--' to separate paths from revisions, like this:" }],
    [{ text: "'git <command> [<revision>...] -- [<file>...]'" }],
  ];
}
