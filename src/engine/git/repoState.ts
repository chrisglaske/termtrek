import type { Repo, World } from '../types';
import { isIgnored } from './ignore';

export interface Change { path: string; kind: 'new' | 'modified' | 'deleted' }
export interface RepoStatus { branch: string | null; staged: Change[]; unstaged: Change[]; untracked: string[] }

export function headCommitId(repo: Repo): string | null {
  return repo.head.kind === 'branch' ? (repo.branches[repo.head.name] ?? null) : repo.head.id;
}

export function headTree(repo: Repo): Record<string, string> {
  const id = headCommitId(repo);
  const commit = id ? repo.commits[id] : undefined;
  return commit ? { ...commit.tree } : {};
}

/** The repo only counts when the current directory is inside its root. */
export function activeRepo(world: World): Repo | null {
  const repo = world.repo;
  if (!repo) return null;
  return world.cwd === repo.root || world.cwd.startsWith(repo.root + '/') ? repo : null;
}

/** Working-tree files keyed by repo-relative path. */
export function workingFiles(world: World, repo: Repo): Record<string, string> {
  const out: Record<string, string> = {};
  const prefix = repo.root + '/';
  for (const [abs, content] of Object.entries(world.files)) {
    if (abs.startsWith(prefix)) out[abs.slice(prefix.length)] = content;
  }
  return out;
}

export function ignorePatterns(world: World, repo: Repo): string[] {
  const text = world.files[repo.root + '/.gitignore'];
  return text === undefined ? [] : text.split('\n');
}

export function getStatus(world: World): RepoStatus | null {
  const repo = world.repo;
  if (!repo) return null;
  const head = headTree(repo);
  const work = workingFiles(world, repo);
  const patterns = ignorePatterns(world, repo);
  const staged: Change[] = [];
  for (const p of Object.keys(repo.index).sort()) {
    if (!(p in head)) staged.push({ path: p, kind: 'new' });
    else if (head[p] !== repo.index[p]) staged.push({ path: p, kind: 'modified' });
  }
  for (const p of Object.keys(head).sort()) if (!(p in repo.index)) staged.push({ path: p, kind: 'deleted' });
  staged.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  const unstaged: Change[] = [];
  for (const p of Object.keys(repo.index).sort()) {
    if (!(p in work)) unstaged.push({ path: p, kind: 'deleted' });
    else if (work[p] !== repo.index[p]) unstaged.push({ path: p, kind: 'modified' });
  }
  const untracked = new Set<string>();
  const indexPaths = Object.keys(repo.index);
  for (const p of Object.keys(work).sort()) {
    if (p in repo.index || isIgnored(patterns, p)) continue;
    const parts = p.split('/');
    let shown = p;
    for (let i = 1; i < parts.length; i++) {
      const dir = parts.slice(0, i).join('/') + '/';
      if (!indexPaths.some((x) => x.startsWith(dir))) {
        shown = dir;
        break;
      }
    }
    untracked.add(shown);
  }
  return {
    branch: repo.head.kind === 'branch' ? repo.head.name : null,
    staged,
    unstaged,
    untracked: [...untracked],
  };
}
