import type { CommandFn } from '../registry';
import { resolvePath } from '../paths';
import { err, insideHome, isFile, withDirs } from '../shell/fs';
import { activeRepo } from './repoState';

export const gitInit: CommandFn = (world, args) => {
  let branch = 'main';
  let target: string | undefined;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-b' || a === '--initial-branch') {
      const v = args[++i];
      if (v === undefined) return { lines: [err(`error: switch \`b' requires a value`)], exitCode: 129 };
      branch = v;
    } else if (a.startsWith('--initial-branch=')) branch = a.slice('--initial-branch='.length);
    else if (a === '-q' || a === '--quiet' || a === '--bare') continue;
    else if (a.startsWith('-')) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
    else target = a;
  }
  if (branch === '' || /[\s~^:?*[\\]|\.\.|\/$/.test(branch)) {
    return { lines: [err(`fatal: invalid initial branch name: '${branch}'`)], exitCode: 128 };
  }
  const dir = target === undefined ? world.cwd : resolvePath(world, target);
  if (world.repo && (dir === world.repo.root || (target === undefined && activeRepo(world)))) {
    return { lines: [[{ text: `Reinitialized existing Git repository in ${world.repo.root}/.git/` }]], exitCode: 0 };
  }
  if (!insideHome(world, dir)) return { lines: [err(`fatal: cannot mkdir ${dir}: Permission denied`)], exitCode: 128 };
  if (isFile(world, dir)) return { lines: [err(`fatal: cannot mkdir ${target ?? dir}: File exists`)], exitCode: 128 };
  if (world.repo) {
    return { lines: [err('fatal: TermTrek supports one Git repository at a time')], exitCode: 128 };
  }
  const next = {
    ...world,
    dirs: withDirs(world.dirs, dir),
    repo: {
      root: dir,
      commits: {},
      branches: { [branch]: null },
      head: { kind: 'branch' as const, name: branch },
      index: {},
      reflog: [],
      stash: [],
      op: null,
      remotes: {},
      remoteRefs: {},
      upstream: {},
      originHead: null,
    },
  };
  return {
    world: next,
    lines: [[{ text: `Initialized empty Git repository in ${dir}/.git/` }]],
    explain: { kind: 'tip', text: 'Git now tracks this folder. It created a hidden `.git` folder where your history will live.' },
    exitCode: 0,
  };
};
