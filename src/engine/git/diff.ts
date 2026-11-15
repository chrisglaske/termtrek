import type { CommandFn } from '../registry';
import type { OutLine, Tone } from '../types';
import { lineDiff } from '../diffLines';
import type { DiffLine } from '../diffLines';
import { shortId } from '../hash';
import { err } from '../shell/fs';
import { activeRepo, headTree, workingFiles } from './repoState';
import { parseRevArgs } from './revargs';

const CONTEXT = 3;
const ZERO = '0000000';

function hunks(d: DiffLine[]): { header: string; body: DiffLine[] }[] {
  const changeIdx = d.map((x, i) => (x.op === ' ' ? -1 : i)).filter((i) => i >= 0);
  if (changeIdx.length === 0) return [];
  // group changes whose gaps are within 2*CONTEXT context lines
  const groups: [number, number][] = [];
  for (const i of changeIdx) {
    const g = groups[groups.length - 1];
    if (g && i - g[1] - 1 <= CONTEXT * 2) g[1] = i;
    else groups.push([i, i]);
  }
  // running line numbers before each index
  const oldBefore: number[] = [];
  const newBefore: number[] = [];
  let o = 0;
  let n = 0;
  for (const x of d) {
    oldBefore.push(o);
    newBefore.push(n);
    if (x.op !== '+') o++;
    if (x.op !== '-') n++;
  }
  return groups.map(([first, last]) => {
    const s = Math.max(0, first - CONTEXT);
    const e = Math.min(d.length - 1, last + CONTEXT);
    const body = d.slice(s, e + 1);
    const oc = body.filter((x) => x.op !== '+').length;
    const nc = body.filter((x) => x.op !== '-').length;
    const os = oc === 0 ? oldBefore[s]! : oldBefore[s]! + 1;
    const ns = nc === 0 ? newBefore[s]! : newBefore[s]! + 1;
    const fmt = (st: number, c: number) => (c === 1 ? `${st}` : `${st},${c}`);
    return { header: `@@ -${fmt(os, oc)} +${fmt(ns, nc)} @@`, body };
  });
}

const tones: Record<DiffLine['op'], Tone> = { ' ': 'out', '+': 'ok', '-': 'error' };

type Tree = Record<string, string>;

/** Print the per-file diff between two trees, for the paths `wanted` accepts. */
function printDiff(before: Tree, after: Tree, wanted: (p: string) => boolean, paths: string[]): OutLine[] {
  const lines: OutLine[] = [];
  for (const p of paths) {
    if (!wanted(p)) continue;
    const a = before[p];
    const b = after[p];
    if (a === b) continue;
    lines.push([{ text: `diff --git a/${p} b/${p}` }]);
    const blob = (c: string | undefined) => (c === undefined ? ZERO : shortId(c));
    if (a === undefined) {
      lines.push([{ text: 'new file mode 100644' }], [{ text: `index ${ZERO}..${blob(b)}` }]);
    } else if (b === undefined) {
      lines.push([{ text: 'deleted file mode 100644' }], [{ text: `index ${blob(a)}..${ZERO}` }]);
    } else {
      lines.push([{ text: `index ${blob(a)}..${blob(b)} 100644` }]);
    }
    lines.push([{ text: a === undefined ? '--- /dev/null' : `--- a/${p}` }], [{ text: b === undefined ? '+++ /dev/null' : `+++ b/${p}` }]);
    for (const h of hunks(lineDiff(a ?? '', b ?? ''))) {
      lines.push([{ text: h.header, tone: 'muted' }]);
      for (const x of h.body) lines.push([{ text: x.op + x.text, tone: tones[x.op] }]);
    }
  }
  return lines;
}

export const gitDiff: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let staged = false;
  const words: string[] = [];
  let dashdash = false;
  for (const a of args) {
    if (!dashdash && a === '--') {
      dashdash = true;
      words.push(a);
    } else if (!dashdash && (a === '--staged' || a === '--cached')) staged = true;
    else if (!dashdash && a.startsWith('-') && a.length > 1) return { lines: [err(`error: invalid option: ${a}`)], exitCode: 129 };
    else words.push(a);
  }
  const parsed = parseRevArgs(world, repo, words);
  if (!parsed.ok) return { lines: parsed.lines, exitCode: 128 };
  const prefixes = parsed.paths;
  const wanted = (p: string) => prefixes.length === 0 || prefixes.some((x) => x === '' || p === x || p.startsWith(x + '/'));
  const treeOf = (id: string): Tree => ({ ...(repo.commits[id]?.tree ?? {}) });
  const keys = (a: Tree, b: Tree) => [...new Set([...Object.keys(a), ...Object.keys(b)])].sort();

  let before: Tree;
  let after: Tree;
  let all: string[];
  const [r1, r2] = parsed.revs;
  if (r1 && r1.kind === 'range') {
    before = treeOf(r1.from);
    after = treeOf(r1.to);
    all = keys(before, after);
  } else if (r1 && r2) {
    const second = r2.kind === 'one' ? r2.id : r2.to;
    before = treeOf(r1.id);
    after = treeOf(second);
    all = keys(before, after);
  } else if (r1) {
    before = treeOf(r1.id);
    if (staged) {
      after = { ...repo.index };
      all = keys(before, after);
    } else {
      const work = workingFiles(world, repo);
      after = {};
      for (const p of Object.keys(repo.index)) if (p in work) after[p] = work[p]!;
      all = keys(before, repo.index);
    }
  } else {
    before = staged ? headTree(repo) : repo.index;
    after = staged ? repo.index : workingFiles(world, repo);
    all = staged ? keys(before, after) : Object.keys(before).sort(); // unstaged: tracked paths only
  }
  return { lines: printDiff(before, after, wanted, all), exitCode: 0 };
};
