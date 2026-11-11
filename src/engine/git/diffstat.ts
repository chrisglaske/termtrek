import type { OutLine } from '../types';
import { lineDiff } from '../diffLines';

const WIDTH = 80;

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

/** Git's bar scaling: anything non-zero gets at least one mark. */
const scale = (it: number, width: number, max: number) => (it === 0 ? 0 : 1 + Math.floor((it * (width - 1)) / max));

/** Git's `--stat --summary` block for the change from `from` to `to`, sized for 80 columns. */
export function diffstat(from: Record<string, string>, to: Record<string, string>): OutLine[] {
  const paths = [...new Set([...Object.keys(from), ...Object.keys(to)])].filter((p) => from[p] !== to[p]).sort();
  if (paths.length === 0) return [];
  const rows = paths.map((path) => {
    let add = 0;
    let del = 0;
    for (const d of lineDiff(from[path] ?? '', to[path] ?? '')) {
      if (d.op === '+') add++;
      else if (d.op === '-') del++;
    }
    return { path, add, del };
  });
  const maxChange = Math.max(...rows.map((r) => r.add + r.del));
  const numberWidth = String(maxChange).length;
  let nameWidth = Math.max(...paths.map((p) => p.length));
  let graphWidth = maxChange;
  if (nameWidth + numberWidth + 6 + graphWidth > WIDTH) {
    if (graphWidth > Math.floor((WIDTH * 3) / 8) - numberWidth - 6) graphWidth = Math.max(6, Math.floor((WIDTH * 3) / 8) - numberWidth - 6);
    if (nameWidth > WIDTH - numberWidth - 6 - graphWidth) nameWidth = WIDTH - numberWidth - 6 - graphWidth;
    else graphWidth = WIDTH - numberWidth - 6 - nameWidth;
  }

  const lines: OutLine[] = [];
  for (const r of rows) {
    let { add, del } = r;
    if (graphWidth < maxChange) {
      let total = scale(add + del, graphWidth, maxChange);
      if (total < 2 && add && del) total = 2;
      if (add < del) {
        add = scale(add, graphWidth, maxChange);
        del = total - add;
      } else {
        del = scale(del, graphWidth, maxChange);
        add = total - del;
      }
    }
    const name = r.path.length > nameWidth ? '...' + r.path.slice(r.path.length - nameWidth + 3) : r.path.padEnd(nameWidth);
    const n = r.add + r.del;
    const line: OutLine = [{ text: ` ${name} | ${String(n).padStart(numberWidth)}${n ? ' ' : ''}` }];
    if (add) line.push({ text: '+'.repeat(add), tone: 'ok' });
    if (del) line.push({ text: '-'.repeat(del), tone: 'error' });
    lines.push(line);
  }

  const ins = rows.reduce((s, r) => s + r.add, 0);
  const dels = rows.reduce((s, r) => s + r.del, 0);
  const parts = [plural(paths.length, 'file changed', 'files changed')];
  if (ins || !dels) parts.push(plural(ins, 'insertion(+)', 'insertions(+)'));
  if (dels || !ins) parts.push(plural(dels, 'deletion(-)', 'deletions(-)'));
  lines.push([{ text: ' ' + parts.join(', ') }]);
  for (const p of paths) {
    if (!(p in from)) lines.push([{ text: ` create mode 100644 ${p}` }]);
    else if (!(p in to)) lines.push([{ text: ` delete mode 100644 ${p}` }]);
  }
  return lines;
}
