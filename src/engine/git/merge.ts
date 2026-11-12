import type { CommandFn } from '../registry';
import type { OutLine, Repo, RepoOp, World } from '../types';
import { mergeTrees } from '../merge3';
import type { TreeConflict } from '../merge3';
import { err } from '../shell/fs';
import { diffstat } from './diffstat';
import { gitCommit, makeCommit } from './commit';
import type { RunResult } from '../types';
import { EDITOR_WAITING, mergeTemplate } from './editor';
import { branchOf, isAncestor, logRef, mergeBase } from './refs';
import { activeRepo, headCommitId, headTree, workingFiles } from './repoState';
import { hasBranch } from './branch';
import { resolveRev } from './rev';
import { moveTree } from './worktree';
import { rebaseBusy } from './rebase';

type Result = ReturnType<CommandFn>;

const treeOf = (repo: Repo, id: string | null): Record<string, string> => (id ? { ...repo.commits[id]!.tree } : {});
const plain = (t: string): OutLine => [{ text: t }];
const ORT = "Merge made by the 'ort' strategy.";

const UNMERGED = [
  err('error: Merging is not possible because you have unmerged files.'),
  err("hint: Fix them up in the work tree, and then use 'git add/rm <file>'"),
  err('hint: as appropriate to mark resolution and make a commit.'),
  err('fatal: Exiting because of an unresolved conflict.'),
];

/** Paths changed on both sides in different ways, where Git runs a content merge. */
export function autoMerged(base: Record<string, string>, ours: Record<string, string>, theirs: Record<string, string>): Set<string> {
  const out = new Set<string>();
  for (const p of new Set([...Object.keys(ours), ...Object.keys(theirs)])) {
    if (p in ours && p in theirs && ours[p] !== theirs[p] && ours[p] !== base[p] && theirs[p] !== base[p]) out.add(p);
  }
  return out;
}

export function conflictLine(c: TreeConflict, label: string): string {
  if (c.kind !== 'modify/delete') return `CONFLICT (${c.kind}): Merge conflict in ${c.path}`;
  const [gone, kept] = c.deleted === 'theirs' ? [label, 'HEAD'] : ['HEAD', label];
  return `CONFLICT (modify/delete): ${c.path} deleted in ${gone} and modified in ${kept}.  Version ${kept} of ${c.path} left in tree.`;
}

/** Put the files and staging area back to HEAD, dropping the in-progress operation (shared by merge and revert). */
export function abortOp(world: World, repo: Repo, text: string): Result {
  const work = workingFiles(world, repo);
  const from = { ...repo.index };
  for (const p of repo.op?.conflicts ?? []) if (p in work) from[p] = work[p]!;
  const res = moveTree(world, repo, from, headTree(repo), { force: true });
  if (!res.ok) return { lines: res.lines, exitCode: 1 };
  return { world: { ...res.world, repo: { ...repo, index: res.index, op: null } }, lines: [], explain: { kind: 'ok', text }, exitCode: 0 };
}

function abort(world: World, repo: Repo): Result {
  if (repo.op?.kind !== 'merge') return { lines: [err('fatal: There is no merge to abort (MERGE_HEAD missing).')], exitCode: 128 };
  return abortOp(world, repo, 'The merge is cancelled. Your files and staging area are back to how they were before `git merge`.');
}

/** Make the merge commit for the merge in progress and print Git's merge output (not commit output). */
export function concludeMerge(world: World, message: string, lines: OutLine[] = [], fallback: World = world): RunResult {
  const ours = headTree(world.repo!);
  const name = world.repo!.op!.theirsLabel;
  const made = makeCommit(world, message, { amend: false, all: false });
  if (made.exitCode !== 0) return { ...made, world: fallback };
  const made2 = made.world.repo!;
  const id = headCommitId(made2)!;
  const next = { ...made2, reflog: [{ id, message: `merge ${name}: ${ORT}` }, ...made2.reflog.slice(1)] };
  return {
    world: { ...made.world, repo: next },
    lines: [...lines, plain(ORT), ...diffstat(ours, made2.commits[id]!.tree)],
    explain: { kind: 'ok', text: 'A merge commit has two parents, joining both lines of work.' },
    exitCode: 0,
  };
}

export const gitMerge: CommandFn = (world, args, io) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let noFf = false;
  let ffOnly = false;
  let noEdit = false;
  let doAbort = false;
  let doContinue = false;
  const messages: string[] = [];
  const pos: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    // Like Git, the last of --ff, --no-ff and --ff-only wins.
    if (a === '--no-ff') [noFf, ffOnly] = [true, false];
    else if (a === '--ff') [noFf, ffOnly] = [false, false];
    else if (a === '--ff-only') [noFf, ffOnly] = [false, true];
    else if (a === '--no-edit') noEdit = true;
    else if (a === '--abort') doAbort = true;
    else if (a === '--continue') doContinue = true;
    else if (a === '-m' || a === '--message') {
      const v = args[++i];
      if (v === undefined) return { lines: [err("error: switch `m' requires a value")], exitCode: 129 };
      messages.push(v);
    } else if (a.startsWith('--message=')) messages.push(a.slice(10));
    else if (a.startsWith('-m') && a.length > 2) messages.push(a.slice(2));
    else if (a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
    else pos.push(a);
  }

  if (doAbort) return abort(world, repo);
  if (doContinue) {
    if (repo.op?.kind !== 'merge') return { lines: [err('fatal: There is no merge in progress (MERGE_HEAD missing).')], exitCode: 128 };
    return gitCommit(world, [], io);
  }
  if (repo.op) {
    if (repo.op.conflicts.length > 0) return { lines: UNMERGED, exitCode: 128 };
    if (repo.op.kind === 'rebase') return { lines: rebaseBusy('merge'), exitCode: 128 };
    return {
      lines: [err('fatal: You have not concluded your merge (MERGE_HEAD exists).'), plain('Please, commit your changes before you merge.')],
      exitCode: 128,
    };
  }
  if (pos.length === 0) return { lines: [err('fatal: No remote for the current branch.')], exitCode: 128 };

  const name = pos[0]!;
  const theirs = resolveRev(repo, name);
  if (theirs === null) return { lines: [err(`merge: ${name} - not something we can merge`)], exitCode: 1 };
  const current = branchOf(repo);
  const title = `Merge ${hasBranch(repo, name) ? 'branch' : 'commit'} '${name}'${current === 'main' || current === 'master' ? '' : ` into ${current ?? 'HEAD'}`}`;
  return startMerge(world, theirs, name, messages.length ? messages.join('\n\n') : title, { noFf, ffOnly, noEdit: noEdit || messages.length > 0 });
};

/**
 * Merge commit `theirs` into the current branch: fast-forward, true merge with the editor, or conflicts.
 * `message` is the merge commit message; `noEdit` skips the editor. Callers check that no operation is running.
 */
export function startMerge(world: World, theirs: string, theirsLabel: string, message: string, opts: { noFf?: boolean; ffOnly?: boolean; noEdit?: boolean } = {}): RunResult {
  const repo = world.repo!;
  const noFf = opts.noFf ?? false;
  const name = theirsLabel;
  const headId = headCommitId(repo);
  const current = branchOf(repo);
  const ours = headTree(repo);
  const target = treeOf(repo, theirs);
  const refuse = (lines: OutLine[]): RunResult => ({ world, lines: [...lines, plain('Merge with strategy ort failed.')], exitCode: 2 });
  const setHead = (r: Repo, id: string): Repo =>
    current ? { ...r, branches: { ...r.branches, [current]: id } } : { ...r, head: { kind: 'detached', id } };

  // Nothing committed yet: the branch simply starts at their commit.
  if (headId === null) {
    const res = moveTree(world, repo, ours, target, { force: false, verb: 'merge' });
    if (!res.ok) return refuse(res.lines);
    return { world: { ...res.world, repo: logRef(setHead({ ...repo, index: res.index }, theirs), theirs, 'initial pull') }, lines: [], exitCode: 0 };
  }

  if (isAncestor(repo, theirs, headId)) {
    return {
      world,
      lines: [plain('Already up to date.')],
      explain: { kind: 'tip', text: `**${current ?? 'HEAD'}** already has every commit from **${name}**, so there was nothing to merge.` },
      exitCode: 0,
    };
  }

  if (!noFf && isAncestor(repo, headId, theirs)) {
    const res = moveTree(world, repo, ours, target, { force: false, verb: 'merge' });
    if (!res.ok) return refuse(res.lines);
    const next = logRef(setHead({ ...repo, index: res.index }, theirs), theirs, `merge ${name}: Fast-forward`);
    return {
      world: { ...res.world, repo: next },
      lines: [
        [{ text: 'Updating ' }, { text: headId, tone: 'id' }, { text: '..' }, { text: theirs, tone: 'id' }],
        plain('Fast-forward'),
        ...diffstat(ours, target),
      ],
      explain: { kind: 'ok', text: `**${current ?? 'HEAD'}** just slid forward to **${name}**'s commit; no new commit was needed.` },
      exitCode: 0,
    };
  }

  if (opts.ffOnly) {
    return {
      world,
      lines: [err('fatal: Not possible to fast-forward, aborting.')],
      explain: { kind: 'warn', text: `**${current ?? 'HEAD'}** and **${name}** each have commits the other lacks, so Git can't just slide forward. Run \`git merge ${name}\` to join them with a merge commit, or \`git rebase ${name}\`.` },
      exitCode: 128,
    };
  }

  // A true merge needs the staging area to match HEAD; Git lists every staged path on one line.
  const staged = [...new Set([...Object.keys(repo.index), ...Object.keys(ours)])].filter((p) => repo.index[p] !== ours[p]).sort();
  if (staged.length) {
    return refuse([err('error: Your local changes to the following files would be overwritten by merge:'), plain('  ' + staged.join(' '))]);
  }

  const baseId = mergeBase(repo, headId, theirs);
  const base = treeOf(repo, baseId);
  const merged = mergeTrees(base, ours, target, { ours: 'HEAD', theirs: name });
  // Every path whose file changes is checked for local edits, conflicted ones included.
  const res = moveTree(world, repo, ours, merged.work, { force: false, verb: 'merge' });
  if (!res.ok) return refuse(res.lines);
  const index = { ...res.index };
  for (const c of merged.conflicts) {
    if (c.path in merged.tree) index[c.path] = merged.tree[c.path]!;
    else delete index[c.path];
  }

  const op: RepoOp = { kind: 'merge', theirs, theirsLabel: name, message, conflicts: merged.conflicts.map((c) => c.path) };
  const mergedWorld: World = { ...res.world, repo: { ...repo, index, op } };

  const lines: OutLine[] = [];
  const both = autoMerged(base, ours, target);
  const byPath = new Map(merged.conflicts.map((c) => [c.path, c]));
  for (const p of [...new Set([...both, ...byPath.keys()])].sort()) {
    if (both.has(p)) lines.push(plain(`Auto-merging ${p}`));
    const c = byPath.get(p);
    if (c) lines.push(plain(conflictLine(c, name)));
  }

  if (merged.conflicts.length > 0) {
    const first = merged.conflicts[0]!.path;
    lines.push(plain('Automatic merge failed; fix conflicts and then commit the result.'));
    return {
      world: mergedWorld,
      lines,
      explain: { kind: 'warn', text: `Git couldn't combine the same lines. Open the file with \`code ${first}\`, choose what to keep, then \`git add ${first}\`.` },
      exitCode: 1,
    };
  }

  if (opts.noEdit) return concludeMerge(mergedWorld, op.message, lines, world);

  return {
    world: { ...mergedWorld, pending: { file: '.git/COMMIT_EDITMSG', text: mergeTemplate(message), action: { amend: false, all: false }, merge: true } },
    lines: [...lines, [{ text: EDITOR_WAITING, tone: 'muted' }]],
    explain: { kind: 'tip', text: 'Git opened an editor for the merge commit message. The suggested message is fine: save and close the file to make the merge commit.' },
    exitCode: 0,
  };
}
