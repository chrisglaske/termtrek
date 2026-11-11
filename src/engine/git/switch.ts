import type { CommandFn } from '../registry';
import type { Explain, OutLine, Repo, RunResult, World } from '../types';
import { err } from '../shell/fs';
import { logRef } from './refs';
import { badRevision, resolveRev } from './rev';
import { hasBranch, validBranchName, invalidBranchName } from './branch';
import { activeRepo, headCommitId, workingFiles } from './repoState';
import { matchPathspecs, moveTree, writeWork } from './worktree';

type Target = { kind: 'branch'; name: string; create: boolean; start: string | null } | { kind: 'detach'; id: string; spec: string; advice?: boolean };

const treeOf = (repo: Repo, id: string | null): Record<string, string> => (id ? { ...repo.commits[id]!.tree } : {});
const firstLine = (repo: Repo, id: string) => repo.commits[id]!.message.split('\n')[0]!;

const ADVICE = [
  "You are in 'detached HEAD' state. You can look around, make experimental",
  'changes and commit them, and you can discard any commits you make in this',
  'state without impacting any branches by switching back to a branch.',
  '',
  'If you want to create a new branch to retain commits you create, you may',
  'do so (now or later) by using -c with the switch command. Example:',
  '',
  '  git switch -c <new-branch-name>',
  '',
  'Or undo this operation with:',
  '',
  '  git switch -',
];

/** The M/D/A lines Git prints for local changes that came along to the new branch. */
function carriedReport(world: World, repo: Repo, to: Record<string, string>): OutLine[] {
  const work = workingFiles(world, repo);
  const rows: OutLine[] = [];
  for (const p of [...new Set([...Object.keys(repo.index), ...Object.keys(to)])].sort()) {
    let code: string | null = null;
    if (p in repo.index && !(p in to)) code = 'A';
    else if (!(p in repo.index) && p in to) code = 'D';
    else if (repo.index[p] !== to[p]) code = 'M';
    else if (!(p in work) || work[p] !== repo.index[p]) code = p in work ? 'M' : 'D';
    if (code) rows.push([{ text: `${code}\t${p}` }]);
  }
  return rows;
}

function opGuard(repo: Repo): Omit<RunResult, 'world'> | null {
  const op = repo.op;
  if (!op) return null;
  if (op.conflicts.length > 0) {
    return {
      lines: [err('error: you need to resolve your current index first'), ...op.conflicts.map((p) => [{ text: '\t' + p }])],
      explain: { kind: 'warn', text: `A ${op.kind} is still in progress. Fix the conflicted files, \`git add\` them and \`git commit\`, then you can switch branches.` },
      exitCode: 1,
    };
  }
  return { lines: [err(`fatal: cannot switch branch while ${op.kind === 'merge' ? 'merging' : 'reverting'}`)], exitCode: 128 };
}

/** Move HEAD (and the folder) to `target`. Shared by switch and checkout. */
function go(world: World, repo: Repo, target: Target, dashSpec: string): RunResult {
  const guard = opGuard(repo);
  if (guard) return { world, ...guard };
  const here = headCommitId(repo);
  const fromName = repo.head.kind === 'branch' ? repo.head.name : null;
  const wasDetached = repo.head.kind === 'detached';

  let toId: string | null;
  let branches = repo.branches;
  let newName: string | null = null;
  if (target.kind === 'detach') toId = target.id;
  else if (target.create) {
    if (!validBranchName(target.name)) return { world, lines: invalidBranchName(target.name), exitCode: 128 };
    if (hasBranch(repo, target.name)) return { world, lines: [err(`fatal: a branch named '${target.name}' already exists`)], exitCode: 128 };
    toId = target.start === null ? here : resolveRev(repo, target.start);
    if (target.start !== null && toId === null) return { world, lines: [err(`fatal: invalid reference: ${target.start}`)], exitCode: 128 };
    branches = { ...repo.branches, [target.name]: toId };
    newName = target.name;
  } else toId = repo.branches[target.name] ?? null;

  const to = treeOf(repo, toId);
  const res = moveTree(world, repo, treeOf(repo, here), to, { force: false });
  if (!res.ok) return { world, lines: res.lines, exitCode: 1 };

  const label = target.kind === 'detach' ? target.spec : target.name;
  const already = target.kind === 'branch' && !target.create && fromName === target.name;
  let next: Repo = {
    ...repo,
    branches,
    index: res.index,
    head: target.kind === 'detach' ? { kind: 'detached', id: target.id } : { kind: 'branch', name: target.name },
  };
  if (toId !== null) next = logRef(next, toId, `checkout: moving from ${fromName ?? here ?? 'HEAD'} to ${label}`);

  const lines: OutLine[] = [...carriedReport(res.world, next, to)];
  if (wasDetached && here !== null && !(target.kind === 'detach' && target.id === here)) {
    lines.push([{ text: 'Previous HEAD position was ' }, { text: here, tone: 'id' }, { text: ' ' + firstLine(repo, here) }]);
  }
  let explain: Explain;
  if (target.kind === 'detach') {
    if (!wasDetached && target.advice) lines.push([{ text: `Note: switching to '${dashSpec}'.` }], [{ text: '' }], ...ADVICE.map((t) => [{ text: t }]), [{ text: '' }]);
    lines.push([{ text: 'HEAD is now at ' }, { text: target.id, tone: 'id' }, { text: ' ' + firstLine(repo, target.id) }]);
    explain = { kind: 'warn', text: 'You are on a **detached HEAD**: `HEAD` points straight at a commit instead of a branch, so new commits belong to no branch. Use `git switch -` to go back to where you were.' };
  } else if (already) {
    lines.push([{ text: `Already on '${target.name}'` }]);
    explain = { kind: 'tip', text: `You are already on **${target.name}**, so nothing moved.` };
  } else if (newName) {
    lines.push([{ text: `Switched to a new branch '${newName}'` }]);
    explain = { kind: 'ok', text: `Created **${newName}** at this commit and moved onto it. New commits now go on **${newName}**, and **${fromName ?? 'the old branch'}** stays where it was.` };
  } else {
    lines.push([{ text: `Switched to branch '${target.name}'` }]);
    explain = { kind: 'ok', text: `Your folder now shows the files from **${target.name}**, and new commits will go on **${target.name}**.` };
  }
  return { world: { ...res.world, repo: next }, lines, explain, exitCode: 0 };
}

/** The branch you were on before, read from the reflog. */
function previous(repo: Repo): string | null {
  for (const e of repo.reflog) {
    const m = /^checkout: moving from (\S+) to /.exec(e.message);
    if (m) return m[1]!;
  }
  return null;
}

export const gitSwitch: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let create = false;
  let detach = false;
  const pos: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-c' || a === '--create') {
      create = true;
      const n = args[++i];
      if (n === undefined) return { lines: [err("error: switch `c' requires a value")], exitCode: 129 };
      pos.unshift(n);
    } else if (a === '-d' || a === '--detach') detach = true;
    else if (a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
    else pos.push(a);
  }
  if (pos.length === 0) return { lines: [err('fatal: missing branch or commit argument')], exitCode: 128 };
  if (create) return go(world, repo, { kind: 'branch', name: pos[0]!, create: true, start: pos[1] ?? null }, '');
  const spec = pos[0]!;
  if (detach) {
    const id = resolveRev(repo, spec);
    return id === null ? { lines: [err(`fatal: invalid reference: ${spec}`)], exitCode: 128 } : go(world, repo, { kind: 'detach', id, spec }, spec);
  }
  const name = spec === '-' ? previous(repo) : spec;
  if (name !== null && hasBranch(repo, name)) return go(world, repo, { kind: 'branch', name, create: false, start: null }, spec);
  const id = resolveRev(repo, name ?? spec);
  if (id !== null) {
    return {
      lines: [err(`fatal: a branch is expected, got commit '${spec === '-' ? id : spec}'`), err('hint: If you want to detach HEAD at the commit, try again with the --detach option.')],
      exitCode: 128,
    };
  }
  return { lines: [err(`fatal: invalid reference: ${spec}`)], exitCode: 128 };
};

export const gitCheckout: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let create = false;
  let detach = false;
  let newName: string | null = null;
  const pos: string[] = [];
  let dashAt = -1;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (dashAt >= 0) pos.push(a);
    else if (a === '--') dashAt = pos.length;
    else if (a === '-b') {
      create = true;
      newName = args[++i] ?? null;
      if (newName === null) return { lines: [err("error: switch `b' requires a value")], exitCode: 129 };
    } else if (a === '--detach' || a === '-d') detach = true;
    else if (a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
    else pos.push(a);
  }
  if (create) return go(world, repo, { kind: 'branch', name: newName!, create: true, start: pos[0] ?? null }, '');

  // `checkout <rev> -- <paths>` and `checkout -- <paths>`.
  if (dashAt >= 0) {
    const spec = dashAt > 0 ? pos[0]! : null;
    const paths = pos.slice(dashAt > 0 ? 1 : 0);
    const id = spec === null ? null : resolveRev(repo, spec);
    if (spec !== null && id === null) return { lines: [err(`fatal: invalid reference: ${spec}`)], exitCode: 128 };
    return restorePaths(world, repo, paths, spec === null ? null : treeOf(repo, id));
  }
  if (pos.length === 0) return { lines: [err('fatal: missing branch or commit argument')], exitCode: 128 };

  const spec = pos[0]!;
  const name = spec === '-' ? previous(repo) : spec;
  if (!detach && name !== null && hasBranch(repo, name) && pos.length === 1) return go(world, repo, { kind: 'branch', name, create: false, start: null }, spec);
  const id = spec === '-' ? (name === null ? null : resolveRev(repo, name)) : resolveRev(repo, spec);
  if (id !== null && (detach || pos.length === 1)) {
    if (spec === 'HEAD' && !detach) {
      const r = go(world, repo, repo.head.kind === 'branch' ? { kind: 'branch', name: repo.head.name, create: false, start: null } : { kind: 'detach', id, spec }, spec);
      return r.exitCode === 0 ? { ...r, lines: r.lines.filter((l) => !/^(Already on|HEAD is now at|Note:)/.test(l[0]!.text)), explain: undefined } : r;
    }
    return go(world, repo, { kind: 'detach', id, spec: name ?? spec, advice: !detach }, name ?? spec);
  }
  if (detach) return { lines: badRevision(spec), exitCode: 128 };
  if (spec === '-') return { lines: [err("error: pathspec '-' did not match any file(s) known to git")], exitCode: 1 };
  if (id !== null && pos.length > 1) return restorePaths(world, repo, pos.slice(1), treeOf(repo, id));
  // Not a branch or revision: treat everything as paths to restore from the index.
  return restorePaths(world, repo, pos, null);
};

/** `git checkout [<rev>] -- <paths>`: copy paths from `tree` (the index when null) into the folder. */
function restorePaths(world: World, repo: Repo, paths: string[], tree: Record<string, string> | null): ReturnType<CommandFn> {
  if (paths.length === 0) return { lines: [err('fatal: you must specify path(s) to checkout')], exitCode: 128 };
  const source = tree ?? repo.index;
  const m = matchPathspecs(world, repo, paths, Object.keys(source));
  if ('outside' in m) return { lines: [err(`fatal: ${m.outside}: '${m.outside}' is outside repository at '${repo.root}'`)], exitCode: 128 };
  if ('missing' in m) return { lines: [err(`error: pathspec '${m.missing}' did not match any file(s) known to git`)], exitCode: 1 };
  let next = world;
  const index = { ...repo.index };
  for (const p of m.paths) {
    next = writeWork(next, repo, p, source[p]);
    if (tree) index[p] = tree[p]!;
  }
  const n = m.paths.length;
  const what = n === 1 ? `**${m.paths[0]}**` : paths.map((s) => `**${s}**`).join(', ');
  return {
    world: { ...next, repo: { ...repo, index } },
    lines: [],
    explain: { kind: 'warn', text: `Put ${what} back the way it was ${tree ? 'in that commit' : 'in the staging area'}. Edits you discarded are gone for good. \`git restore\` does the same job with a clearer name.` },
    exitCode: 0,
  };
}
