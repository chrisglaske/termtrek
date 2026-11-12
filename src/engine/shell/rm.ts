import type { CommandFn } from '../registry';
import type { OutLine } from '../types';
import { resolvePath } from '../paths';
import { err, insideHome, isDir, isFile } from './fs';

export const rm: CommandFn = (world, args) => {
  let recursive = false;
  let force = false;
  const paths: string[] = [];
  for (const a of args) {
    if (a.length > 1 && a.startsWith('-') && a !== '--') {
      const f = a.slice(1);
      if (/[rR]/.test(f)) recursive = true;
      if (f.includes('f')) force = true;
    } else paths.push(a);
  }
  if (paths.length === 0) return force ? { lines: [], exitCode: 0 } : { lines: [err('rm: missing operand')], exitCode: 1 };

  let files = { ...world.files };
  let dirs = world.dirs;
  let repo = world.repo;
  let cwd = world.cwd;
  const lines: OutLine[] = [];
  let exitCode = 0;
  for (const p of paths) {
    const abs = resolvePath(world, p);
    const last = p.split('/').filter(Boolean).pop();
    if (last === '.' || last === '..') {
      lines.push(err(`rm: refusing to remove '.' or '..' directory: skipping '${p}'`));
      exitCode = 1;
    } else if (recursive && (abs === '/' || world.home === abs || world.home.startsWith(abs + '/'))) {
      lines.push(err(`rm: it is dangerous to operate recursively on '${abs === world.home ? '~' : abs}'`));
      exitCode = 1;
    } else if (!isFile({ ...world, files }, abs) && !isDir({ ...world, dirs }, abs)) {
      if (!force) {
        lines.push(err(`rm: cannot remove '${p}': No such file or directory`));
        exitCode = 1;
      }
    } else if (!insideHome(world, abs)) {
      lines.push(err(`rm: cannot remove '${p}': Permission denied`));
      exitCode = 1;
    } else if (isDir({ ...world, dirs }, abs) && !isFile({ ...world, files }, abs)) {
      if (!recursive) {
        lines.push(err(`rm: cannot remove '${p}': Is a directory`));
        exitCode = 1;
        continue;
      }
      const under = (x: string) => x === abs || x.startsWith(abs + '/');
      files = Object.fromEntries(Object.entries(files).filter(([f]) => !under(f)));
      dirs = dirs.filter((d) => !under(d));
      if (repo && under(repo.root)) repo = null;
      if (under(cwd)) cwd = world.home;
    } else {
      delete files[abs];
    }
  }
  return { lines, world: { ...world, files, dirs, repo, cwd }, exitCode };
};
