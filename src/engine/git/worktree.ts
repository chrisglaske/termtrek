import type { OutLine, Repo, World } from '../types';
import { resolvePath } from '../paths';
import { err, withDirs } from '../shell/fs';
import { workingFiles } from './repoState';

type MoveResult = { ok: true; world: World; index: Record<string, string> } | { ok: false; lines: OutLine[] };

const parentDir = (abs: string) => abs.slice(0, abs.lastIndexOf('/'));

/** Write one repo-relative file into the world (or delete it when `content` is undefined). */
export function writeWork(world: World, repo: Repo, path: string, content: string | undefined): World {
  const abs = `${repo.root}/${path}`;
  const files = { ...world.files };
  if (content === undefined) {
    delete files[abs];
    return { ...world, files };
  }
  files[abs] = content;
  return { ...world, files, dirs: withDirs(world.dirs, parentDir(abs)) };
}

/**
 * Move the working tree and index from the `from` snapshot to the `to` snapshot.
 * Without `force`, local changes on paths that differ are refused, like a real checkout.
 */
export function moveTree(
  world: World,
  repo: Repo,
  from: Record<string, string>,
  to: Record<string, string>,
  opts: { force: boolean; verb?: 'checkout' | 'merge' },
): MoveResult {
  const verb = opts.verb ?? 'checkout';
  const work = workingFiles(world, repo);
  const differing = [...new Set([...Object.keys(from), ...Object.keys(to)])].filter((p) => from[p] !== to[p]).sort();

  if (!opts.force) {
    const dirty: string[] = [];
    const untracked: string[] = [];
    for (const p of differing) {
      if (!(p in from) && !(p in repo.index) && p in work) untracked.push(p);
      else if (repo.index[p] !== from[p] || (p in from && work[p] !== repo.index[p])) dirty.push(p);
    }
    const lines: OutLine[] = [];
    if (dirty.length) {
      lines.push(
        err(`error: Your local changes to the following files would be overwritten by ${verb}:`),
        ...dirty.map((p) => [{ text: '\t' + p }]),
        [{ text: verb === 'merge' ? 'Please commit your changes or stash them before you merge.' : 'Please commit your changes or stash them before you switch branches.' }],
      );
    }
    if (untracked.length) {
      lines.push(
        err(`error: The following untracked working tree files would be overwritten by ${verb}:`),
        ...untracked.map((p) => [{ text: '\t' + p }]),
        [{ text: verb === 'merge' ? 'Please move or remove them before you merge.' : 'Please move or remove them before you switch branches.' }],
      );
    }
    if (lines.length) return { ok: false, lines: [...lines, [{ text: 'Aborting' }]] };
  }

  let next = world;
  const index = opts.force ? { ...to } : { ...repo.index };
  for (const p of differing) {
    next = writeWork(next, repo, p, to[p]);
    if (p in to) index[p] = to[p]!;
    else delete index[p];
  }
  if (opts.force) {
    for (const p of Object.keys(to)) if (work[p] !== to[p]) next = writeWork(next, repo, p, to[p]);
    for (const p of Object.keys(repo.index)) if (!(p in to) && p in work) next = writeWork(next, repo, p, undefined);
  }
  return { ok: true, world: next, index };
}

/**
 * Turn path arguments into repo-relative paths that exist in `known`.
 * `.` and folders match every known path inside them. Returns the first unmatched spec on failure.
 */
export function matchPathspecs(world: World, repo: Repo, specs: string[], known: Iterable<string>): { paths: string[] } | { missing: string } | { outside: string } {
  const all = [...known];
  const hit = new Set<string>();
  for (const spec of specs) {
    const abs = resolvePath(world, spec);
    if (abs !== repo.root && !abs.startsWith(repo.root + '/')) return { outside: spec };
    const rel = abs === repo.root ? '' : abs.slice(repo.root.length + 1);
    const found = all.filter((p) => rel === '' || p === rel || p.startsWith(rel + '/'));
    if (found.length === 0) return { missing: spec };
    for (const p of found) hit.add(p);
  }
  return { paths: [...hit].sort() };
}
