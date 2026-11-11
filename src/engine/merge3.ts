import { lineDiff, splitLines } from './diffLines';

export interface MergeLabels { ours: string; theirs: string }
export type ConflictKind = 'content' | 'add/add' | 'modify/delete';
export interface TreeConflict { path: string; kind: ConflictKind; deleted?: 'ours' | 'theirs' }

/** For each base line, its index on `side` when the line survives unchanged, else -1. */
function keptMap(base: string, side: string, n: number): number[] {
  const map = new Array<number>(n).fill(-1);
  let b = 0;
  let s = 0;
  for (const d of lineDiff(base, side)) {
    if (d.op === ' ') map[b++] = s++;
    else if (d.op === '-') b++;
    else s++;
  }
  return map;
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Line-based three-way merge. Conflicting chunks get Git's markers. */
export function merge3(base: string, ours: string, theirs: string, labels: MergeLabels): { text: string; conflicts: number } {
  const b = splitLines(base);
  const o = splitLines(ours);
  const t = splitLines(theirs);
  const mo = keptMap(base, ours, b.length);
  const mt = keptMap(base, theirs, b.length);
  const out: string[] = [];
  let conflicts = 0;
  let endsInMarker = false;
  let bi = 0;
  let oi = 0;
  let ti = 0;
  while (true) {
    let k = bi;
    while (k < b.length && !(mo[k]! >= 0 && mt[k]! >= 0)) k++;
    const ok = k < b.length ? mo[k]! : o.length;
    const tk = k < b.length ? mt[k]! : t.length;
    const cb = b.slice(bi, k);
    const co = o.slice(oi, ok);
    const ct = t.slice(ti, tk);
    endsInMarker = false;
    if (same(co, cb)) out.push(...ct);
    else if (same(ct, cb) || same(co, ct)) out.push(...co);
    else {
      out.push(`<<<<<<< ${labels.ours}`, ...co, '=======', ...ct, `>>>>>>> ${labels.theirs}`);
      conflicts++;
      endsInMarker = true;
    }
    if (k >= b.length) break;
    out.push(b[k]!);
    bi = k + 1;
    oi = ok + 1;
    ti = tk + 1;
  }
  if (out.length === 0) return { text: '', conflicts };
  // A side that changed the final newline wins; otherwise keep the base's.
  const nl = (s: string) => s.endsWith('\n');
  const newline = endsInMarker || (nl(ours) !== nl(base) ? nl(ours) : nl(theirs) !== nl(base) ? nl(theirs) : nl(base));
  return { text: out.join('\n') + (newline ? '\n' : ''), conflicts };
}

/** Three-way merge of whole snapshots. `tree` is the index (ours for conflicts); `work` is the folder. */
export function mergeTrees(
  base: Record<string, string>,
  ours: Record<string, string>,
  theirs: Record<string, string>,
  labels: MergeLabels,
): { tree: Record<string, string>; work: Record<string, string>; conflicts: TreeConflict[] } {
  const tree: Record<string, string> = {};
  const work: Record<string, string> = {};
  const conflicts: TreeConflict[] = [];
  const put = (p: string, content: string | undefined, into: Record<string, string>[]) => {
    if (content !== undefined) for (const r of into) r[p] = content;
  };
  const paths = [...new Set([...Object.keys(base), ...Object.keys(ours), ...Object.keys(theirs)])].sort();
  for (const p of paths) {
    const b = base[p];
    const o = ours[p];
    const t = theirs[p];
    if (o === t || t === b) put(p, o, [tree, work]);
    else if (o === b) put(p, t, [tree, work]);
    else if (o === undefined || t === undefined) {
      conflicts.push({ path: p, kind: 'modify/delete', deleted: o === undefined ? 'ours' : 'theirs' });
      put(p, o, [tree]);
      put(p, o ?? t, [work]);
    } else {
      const m = merge3(b ?? '', o, t, labels);
      if (m.conflicts === 0) put(p, m.text, [tree, work]);
      else {
        conflicts.push({ path: p, kind: b === undefined ? 'add/add' : 'content' });
        tree[p] = o;
        work[p] = m.text;
      }
    }
  }
  return { tree, work, conflicts };
}
