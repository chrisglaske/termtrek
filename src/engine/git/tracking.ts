import type { Repo, Upstream } from '../types';
import { ancestors, aheadBehind } from './refs';

const has = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

export interface TrackingSummary { upstream: string; ahead: number; behind: number; gone: boolean }

/** How a local branch compares with the last-fetched copy of its upstream, or null when it has none. */
export function trackingSummary(repo: Repo, branch: string): TrackingSummary | null {
  if (!has(repo.upstream, branch)) return null;
  const up = repo.upstream[branch]!;
  const name = `${up.remote}/${up.branch}`;
  const remoteTip = has(repo.remoteRefs, name) ? repo.remoteRefs[name]! : null;
  if (remoteTip === null) return { upstream: name, ahead: 0, behind: 0, gone: true };
  const tip = has(repo.branches, branch) ? repo.branches[branch] : null;
  if (!tip) return { upstream: name, ahead: 0, behind: ancestors(repo, remoteTip).size, gone: false };
  return { upstream: name, ...aheadBehind(repo, tip, remoteTip), gone: false };
}

export function setUpstream(repo: Repo, branch: string, up: Upstream): Repo {
  return { ...repo, upstream: { ...repo.upstream, [branch]: { remote: up.remote, branch: up.branch } } };
}

export const TRACK_LINE = (branch: string, up: Upstream): string => `branch '${branch}' set up to track '${up.remote}/${up.branch}'.`;

/** Split `origin/feature` into a remote and branch using the remote-tracking refs the repo knows. */
export function parseRemoteRef(repo: Repo, ref: string): Upstream | null {
  const name = ref.replace(/^(?:refs\/)?remotes\//, '');
  if (!has(repo.remoteRefs, name)) return null;
  const i = name.indexOf('/');
  return { remote: name.slice(0, i), branch: name.slice(i + 1) };
}

/** The remote branch a plain `git switch <name>` would start tracking, or null. */
export function guessRemoteBranch(repo: Repo, name: string): Upstream | null {
  const hits = Object.keys(repo.remoteRefs)
    .filter((k) => k.slice(k.indexOf('/') + 1) === name && has(repo.remotes, k.slice(0, k.indexOf('/'))))
    .sort((a, b) => Number(b.startsWith('origin/')) - Number(a.startsWith('origin/')) || (a < b ? -1 : 1));
  return hits.length ? parseRemoteRef(repo, hits[0]!) : null;
}
