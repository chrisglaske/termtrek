import type { CommandFn } from '../registry';
import type { Commit, OutLine, Repo } from '../types';
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

/** Ref decoration for a commit id, like `(HEAD -> main, feature)`, or '' when the commit is not a tip. */
export function decorationFor(repo: Repo, id: string): string {
  const head = headCommitId(repo);
  const names: string[] = [];
  const current = repo.head.kind === 'branch' ? repo.head.name : null;
  if (head === id) names.push(current ? `HEAD -> ${current}` : 'HEAD');
  for (const b of Object.keys(repo.branches).sort()) {
    if (repo.branches[b] === id && b !== current) names.push(b);
  }
  for (const r of Object.keys(repo.remoteRefs).sort()) if (repo.remoteRefs[r] === id) names.push(r);
  if (repo.originHead !== null && repo.remoteRefs[`origin/${repo.originHead}`] === id) names.push('origin/HEAD');
  return names.length ? `(${names.join(', ')})` : '';
}

/** Every commit reachable from the tips, newest first, each exactly once. */
function walk(repo: Repo, tips: string[]): Commit[] {
  const seen = new Set<string>();
  const frontier = [...tips];
  const result: Commit[] = [];
  while (frontier.length) {
    let best = 0;
    for (let i = 1; i < frontier.length; i++) {
      if ((repo.commits[frontier[i]!]?.time ?? 0) > (repo.commits[frontier[best]!]?.time ?? 0)) best = i;
    }
    const id = frontier.splice(best, 1)[0]!;
    const c = repo.commits[id];
    if (!c || seen.has(id)) continue;
    seen.add(id);
    result.push(c);
    frontier.push(...c.parents);
  }
  return result;
}

export const gitLog: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let oneline = false;
  let all = false;
  let graph = false;
  let limit = Infinity;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '--oneline') oneline = true;
    else if (a === '--all') all = true;
    else if (a === '--graph') graph = true;
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
  const tips: string[] = [cur];
  if (all) {
    for (const t of Object.values(repo.branches)) if (t !== null) tips.push(t);
    if (repo.head.kind === 'detached') tips.push(repo.head.id);
  }
  const shown = walk(repo, tips).slice(0, limit);
  const lines: OutLine[] = [];
  const mark = graph ? '* ' : '';
  const bar = graph ? '| ' : '';
  shown.forEach((c, n) => {
    const decor = decorationFor(repo, c.id);
    const decorSpans = decor ? [{ text: ' ' }, { text: decor, tone: 'ok' as const }] : [];
    if (oneline) {
      lines.push([{ text: mark }, { text: c.id, tone: 'id' }, ...decorSpans, { text: ' ' + c.message.split('\n')[0] }]);
      return;
    }
    if (n > 0) lines.push([{ text: graph ? '|' : '' }]);
    lines.push([{ text: mark + 'commit ' }, { text: c.id, tone: 'id' }, ...decorSpans]);
    if (c.parents.length > 1) lines.push([{ text: `${bar}Merge: ${c.parents.map((p) => p.slice(0, 7)).join(' ')}` }]);
    lines.push([{ text: `${bar}Author: ${c.author.name} <${c.author.email}>` }]);
    lines.push([{ text: `${bar}Date:   ${formatDate(c.time)}` }]);
    lines.push([{ text: bar.trimEnd() }]);
    for (const l of c.message.split('\n')) lines.push([{ text: bar + '    ' + l }]);
  });
  const merged = graph && shown.some((c) => c.parents.length > 1);
  return {
    lines,
    explain: merged ? { kind: 'tip', text: 'The **Your repo** map draws this graph for you.' } : undefined,
    exitCode: 0,
  };
};
