import type { CommandFn } from '../registry';
import type { OutLine, Repo, World } from '../types';
import { err } from '../shell/fs';
import { logRef } from './refs';
import { badRevision, resolveRev } from './rev';
import { activeRepo, headCommitId, workingFiles } from './repoState';
import { matchPathspecs, moveTree } from './worktree';

type Mode = 'soft' | 'mixed' | 'hard';

/** Git's "Unstaged changes after reset:" block, or nothing when the folder matches the index. */
function unstagedReport(world: World, repo: Repo): OutLine[] {
  const work = workingFiles(world, repo);
  const rows: OutLine[] = [];
  for (const p of Object.keys(repo.index).sort()) {
    if (!(p in work)) rows.push([{ text: `D\t${p}` }]);
    else if (work[p] !== repo.index[p]) rows.push([{ text: `M\t${p}` }]);
  }
  return rows.length ? [[{ text: 'Unstaged changes after reset:' }], ...rows] : [];
}

export const gitReset: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let mode: Mode | null = null;
  const rest: string[] = [];
  let dashIdx = -1;
  for (const a of args) {
    if (dashIdx < 0 && a === '--soft') mode = 'soft';
    else if (dashIdx < 0 && a === '--mixed') mode = 'mixed';
    else if (dashIdx < 0 && a === '--hard') mode = 'hard';
    else if (dashIdx < 0 && a === '--') dashIdx = rest.length;
    else if (dashIdx < 0 && a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
    else rest.push(a);
  }

  // Split into a revision and paths.
  let spec: string | null = null;
  let paths: string[] = [];
  if (dashIdx >= 0) {
    spec = rest.slice(0, dashIdx)[0] ?? null;
    paths = rest.slice(dashIdx);
  } else if (rest.length > 0) {
    const first = rest[0]!;
    const known = [...Object.keys(repo.index), ...Object.keys(workingFiles(world, repo))];
    if (resolveRev(repo, first) !== null) {
      spec = first;
      paths = rest.slice(1);
    } else if (!('missing' in matchPathspecs(world, repo, [first], known)) && !('outside' in matchPathspecs(world, repo, [first], known))) {
      paths = rest;
    } else return { lines: badRevision(first), exitCode: 128 };
  }

  const targetId = spec === null ? headCommitId(repo) : resolveRev(repo, spec);
  if (spec !== null && targetId === null) return { lines: badRevision(spec), exitCode: 128 };
  const targetTree = targetId ? { ...repo.commits[targetId]!.tree } : {};

  if (paths.length) {
    if (mode !== null) return { lines: [err(`fatal: Cannot do ${mode} reset with paths.`)], exitCode: 128 };
    const m = matchPathspecs(world, repo, paths, [...Object.keys(targetTree), ...Object.keys(repo.index)]);
    if ('outside' in m) return { lines: [err(`fatal: ${m.outside}: '${m.outside}' is outside repository at '${repo.root}'`)], exitCode: 128 };
    if ('missing' in m) return { lines: [err(`fatal: ambiguous argument '${m.missing}': unknown revision or path not in the working tree.`)], exitCode: 128 };
    const index = { ...repo.index };
    for (const p of m.paths) {
      if (p in targetTree) index[p] = targetTree[p]!;
      else delete index[p];
    }
    const repo2 = { ...repo, index };
    return {
      world: { ...world, repo: repo2 },
      lines: unstagedReport(world, repo2),
      explain: { kind: 'ok', text: `Unstaged ${m.paths.map((p) => `**${p}**`).join(', ')}. The files in your folder keep your edits. They just aren't in the next commit.` },
      exitCode: 0,
    };
  }

  const m: Mode = mode ?? 'mixed';
  if (m === 'soft' && repo.op?.kind === 'merge') return { lines: [err('fatal: Cannot do a soft reset in the middle of a merge.')], exitCode: 128 };
  const message = `reset: moving to ${spec ?? 'HEAD'}`;
  // Like Git's remove_branch_state: a reset without paths ends any merge or revert in progress.
  let repo2: Repo = { ...repo, op: null };
  if (targetId !== null) {
    repo2 = repo.head.kind === 'branch'
      ? { ...repo2, branches: { ...repo2.branches, [repo.head.name]: targetId } }
      : { ...repo2, head: { kind: 'detached', id: targetId } };
    repo2 = logRef(repo2, targetId, message);
  }

  if (m === 'hard') {
    const here = headCommitId(repo);
    const from = here ? repo.commits[here]!.tree : {};
    // Force mode ignores local changes: work first reverts to `from`, then moves to the target.
    const res = moveTree(world, repo, from, targetTree, { force: true });
    if (!res.ok) return { lines: res.lines, exitCode: 128 };
    const commit = targetId ? repo.commits[targetId] : undefined;
    return {
      world: { ...res.world, repo: { ...repo2, index: res.index } },
      lines: commit ? [[{ text: 'HEAD is now at ' }, { text: commit.id, tone: 'id' }, { text: ' ' + commit.message.split('\n')[0] }]] : [],
      explain: { kind: 'warn', text: 'Hard reset: your branch moved and your folder and staging area were rewritten to match. Edits that were never committed are gone. If you moved past commits, `git reflog` can still get you back.' },
      exitCode: 0,
    };
  }
  if (m === 'soft') {
    return {
      world: { ...world, repo: repo2 },
      lines: [],
      explain: { kind: 'ok', text: 'Soft reset: the branch moved back, but everything from the undone commits stays **staged**, ready to commit again.' },
      exitCode: 0,
    };
  }
  repo2 = { ...repo2, index: targetTree };
  return {
    world: { ...world, repo: repo2 },
    lines: unstagedReport(world, repo2),
    explain: { kind: 'ok', text: 'Mixed reset: the branch moved back and the staging area was emptied, but your folder keeps every change. Use `git add` to stage again.' },
    exitCode: 0,
  };
};
