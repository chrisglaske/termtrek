import type { World } from './types';
import { registry } from './registry';
import { gitSubcommands } from './git';
import { resolvePath } from './paths';

/** Optimal string alignment distance (Damerau-Levenshtein, adjacent transpositions). */
function distance(a: string, b: string): number {
  const d: number[][] = [];
  for (let i = 0; i <= a.length; i++) {
    d[i] = [i];
    for (let j = 1; j <= b.length; j++) d[i]![j] = i === 0 ? j : 0;
  }
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let v = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) v = Math.min(v, d[i - 2]![j - 2]! + 1);
      d[i]![j] = v;
    }
  }
  return d[a.length]![b.length]!;
}

function closest(word: string, names: string[], max: number): string | null {
  let best: string | null = null;
  let bestD = max + 1;
  for (const n of names) {
    const dist = distance(word, n);
    if (dist < bestD) {
      best = n;
      bestD = dist;
    }
  }
  return best;
}

const has = (o: object, k: string) => Object.prototype.hasOwnProperty.call(o, k);
const shellNames = () => Object.keys(registry);

/** Returns the corrected full line, or null when there is nothing sensible to suggest. */
export function didYouMean(line: string): string | null {
  const trimmed = line.trim();
  const m = /^(\S+)(\s+[\s\S]*)?$/.exec(trimmed);
  if (!m) return null;
  const first = m[1]!;
  const rest = m[2] ?? '';
  if (has(registry, first)) {
    if (first !== 'git') return null;
    const sm = /^(\s+)([^\s-]\S*)([\s\S]*)$/.exec(rest);
    if (!sm) return null;
    const sub = sm[2]!;
    const subs = gitSubcommands();
    if (subs.includes(sub)) return null;
    const fix = closest(sub, subs, 2);
    return fix ? `git${sm[1]}${fix}${sm[3]}` : null;
  }
  if (gitSubcommands().includes(first)) return `git ${trimmed}`;
  const fix = closest(first, shellNames(), 1);
  return fix ? `${fix}${rest}` : null;
}

function commonPrefix(items: string[]): string {
  let p = items[0] ?? '';
  for (const s of items) while (!s.startsWith(p)) p = p.slice(0, -1);
  return p;
}

function pathCandidates(world: World, word: string): { prefix: string; matches: string[] } {
  const slash = word.lastIndexOf('/');
  const dirPart = slash >= 0 ? word.slice(0, slash + 1) : '';
  const base = slash >= 0 ? word.slice(slash + 1) : word;
  const dirAbs = resolvePath(world, dirPart === '' ? '.' : dirPart);
  const names = new Set<string>();
  const childOf = (abs: string, isDir: boolean) => {
    if (!abs.startsWith(dirAbs === '/' ? '/' : dirAbs + '/')) return;
    const rel = abs.slice(dirAbs === '/' ? 1 : dirAbs.length + 1);
    if (rel === '') return;
    const seg = rel.split('/')[0]!;
    names.add(isDir || rel.includes('/') ? seg + '/' : seg);
  };
  for (const d of world.dirs) childOf(d, true);
  for (const f of Object.keys(world.files)) childOf(f, false);
  if (world.repo && world.repo.root === dirAbs) names.add('.git/');
  const matches = [...names]
    .filter((n) => n.startsWith(base) && (base.startsWith('.') || !n.startsWith('.')))
    .sort()
    .map((n) => dirPart + n);
  return { prefix: word, matches };
}

/** True when the word being typed after `git <cmd> ...` should be a branch name. */
function wantsBranch(world: World, cmdWords: string[]): boolean {
  if (!world.repo) return false;
  const sub = cmdWords[1];
  const flags = cmdWords.slice(2);
  if (sub === 'switch' || sub === 'checkout' || sub === 'merge') return !flags.includes('--');
  if (sub === 'branch') return flags.some((f) => f === '-d' || f === '-D' || f === '-m' || f === '-M');
  return false;
}

/**
 * Tab completion for the word at the end of the line.
 * Paths containing spaces are completed unquoted (lesson files have none).
 */
export function complete(world: World, line: string): { line: string; options: string[] } {
  const cut = line.lastIndexOf(' ') + 1;
  const head = line.slice(0, cut);
  const word = line.slice(cut);
  const words = head.split(/\s+/).filter(Boolean);
  const cmdWords = words.slice(words.lastIndexOf('&&') + 1);

  let matches: string[];
  if (cmdWords.length === 0) {
    matches = shellNames().filter((n) => n.startsWith(word)).sort();
  } else if (cmdWords.length === 1 && cmdWords[0] === 'git') {
    matches = gitSubcommands().filter((n) => n.startsWith(word)).sort();
  } else if (cmdWords[0] === 'git' && wantsBranch(world, cmdWords)) {
    const names = Object.keys(world.repo!.branches).filter((n) => n.startsWith(word)).sort();
    matches = cmdWords[1] === 'checkout' ? [...names, ...pathCandidates(world, word).matches] : names;
  } else {
    matches = pathCandidates(world, word).matches;
  }
  if (matches.length === 0) return { line, options: [] };
  if (matches.length === 1) return { line: head + matches[0], options: [] };
  return { line: head + commonPrefix(matches), options: matches };
}
