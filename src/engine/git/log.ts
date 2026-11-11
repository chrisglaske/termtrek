import type { CommandFn } from '../registry';
import type { Commit, OutLine } from '../types';
import { err } from '../shell/fs';
import { activeRepo, headCommitId } from './repoState';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

/** Simulated clock: `minutes` after Mon Nov 9 2026 09:00:00 +0000. */
export function formatDate(minutes: number): string {
  const d = new Date(Date.UTC(2026, 10, 9, 9, 0, 0) + minutes * 60000);
  return `${DAYS[d.getUTCDay()]} ${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()} ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}:${pad(d.getUTCSeconds())} ${d.getUTCFullYear()} +0000`;
}

export const gitLog: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let oneline = false;
  let limit = Infinity;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--oneline') oneline = true;
    else if (a === '-n' || a === '--max-count') {
      const k = Number(args[++i]);
      if (!Number.isInteger(k) || k < 0) return { lines: [err(`fatal: '${args[i] ?? ''}': not an integer`)], exitCode: 128 };
      limit = k;
    } else if (/^-\d+$/.test(a)) limit = Number(a.slice(1));
    else if (/^-n\d+$/.test(a)) limit = Number(a.slice(2));
    else if (a.startsWith('--max-count=')) limit = Number(a.slice(12));
    else if (a.startsWith('-')) return { lines: [err(`fatal: unrecognized argument: ${a}`)], exitCode: 128 };
  }
  let cur: string | null = headCommitId(repo);
  if (cur === null) {
    const b = repo.head.kind === 'branch' ? repo.head.name : 'HEAD';
    return { lines: [err(`fatal: your current branch '${b}' does not have any commits yet`)], exitCode: 128 };
  }
  const lines: OutLine[] = [];
  let n = 0;
  while (cur && n < limit) {
    const c: Commit | undefined = repo.commits[cur];
    if (!c) break;
    if (oneline) {
      lines.push([{ text: c.id, tone: 'id' }, { text: ' ' + c.message.split('\n')[0] }]);
    } else {
      if (n > 0) lines.push([{ text: '' }]);
      lines.push([{ text: 'commit ' }, { text: c.id, tone: 'id' }]);
      lines.push([{ text: `Author: ${c.author.name} <${c.author.email}>` }]);
      lines.push([{ text: `Date:   ${formatDate(c.time)}` }]);
      lines.push([{ text: '' }]);
      for (const l of c.message.split('\n')) lines.push([{ text: '    ' + l }]);
    }
    n++;
    cur = c.parents[0] ?? null;
  }
  return { lines, exitCode: 0 };
};
