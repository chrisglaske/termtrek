import type { OutLine, Repo, World } from '../types';
import { resolvePath } from '../paths';
import { err } from '../shell/fs';
import { headCommitId } from './repoState';
import { resolveRev, unresolved } from './rev';

export type RevSpec = { kind: 'one'; id: string; spec: string } | { kind: 'range'; from: string; to: string; spec: string };

/** Repo-relative path ('' for the root), null when outside the repo. */
function repoRelative(world: World, repo: Repo, p: string): string | null {
  const abs = resolvePath(world, p);
  if (abs === repo.root) return '';
  return abs.startsWith(repo.root + '/') ? abs.slice(repo.root.length + 1) : null;
}

function exists(world: World, repo: Repo, rel: string): boolean {
  if (rel === '') return true;
  const abs = repo.root + '/' + rel;
  if (abs in world.files) return true;
  if (world.dirs.includes(abs)) return true;
  return Object.keys(world.files).some((f) => f.startsWith(abs + '/'));
}

function existsAnywhere(world: World, p: string): boolean {
  const abs = resolvePath(world, p);
  return abs in world.files || world.dirs.includes(abs) || Object.keys(world.files).some((f) => f.startsWith(abs + '/'));
}

function outside(repo: Repo, p: string): OutLine[] {
  return [err(`fatal: ${p}: '${p}' is outside repository at '${repo.root}'`)];
}

/** Split `git log`/`git diff` words into revisions and paths, in Git's order. */
export function parseRevArgs(
  world: World,
  repo: Repo,
  words: string[],
): { ok: true; revs: RevSpec[]; paths: string[] } | { ok: false; lines: OutLine[] } {
  const revs: RevSpec[] = [];
  const paths: string[] = [];
  const toPath = (w: string): OutLine[] | null => {
    const rel = repoRelative(world, repo, w);
    if (rel === null) return outside(repo, w);
    paths.push(rel);
    return null;
  };
  let i = 0;
  let inPaths = false;
  for (; i < words.length; i++) {
    const w = words[i]!;
    if (w === '--') {
      i++;
      inPaths = true;
      break;
    }
    const dots = w.indexOf('..');
    if (dots > 0 || (dots === 0 && w.length > 2 && !w.startsWith('...'))) {
      const fromS = w.slice(0, dots) || 'HEAD';
      const toS = w.slice(dots + 2) || 'HEAD';
      const from = resolveRev(repo, fromS);
      const to = resolveRev(repo, toS);
      if (from !== null && to !== null) {
        revs.push({ kind: 'range', from, to, spec: w });
        continue;
      }
    } else if (w === '..') {
      const h = headCommitId(repo);
      if (h !== null) {
        revs.push({ kind: 'range', from: h, to: h, spec: w });
        continue;
      }
    }
    const id = resolveRev(repo, w);
    if (id !== null) {
      revs.push({ kind: 'one', id, spec: w });
      continue;
    }
    const rel = repoRelative(world, repo, w);
    if (rel === null) {
      // like Git, only a path that exists outside the repo is "outside"; a missing word is "ambiguous"
      return { ok: false, lines: existsAnywhere(world, w) ? outside(repo, w) : unresolved(repo, w) };
    }
    if (!exists(world, repo, rel)) return { ok: false, lines: unresolved(repo, w) };
    paths.push(rel);
    i++;
    inPaths = true;
    break;
  }
  if (inPaths) {
    for (; i < words.length; i++) {
      const w = words[i]!;
      const bad = toPath(w);
      if (bad) return { ok: false, lines: bad };
    }
  }
  return { ok: true, revs, paths };
}
