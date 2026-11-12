import type { CommandFn } from '../registry';
import type { Repo, World } from '../types';
import { resolvePath } from '../paths';
import { err, insideHome, isFile, withDirs, writeFile } from '../shell/fs';
import { copyReachable } from '../remote/model';
import { findRemote, repoNotFound } from '../remote/host';
import { logRef } from './refs';

const USAGE_LINE = 'usage: git clone [<options>] [--] <repo> [<dir>]';

export const gitClone: CommandFn = (world, args) => {
  const pos: string[] = [];
  for (const a of args) {
    if (a === '-q' || a === '--quiet') continue;
    if (a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`), err(USAGE_LINE)], exitCode: 129 };
    pos.push(a);
  }
  if (pos.length === 0) return { lines: [err('fatal: You must specify a repository to clone.'), [{ text: '' }], err(USAGE_LINE)], exitCode: 129 };
  if (pos.length > 2) return { lines: [err('fatal: too many arguments'), err(USAGE_LINE)], exitCode: 129 };
  const url = pos[0]!;
  if (world.repo) return { lines: [err('fatal: TermTrek supports one Git repository at a time')], exitCode: 128 };

  const segment = url.replace(/\/+$/, '').replace(/\.git$/, '').split('/').pop() ?? '';
  const dirArg = pos[1] ?? segment;
  const dir = resolvePath(world, dirArg);
  if (!insideHome(world, dir) || dir === world.home) return { lines: [err(`fatal: could not create work tree dir '${dirArg}': Permission denied`)], exitCode: 128 };
  const prefix = dir + '/';
  const occupied = isFile(world, dir) || Object.keys(world.files).some((f) => f.startsWith(prefix)) || world.dirs.some((d) => d.startsWith(prefix));
  if (occupied) return { lines: [err(`fatal: destination path '${dirArg}' already exists and is not an empty directory.`)], exitCode: 128 };

  const remote = url.startsWith('https://') ? findRemote(world, url) : null;
  if (remote === null) {
    if (url.startsWith('https://')) return { lines: repoNotFound(url), exitCode: 128 };
    return { lines: [err(`fatal: repository '${url}' does not exist`)], exitCode: 128 };
  }

  const def = remote.defaultBranch;
  const tip = remote.branches[def] ?? null;
  let commits: Repo['commits'] = {};
  const remoteRefs: Record<string, string> = {};
  for (const [b, id] of Object.entries(remote.branches)) {
    commits = copyReachable(remote.commits, commits, id);
    remoteRefs[`origin/${b}`] = id;
  }
  const tree = tip ? { ...remote.commits[tip]!.tree } : {};
  const repo: Repo = {
    root: dir,
    commits,
    branches: { [def]: tip },
    head: { kind: 'branch', name: def },
    index: { ...tree },
    reflog: [],
    stash: [],
    op: null,
    remotes: { origin: url },
    remoteRefs,
    upstream: tip ? { [def]: { remote: 'origin', branch: def } } : {},
    originHead: tip ? def : null,
  };
  let next: World = { ...world, dirs: withDirs(world.dirs, dir), repo: tip ? logRef(repo, tip, `clone: from ${url}`) : repo };
  for (const [p, content] of Object.entries(tree)) next = writeFile(next, `${dir}/${p}`, content);

  const lines = [[{ text: `Cloning into '${dirArg}'...` }], ...(tip ? [] : [err('warning: You appear to have cloned an empty repository.')])];
  return {
    world: next,
    lines,
    explain: tip
      ? { kind: 'ok', text: `Copied the whole project, history included, into **${dirArg}**. The server is saved under the name **origin**. Run \`cd ${dirArg}\` to step inside.` }
      : { kind: 'tip', text: `The server had nothing in it yet, so **${dirArg}** is an empty repo wired to **origin**. Run \`cd ${dirArg}\` to step inside.` },
    exitCode: 0,
  };
};
