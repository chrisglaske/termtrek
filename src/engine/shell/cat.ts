import type { CommandFn } from '../registry';
import type { OutLine } from '../types';
import { resolvePath } from '../paths';
import { err, isDir, isFile, out } from './fs';

export const cat: CommandFn = (world, args, io) => {
  const paths = args.filter((a) => !(a.length > 1 && a.startsWith('-')));
  const lines: OutLine[] = [];
  let exitCode = 0;
  const emit = (content: string) => {
    if (content === '') return;
    const body = content.endsWith('\n') ? content.slice(0, -1) : content;
    for (const l of body.split('\n')) lines.push(out(l));
  };
  if (paths.length === 0 && io.stdin !== undefined) emit(io.stdin);
  for (const p of paths) {
    const abs = resolvePath(world, p);
    if (isFile(world, abs)) emit(world.files[abs]!);
    else if (isDir(world, abs)) {
      lines.push(err(`cat: ${p}: Is a directory`));
      exitCode = 1;
    } else {
      lines.push(err(`cat: ${p}: No such file or directory`));
      exitCode = 1;
    }
  }
  return { lines, exitCode };
};
