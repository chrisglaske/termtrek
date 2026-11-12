import type { OutLine, World } from '../types';

export function err(text: string): OutLine {
  return [{ text, tone: 'error' }];
}

export function out(text: string): OutLine {
  return [{ text }];
}

export function isFile(world: World, abs: string): boolean {
  return Object.prototype.hasOwnProperty.call(world.files, abs);
}

/** `/` and `/home` always exist; everything else must be in `dirs`. */
export function isDir(world: World, abs: string): boolean {
  return abs === '/' || abs === '/home' || world.dirs.includes(abs);
}

export function parentOf(abs: string): string {
  const i = abs.lastIndexOf('/');
  return i <= 0 ? '/' : abs.slice(0, i);
}

export function insideHome(world: World, abs: string): boolean {
  return abs === world.home || abs.startsWith(world.home + '/');
}

/** Add `abs` and every ancestor below `/home` to a sorted, unique dir list. */
export function withDirs(dirs: string[], abs: string): string[] {
  const set = new Set(dirs);
  let cur = abs;
  while (cur !== '/' && cur !== '/home' && cur !== '') {
    set.add(cur);
    cur = parentOf(cur);
  }
  return [...set].sort();
}

/** True when `abs` is the repo root's `.git`, which only exists virtually. */
export function hasVirtualGit(world: World, dir: string): boolean {
  return world.repo !== null && world.repo.root === dir;
}

/** Write `text` to `abs`, creating its parent directories. */
export function writeFile(world: World, abs: string, text: string): World {
  return { ...world, files: { ...world.files, [abs]: text }, dirs: withDirs(world.dirs, parentOf(abs)) };
}
