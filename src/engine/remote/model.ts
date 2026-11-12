import type { Activity, Commit, Remote, RemoteSetup } from '../types';
import { shortId } from '../hash';
import { remoteUrl } from './host';

const DEFAULT_AUTHOR = { name: 'Alex Kim', email: 'alex@example.com' };

export function createRemote(setup: RemoteSetup, seq: number): { remote: Remote; seq: number } {
  const author = setup.author ?? DEFAULT_AUTHOR;
  const commits: Record<string, Commit> = {};
  let tree: Record<string, string> = {};
  let parent: string | null = null;
  for (const c of setup.commits ?? []) {
    tree = { ...tree, ...c.files };
    seq += 1;
    const parents = parent ? [parent] : [];
    const id = shortId(`remote,${parents.join(',')}${JSON.stringify(tree)}${c.message}${seq}`);
    commits[id] = { id, parents, tree: { ...tree }, message: c.message, author: { ...author }, time: seq };
    parent = id;
  }
  const remote: Remote = {
    url: remoteUrl(setup.slug),
    slug: setup.slug,
    commits,
    branches: parent ? { main: parent } : {},
    defaultBranch: 'main',
    prs: [],
    activity: [],
  };
  return { remote, seq };
}

/** Copy `tip` and every ancestor from `from` into a copy of `to`. */
export function copyReachable(from: Record<string, Commit>, to: Record<string, Commit>, tip: string): Record<string, Commit> {
  const out = { ...to };
  const stack = [tip];
  while (stack.length) {
    const id = stack.pop()!;
    const commit = from[id];
    if (!commit || out[id] === commit) continue;
    out[id] = commit;
    stack.push(...commit.parents);
  }
  return out;
}

export function addActivity(remote: Remote, who: Activity['who'], text: string, seq: number): Remote {
  return { ...remote, activity: [...remote.activity, { seq, who, text }] };
}
