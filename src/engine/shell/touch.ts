import type { CommandFn } from '../registry';
import type { OutLine } from '../types';
import { resolvePath } from '../paths';
import { err, insideHome, isDir, isFile, parentOf } from './fs';

export const touch: CommandFn = (world, args) => {
  const paths = args.filter((a) => !(a.length > 1 && a.startsWith('-')));
  if (paths.length === 0) return { lines: [err('touch: missing file operand')], exitCode: 1 };
  const files = { ...world.files };
  const lines: OutLine[] = [];
  let exitCode = 0;
  for (const p of paths) {
    const abs = resolvePath(world, p);
    if (isFile(world, abs) || isFile({ ...world, files }, abs) || isDir(world, abs)) continue;
    if (!insideHome(world, abs)) {
      lines.push(err(`touch: cannot touch '${p}': Permission denied`));
      exitCode = 1;
    } else if (!isDir(world, parentOf(abs))) {
      lines.push(err(`touch: cannot touch '${p}': No such file or directory`));
      exitCode = 1;
    } else files[abs] = '';
  }
  return { lines, world: { ...world, files }, exitCode };
};
