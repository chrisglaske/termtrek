import type { CommandFn } from '../registry';
import type { OutLine, Repo, World } from '../types';
import { err, out } from '../shell/fs';
import { fromUrl, findRemote, repoNotFound } from '../remote/host';
import { copyReachable } from '../remote/model';
import { isAncestor } from './refs';
import { activeRepo } from './repoState';

const has = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

export const NO_REMOTE_SPECIFIED = 'fatal: No remote repository specified.  Please, specify either a URL or a remote name from which new revisions should be fetched.';

/** Git's block for a remote name that was never added. */
export function unknownRemote(name: string): OutLine[] {
  return [
    err(`fatal: '${name}' does not appear to be a git repository`),
    err('fatal: Could not read from remote repository.'),
    [{ text: '' }],
    err('Please make sure you have the correct access rights'),
    err('and the repository exists.'),
  ];
}

/** One ` * [new branch]      main       -> origin/main` style row; `summary` is padded like Git (17 wide). */
export const refRow = (flag: string, summary: string, rest: string): OutLine => [{ text: ` ${flag} ${summary.padEnd(17)} ${rest}` }];

type Change = { kind: 'new' | 'ff' | 'forced' | 'deleted'; name: string; remote: string; old?: string; id?: string };

export type FetchResult =
  | { ok: true; world: World; lines: OutLine[]; fetched: number; changed: number }
  | { ok: false; lines: OutLine[]; exitCode: number };

/** Download what the server has that this repo lacks and move `<remote>/*` to match. Never touches branches or files. */
export function fetchInto(world: World, remoteName: string, opts: { prune: boolean }): FetchResult {
  const repo = world.repo;
  if (!repo) return { ok: false, lines: [err('fatal: not a git repository (or any of the parent directories): .git')], exitCode: 128 };
  if (!has(repo.remotes, remoteName)) return { ok: false, lines: unknownRemote(remoteName), exitCode: 128 };
  const url = repo.remotes[remoteName]!;
  const server = findRemote(world, url);
  if (!server) return { ok: false, lines: repoNotFound(url), exitCode: 128 };

  let commits = repo.commits;
  for (const id of Object.values(server.branches)) commits = copyReachable(server.commits, commits, id);
  const fetched = Object.keys(commits).length - Object.keys(repo.commits).length;
  const withCommits: Repo = { ...repo, commits };

  const remoteRefs = { ...repo.remoteRefs };
  const changes: Change[] = [];
  const prefix = remoteName + '/';
  if (opts.prune) {
    for (const ref of Object.keys(repo.remoteRefs).sort()) {
      if (!ref.startsWith(prefix) || has(server.branches, ref.slice(prefix.length))) continue;
      delete remoteRefs[ref];
      changes.push({ kind: 'deleted', name: ref.slice(prefix.length), remote: ref, old: repo.remoteRefs[ref] });
    }
  }
  for (const b of Object.keys(server.branches).sort()) {
    const ref = prefix + b;
    const id = server.branches[b]!;
    const old = has(repo.remoteRefs, ref) ? repo.remoteRefs[ref]! : null;
    if (old === id) continue;
    remoteRefs[ref] = id;
    if (old === null) changes.push({ kind: 'new', name: b, remote: ref, id });
    else changes.push({ kind: isAncestor(withCommits, old, id) ? 'ff' : 'forced', name: b, remote: ref, old, id });
  }

  const next: World = { ...world, repo: { ...withCommits, remoteRefs } };
  if (changes.length === 0) return { ok: true, world: next, lines: [], fetched, changed: 0 };

  const width = Math.max(10, ...changes.map((c) => (c.kind === 'deleted' ? '(none)' : c.name).length));
  const lines: OutLine[] = [out(`From ${fromUrl(url)}`)];
  for (const c of changes) {
    const left = (c.kind === 'deleted' ? '(none)' : c.name).padEnd(width);
    const dest = `${left} -> ${c.remote}`;
    if (c.kind === 'new') lines.push(refRow('*', '[new branch]', dest));
    else if (c.kind === 'deleted') lines.push(refRow('-', '[deleted]', dest));
    else if (c.kind === 'ff') lines.push(refRow(' ', `${c.old}..${c.id}`, dest));
    else lines.push(refRow('+', `${c.old}...${c.id}`, `${dest}  (forced update)`));
  }
  return { ok: true, world: next, lines, fetched, changed: changes.length };
}

const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

export const gitFetch: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let prune = false;
  let all = false;
  const pos: string[] = [];
  for (const a of args) {
    if (a === '--prune' || a === '-p') prune = true;
    else if (a === '--all') all = true;
    else if (a.startsWith('-') && a.length > 1) {
      return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`), err('usage: git fetch [<options>] [<repository> [<refspec>...]]')], exitCode: 129 };
    } else pos.push(a);
  }
  if (all) {
    if (pos.length > 0) return { lines: [err('fatal: fetch --all does not take a repository argument')], exitCode: 129 };
    const names = Object.keys(repo.remotes);
    if (names.length === 0) return { lines: [], world, exitCode: 0 };
    let w = world;
    const lines: OutLine[] = [];
    let changed = 0;
    for (const n of names) {
      lines.push(out(`Fetching ${n}`));
      const r = fetchInto(w, n, { prune });
      if (!r.ok) return { lines: [...lines, ...r.lines], exitCode: r.exitCode };
      w = r.world;
      lines.push(...r.lines);
      changed += r.changed;
    }
    const explain = changed === 0
      ? { kind: 'tip' as const, text: 'Nothing new on any server. What you have matches the last time you checked.' }
      : { kind: 'ok' as const, text: 'Downloaded the news from every server and updated your remote-tracking branches. Your own files and branches did not change.' };
    return { world: w, lines, explain, exitCode: 0 };
  }
  let name = pos[0];
  if (name === undefined) {
    const branch = repo.head.kind === 'branch' ? repo.head.name : null;
    const up = branch && has(repo.upstream, branch) ? repo.upstream[branch]! : null;
    name = up ? up.remote : has(repo.remotes, 'origin') ? 'origin' : undefined;
    if (name === undefined) return { lines: [err(NO_REMOTE_SPECIFIED)], exitCode: 128 };
  } else if (!has(repo.remotes, name) && name.startsWith('https://')) {
    return { lines: repoNotFound(name), exitCode: 128 };
  }
  const r = fetchInto(world, name, { prune });
  if (!r.ok) return { lines: r.lines, exitCode: r.exitCode };
  const explain = r.changed === 0
    ? { kind: 'tip' as const, text: `Nothing new on **${name}**. What you have matches the last time you checked.` }
    : {
        kind: 'ok' as const,
        text: `Downloaded ${plural(r.fetched, 'new commit')} and updated your **${name}/...** branches to match the server. Your own files and branches did not change. Run \`git status\` or \`git log\` to see what came down.`,
      };
  return { world: r.world, lines: r.lines, explain, exitCode: 0 };
};
