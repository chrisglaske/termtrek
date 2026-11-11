import type { CommandFn } from '../registry';
import type { OutLine } from '../types';
import { resolvePath } from '../paths';
import { err, insideHome, isDir, isFile, parentOf, withDirs } from './fs';

export const mkdir: CommandFn = (world, args) => {
  let parents = false;
  const paths: string[] = [];
  for (const a of args) {
    if (a.length > 1 && a.startsWith('-')) {
      if (a.slice(1).includes('p')) parents = true;
    } else paths.push(a);
  }
  if (paths.length === 0) return { lines: [err('mkdir: missing operand')], exitCode: 1 };
  let dirs = world.dirs;
  const lines: OutLine[] = [];
  let exitCode = 0;
  const w = () => ({ ...world, dirs });
  for (const p of paths) {
    const abs = resolvePath(world, p);
    const fail = (why: string) => {
      lines.push(err(`mkdir: cannot create directory '${p}': ${why}`));
      exitCode = 1;
    };
    if (isDir(w(), abs) || isFile(world, abs)) {
      if (!parents || isFile(world, abs)) fail('File exists');
    } else if (!insideHome(world, abs)) fail('Permission denied');
    else if (!parents && !isDir(w(), parentOf(abs))) fail('No such file or directory');
    else dirs = withDirs(dirs, abs);
  }
  return { lines, world: w(), exitCode };
};
