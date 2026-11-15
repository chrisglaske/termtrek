import type { World } from './types';
import { resolvePath } from './paths';

/** Turn one glob segment into a RegExp: `*`, `?` and `[...]` are special, everything else is literal. */
function segmentRegex(seg: string): RegExp {
  let re = '';
  for (let i = 0; i < seg.length; i++) {
    const ch = seg[i]!;
    if (ch === '*') re += '[^/]*';
    else if (ch === '?') re += '[^/]';
    else if (ch === '[') {
      const end = seg.indexOf(']', i + 2);
      if (end === -1) re += '\\[';
      else {
        let body = seg.slice(i + 1, end);
        let neg = false;
        if (body[0] === '!' || body[0] === '^') {
          neg = true;
          body = body.slice(1);
        }
        re += `[${neg ? '^' : ''}${body.replace(/[\\\]^]/g, '\\$&')}]`;
        i = end;
      }
    } else re += ch.replace(/[.+^${}()|\\\]\/[]/g, '\\$&');
  }
  return new RegExp(`^${re}$`);
}

const hasMagic = (s: string): boolean => /[*?[]/.test(s);

/** Names directly inside `dirAbs` (files and folders). */
function childrenOf(world: World, dirAbs: string): Set<string> {
  const prefix = dirAbs === '/' ? '/' : dirAbs + '/';
  const names = new Set<string>();
  for (const d of world.dirs) if (d.startsWith(prefix)) names.add(d.slice(prefix.length).split('/')[0]!);
  for (const f of Object.keys(world.files)) if (f.startsWith(prefix)) names.add(f.slice(prefix.length).split('/')[0]!);
  return names;
}

/**
 * Expand a shell wildcard like bash: sorted matches, in the shape the user typed (`*.txt`, `docs/*.md`, `../*.txt`).
 * Names starting with `.` match only when that part of the pattern starts with `.`. Returns [] when nothing matches.
 */
export function expandGlob(world: World, pattern: string): string[] {
  const parts = pattern.split('/');
  let results: string[] = [''];
  parts.forEach((part, i) => {
    const last = i === parts.length - 1;
    const next: string[] = [];
    for (const base of results) {
      const join = (name: string) => (base === '' && i === 0 && pattern.startsWith('/') ? '/' + name : base === '' && i === 0 ? name : base + '/' + name);
      if (part === '') {
        // Leading slash or trailing slash: keep as typed.
        if (i === 0) next.push('');
        else if (last) next.push(base + '/');
        continue;
      }
      if (!hasMagic(part)) {
        const cand = join(part);
        const abs = resolvePath(world, cand);
        if (last ? exists(world, abs) : isDirAbs(world, abs)) next.push(cand);
        continue;
      }
      const dirAbs = resolvePath(world, base === '' ? (pattern.startsWith('/') && i > 0 ? '/' : '.') : base);
      const re = segmentRegex(part);
      const names = [...childrenOf(world, dirAbs)].filter((n) => re.test(n) && (!n.startsWith('.') || part.startsWith('.'))).sort();
      for (const n of names) {
        const cand = join(n);
        if (last || isDirAbs(world, resolvePath(world, cand))) next.push(cand);
      }
    }
    results = next;
  });
  return results.filter((r) => r !== '').sort();
}

const isDirAbs = (world: World, abs: string): boolean => abs === '/' || abs === '/home' || world.dirs.includes(abs) || Object.keys(world.files).some((f) => f.startsWith(abs + '/'));
const exists = (world: World, abs: string): boolean => Object.hasOwn(world.files, abs) || isDirAbs(world, abs);
