import type { World } from './types';

function normalize(p: string): string {
  const out: string[] = [];
  for (const part of p.split('/')) {
    if (part === '' || part === '.') continue;
    if (part === '..') out.pop();
    else out.push(part);
  }
  return '/' + out.join('/');
}

export function resolvePath(world: World, p: string): string {
  let full: string;
  if (p === '~' || p.startsWith('~/')) full = world.home + p.slice(1);
  else if (p.startsWith('/')) full = p;
  else full = world.cwd + '/' + p;
  return normalize(full);
}

export function displayPath(world: World, abs: string): string {
  if (abs === world.home) return '~';
  if (abs.startsWith(world.home + '/')) return '~' + abs.slice(world.home.length);
  return abs;
}
