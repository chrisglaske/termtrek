import type { CommandFn } from '../registry';
import { resolvePath } from '../paths';
import { err, isDir, isFile } from './fs';

export const cd: CommandFn = (world, args) => {
  if (args.length > 1) return { lines: [err('bash: cd: too many arguments')], exitCode: 1 };
  const target = args[0];
  const abs = target === undefined ? world.home : resolvePath(world, target);
  if (isDir(world, abs)) return { lines: [], world: { ...world, cwd: abs }, exitCode: 0 };
  const why = isFile(world, abs) ? 'Not a directory' : 'No such file or directory';
  return { lines: [err(`bash: cd: ${target}: ${why}`)], exitCode: 1 };
};
