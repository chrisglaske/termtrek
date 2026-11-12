import type { CommandFn } from '../registry';
import type { OutLine, Repo, StashEntry, World } from '../types';
import { shortId } from '../hash';
import { mergeTrees } from '../merge3';
import { err } from '../shell/fs';
import { autoMerged, conflictLine } from './merge';
import { isIgnored } from './ignore';
import { branchOf, logRef } from './refs';
import { activeRepo, headCommitId, headTree, ignorePatterns, workingFiles } from './repoState';
import { gitStatus } from './status';
import { moveTree, writeWork } from './worktree';

type Result = ReturnType<CommandFn>;

const plain = (t: string): OutLine => [{ text: t }];
const unsupported = (what: string): Result => ({ lines: [err(`error: \`git stash ${what}\` is not supported in this sandbox. Try \`git stash\`, \`list\`, \`pop\`, \`apply\` or \`drop\`.`)], exitCode: 1 });
/** Git's refusal while a merge or revert is in progress. */
const needsMerge = (repo: Repo): OutLine[] => [err('error: could not write index'), ...(repo.op?.conflicts ?? []).map((p) => plain(`${p}: needs merge`))];
const NO_ENTRIES: Result = { lines: [plain('No stash entries found.')], exitCode: 1 };

/** Parse `stash@{n}`; returns the index, or null when the text isn't a stash reference. */
function parseRef(spec: string): number | null {
  const m = /^(?:stash@\{(\d+)\}|(\d+))$/.exec(spec);
  return m ? Number(m[1] ?? m[2]) : null;
}

/** Pick the entry for pop/apply/drop (default `stash@{0}`), or the Git error that explains why not. */
function pick(repo: Repo, spec: string | undefined): { n: number; entry: StashEntry } | { fail: Result } {
  if (repo.stash.length === 0) {
    if (spec === undefined) return { fail: NO_ENTRIES };
    return { fail: { lines: [err(`error: ${spec} is not a valid reference`)], exitCode: 128 } };
  }
  const n = spec === undefined ? 0 : parseRef(spec);
  if (n === null) return { fail: { lines: [err(`error: ${spec} is not a valid reference`)], exitCode: 128 } };
  const entry = repo.stash[n];
  if (!entry) return { fail: { lines: [err(`fatal: log for 'stash' only has ${repo.stash.length} entries`)], exitCode: 128 } };
  return { n, entry };
}

function push(world: World, repo: Repo, args: string[]): Result {
  let message: string | null = null;
  let untracked = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-u' || a === '--include-untracked') untracked = true;
    else if (a === '-m' || a === '--message') {
      const v = args[++i];
      if (v === undefined) return { lines: [err("error: switch `m' requires a value")], exitCode: 129 };
      message = v;
    } else if (a.startsWith('--message=')) message = a.slice(10);
    else if (a.startsWith('-m') && a.length > 2) message = a.slice(2);
    else if (a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
    else return unsupported(`push ${a}`);
  }

  const headId = headCommitId(repo);
  if (headId === null) return { lines: [plain('You do not have the initial commit yet')], exitCode: 1 };
  if (repo.op) {
    return {
      lines: needsMerge(repo),
      exitCode: 1,
    };
  }

  const head = headTree(repo);
  const work = workingFiles(world, repo);
  const tracked = [...new Set([...Object.keys(head), ...Object.keys(repo.index)])];
  const changed = tracked.filter((p) => repo.index[p] !== head[p] || (p in repo.index && work[p] !== repo.index[p]));
  const patterns = ignorePatterns(world, repo);
  const fresh = untracked ? Object.keys(work).filter((p) => !(p in repo.index) && !isIgnored(patterns, p)) : [];
  if (changed.length === 0 && fresh.length === 0) {
    return { lines: [plain('No local changes to save')], explain: { kind: 'tip', text: 'There is nothing to stash: no tracked file has changed. New files Git does not track yet stay put unless you add `-u`.' }, exitCode: 0 };
  }

  const snapshot: Record<string, string> = {};
  for (const p of [...tracked, ...fresh]) if (p in work) snapshot[p] = work[p]!;
  const branch = branchOf(repo);
  const summary = repo.commits[headId]!.message.split('\n')[0]!;
  const where = branch ?? '(no branch)';
  const label = message === null ? `WIP on ${where}: ${headId} ${summary}` : `On ${where}: ${message}`;
  const seq = world.seq + 1;
  const id = shortId('stash' + headId + JSON.stringify(repo.index) + JSON.stringify(snapshot) + label + seq);
  const entry: StashEntry = { id, base: headId, branch, message: label, index: { ...repo.index }, work: snapshot };

  const res = moveTree(world, repo, head, head, { force: true });
  if (!res.ok) return { lines: res.lines, exitCode: 1 };
  let next = res.world;
  for (const p of fresh) next = writeWork(next, repo, p, undefined);
  const saved = logRef({ ...repo, index: res.index, stash: [entry, ...repo.stash] }, headId, 'reset: moving to HEAD');
  return {
    world: { ...next, seq, repo: saved },
    lines: [plain(`Saved working directory and index state ${label}`)],
    explain: { kind: 'ok', text: 'Your unfinished work is on the **stash**, a shelf for work in progress, and your folder is clean again. Now you can switch branches. `git stash pop` puts the work back.' },
    exitCode: 0,
  };
}

function list(repo: Repo): Result {
  return { lines: repo.stash.map((e, i) => plain(`stash@{${i}}: ${e.message}`)), exitCode: 0 };
}

function apply(world: World, repo: Repo, spec: string | undefined, drop: boolean, io: Parameters<CommandFn>[2]): Result {
  if (repo.op) return { lines: [...needsMerge(repo), ...(drop ? [plain('The stash entry is kept in case you need it again.')] : [])], exitCode: 128 };
  const found = pick(repo, spec);
  if ('fail' in found) return found.fail;
  const { n, entry } = found;
  const ours = headTree(repo);
  const base = repo.commits[entry.base]?.tree ?? {};
  const merged = mergeTrees(base, ours, entry.work, { ours: 'Updated upstream', theirs: 'Stashed changes' });
  const res = moveTree(world, repo, ours, merged.work, { force: false, verb: 'merge' });
  if (!res.ok) return { lines: res.lines, exitCode: 1 };

  // The index comes from repo.index, not res.index: moveTree stages every file it writes, but Git leaves them unstaged.
  // Like Git without `--index`: files stay unstaged, except files that were new in the stash.
  const index = { ...repo.index };
  const conflicted = new Set(merged.conflicts.map((c) => c.path));
  for (const p of Object.keys(entry.index)) {
    if (!(p in base) && p in merged.work && !conflicted.has(p)) index[p] = merged.work[p]!;
  }
  const stash = drop && merged.conflicts.length === 0 ? repo.stash.filter((_, i) => i !== n) : repo.stash;
  const next: World = { ...res.world, repo: { ...repo, index, stash } };

  const lines: OutLine[] = [];
  const both = autoMerged(base, ours, entry.work);
  const byPath = new Map(merged.conflicts.map((c) => [c.path, c]));
  for (const p of [...new Set([...both, ...byPath.keys()])].sort()) {
    if (both.has(p)) lines.push(plain(`Auto-merging ${p}`));
    const c = byPath.get(p);
    if (c) lines.push(plain(conflictLine(c, 'Stashed changes')));
  }
  lines.push(...gitStatus(next, [], io).lines);

  if (merged.conflicts.length > 0) {
    const first = merged.conflicts[0]!.path;
    lines.push(plain('The stash entry is kept in case you need it again.'));
    return {
      world: next,
      lines,
      explain: { kind: 'warn', text: `Your stashed work clashes with changes made since. Open the file with \`code ${first}\`, choose what to keep, then \`git add ${first}\`. The shelf entry is kept until you drop it.` },
      exitCode: 1,
    };
  }
  if (drop) lines.push(plain(`Dropped refs/stash@{${n}} (${entry.id})`));
  return {
    world: next,
    lines,
    explain: {
      kind: 'ok',
      text: drop ? 'Your work is back and the shelf entry is gone.' : 'Your work is back, and a copy stays on the shelf. Run `git stash drop` when you no longer need it.',
    },
    exitCode: 0,
  };
}

function dropEntry(world: World, repo: Repo, spec: string | undefined): Result {
  const found = pick(repo, spec);
  if ('fail' in found) return found.fail;
  const { n, entry } = found;
  return {
    world: { ...world, repo: { ...repo, stash: repo.stash.filter((_, i) => i !== n) } },
    lines: [plain(`Dropped stash@{${n}} (${entry.id})`)],
    explain: { kind: 'ok', text: 'That shelf entry is gone for good.' },
    exitCode: 0,
  };
}

export const gitStash: CommandFn = (world, args, io) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  const [sub, ...rest] = args;
  if (sub === undefined || sub.startsWith('-')) return push(world, repo, args);
  if (sub === 'push') return push(world, repo, rest);
  if (sub === 'list') return list(repo);
  if (sub === 'pop') return apply(world, repo, rest[0], true, io);
  if (sub === 'apply') return apply(world, repo, rest[0], false, io);
  if (sub === 'drop') return dropEntry(world, repo, rest[0]);
  if (['show', 'clear', 'save', 'branch', 'create', 'store'].includes(sub)) return unsupported(sub);
  return { lines: [err(`fatal: subcommand wasn't specified; 'push' can't be assumed due to unexpected token '${sub}'`)], exitCode: 128 };
};
