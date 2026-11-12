import type { OutLine, Repo } from '../types';
import { err } from '../shell/fs';
import { headCommitId } from './repoState';

function has(obj: object, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(obj, key);
}

function base(repo: Repo, name: string): string | null {
  if (name === 'HEAD' || name === '@') return headCommitId(repo);
  const up = /^(.*)@\{(?:u|upstream)\}$/.exec(name);
  if (up) {
    const branch = up[1] === '' || up[1] === 'HEAD' ? (repo.head.kind === 'branch' ? repo.head.name : null) : up[1]!;
    const target = branch !== null && has(repo.upstream, branch) ? repo.upstream[branch] : undefined;
    return target ? (repo.remoteRefs[`${target.remote}/${target.branch}`] ?? null) : null;
  }
  if (has(repo.branches, name)) return repo.branches[name] ?? null;
  const remoteName = name.replace(/^(?:refs\/)?remotes\//, '');
  if (has(repo.remoteRefs, remoteName)) return repo.remoteRefs[remoteName] ?? null;
  if (name === 'origin' && repo.originHead !== null) return repo.remoteRefs[`origin/${repo.originHead}`] ?? null;
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

/** Git's refusal for `@{u}` on a branch that tracks nothing, or null when `spec` isn't an upstream spec in that state. */
export function noUpstream(repo: Repo, spec: string): string | null {
  const m = /^(.*?)@\{(?:u|upstream)\}/.exec(spec);
  if (!m) return null;
  const branch = m[1] === '' || m[1] === 'HEAD' ? (repo.head.kind === 'branch' ? repo.head.name : null) : m[1]!;
  if (branch === null) return "fatal: HEAD does not point to a branch";
  if (!has(repo.branches, branch) || has(repo.upstream, branch)) return null;
  return `fatal: no upstream configured for branch '${branch}'`;
}

/** The refusal lines for a revision that did not resolve, with Git's own wording for a missing upstream. */
export function unresolved(repo: Repo, spec: string): OutLine[] {
  const none = noUpstream(repo, spec);
  return none ? [err(none)] : badRevision(spec);
}
