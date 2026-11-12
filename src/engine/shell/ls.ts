import type { CommandFn } from '../registry';
import type { OutLine } from '../types';
import { resolvePath } from '../paths';
import { err, hasVirtualGit, isDir, isFile, out } from './fs';

export const ls: CommandFn = (world, args) => {
  let all = false;
  const targets: string[] = [];
  for (const a of args) {
    if (a.length > 1 && a.startsWith('-')) {
      if (a.slice(1).includes('a')) all = true;
    } else targets.push(a);
  }
  if (targets.length === 0) targets.push('.');

  const lines: OutLine[] = [];
  let exitCode = 0;
  targets.forEach((t, idx) => {
    const abs = resolvePath(world, t);
    if (isFile(world, abs)) {
      lines.push(out(t));
      return;
    }
    if (!isDir(world, abs)) {
      lines.push(err(`ls: cannot access '${t}': No such file or directory`));
      exitCode = 2;
      return;
    }
    if (targets.length > 1) {
      if (idx > 0) lines.push([]);
      lines.push(out(`${t}:`));
    }
    const prefix = abs === '/' ? '/' : abs + '/';
    const dirs = new Set<string>();
    const files = new Set<string>();
    for (const d of world.dirs) {
      if (d.startsWith(prefix)) dirs.add(d.slice(prefix.length).split('/')[0]!);
    }
    for (const f of Object.keys(world.files)) {
      if (!f.startsWith(prefix)) continue;
      const rest = f.slice(prefix.length).split('/');
      if (rest.length > 1) dirs.add(rest[0]!);
      else files.add(rest[0]!);
    }
    if (hasVirtualGit(world, abs)) dirs.add('.git');
    const visible = (n: string) => all || !n.startsWith('.');
    const sorted = (s: Set<string>) => [...s].filter(visible).sort();
    const dirNames = sorted(dirs);
    const fileNames = sorted(files);
    for (const n of dirNames) lines.push([{ text: n, tone: 'id' }]);
    for (const n of fileNames) lines.push(out(n));
  });
  return { lines, exitCode };
};
