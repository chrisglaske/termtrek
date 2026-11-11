import type { CommandFn } from '../registry';
import type { OutLine, RepoOp, World } from '../types';
import { mergeTrees } from '../merge3';
import { err } from '../shell/fs';
import { gitCommit, makeCommit } from './commit';
import { EDITOR_WAITING, messageTemplate } from './editor';
import { abortOp, autoMerged, conflictLine } from './merge';
import { branchOf } from './refs';
import { activeRepo, headCommitId, headTree } from './repoState';
import { badRevision, resolveRev } from './rev';
import { moveTree } from './worktree';

const plain = (t: string): OutLine => [{ text: t }];
const USAGE = 'usage: git revert [--[no-]edit] [-n] [-m <parent-number>] [-s] [-S[<keyid>]] <commit>...';
const FAILED = err('fatal: revert failed');
const NO_REVERT = [err('error: no cherry-pick or revert in progress'), FAILED];

export const gitRevert: CommandFn = (world, args, io) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let noEdit = false;
  let doAbort = false;
  let doContinue = false;
  const pos: string[] = [];
  for (const a of args) {
    if (a === '--no-edit') noEdit = true;
    else if (a === '--abort') doAbort = true;
    else if (a === '--continue') doContinue = true;
    else if (a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`), plain(USAGE)], exitCode: 129 };
    else pos.push(a);
  }

  if (doAbort) {
    if (repo.op?.kind !== 'revert') return { lines: NO_REVERT, exitCode: 128 };
    return abortOp(world, repo, 'The revert is cancelled. Your files and staging area are back to how they were before `git revert`.');
  }
  if (doContinue) {
    if (repo.op?.kind !== 'revert') return { lines: NO_REVERT, exitCode: 128 };
    return gitCommit(world, noEdit ? ['--no-edit'] : [], io);
  }
  if (pos.length === 0) return { lines: [plain(USAGE)], exitCode: 129 };

  const spec = pos[0]!;
  const id = resolveRev(repo, spec);
  if (id === null) return { lines: badRevision(spec), exitCode: 128 };
  const commit = repo.commits[id]!;
  if (commit.parents.length > 1) {
    return { lines: [err(`error: commit ${id} is a merge but no -m option was given.`), FAILED], exitCode: 128 };
  }

  if (repo.op && repo.op.conflicts.length > 0) {
    return {
      lines: [
        err('error: Reverting is not possible because you have unmerged files.'),
        err("hint: Fix them up in the work tree, and then use 'git add/rm <file>'"),
        err('hint: as appropriate to mark resolution and make a commit.'),
        FAILED,
      ],
      exitCode: 128,
    };
  }
  const ours = headTree(repo);
  const overwritten = { lines: [err('error: your local changes would be overwritten by revert.'), err('hint: commit your changes or stash them to proceed.'), FAILED], exitCode: 128 };
  if (repo.op || [...new Set([...Object.keys(repo.index), ...Object.keys(ours)])].some((p) => repo.index[p] !== ours[p])) return overwritten;

  const summary = commit.message.split('\n')[0]!;
  const parent = commit.parents[0];
  const label = `parent of ${id} (${summary})`;
  const target = parent ? { ...repo.commits[parent]!.tree } : {};
  const base = { ...commit.tree };
  const merged = mergeTrees(base, ours, target, { ours: 'HEAD', theirs: label });
  // Already undone: Git has nothing to commit, so it prints the clean-tree status and stops.
  const same = [...new Set([...Object.keys(ours), ...Object.keys(merged.work)])].every((p) => ours[p] === merged.work[p]);
  if (merged.conflicts.length === 0 && same) {
    const branch = branchOf(repo);
    return {
      lines: [plain(branch ? `On branch ${branch}` : `HEAD detached at ${headCommitId(repo)}`), plain('nothing to commit, working tree clean')],
      explain: { kind: 'tip', text: 'That change was already undone, so there was nothing for the revert to do and no commit was made.' },
      exitCode: 1,
    };
  }
  const res = moveTree(world, repo, ours, merged.work, { force: false });
  if (!res.ok) return overwritten;
  const index = { ...res.index };
  for (const c of merged.conflicts) {
    if (c.path in merged.tree) index[c.path] = merged.tree[c.path]!;
    else delete index[c.path];
  }

  const message = `Revert "${summary}"\n\nThis reverts commit ${id}.`;
  const op: RepoOp = { kind: 'revert', theirs: id, theirsLabel: label, message, conflicts: merged.conflicts.map((c) => c.path) };
  const next: World = { ...res.world, repo: { ...repo, index, op } };

  const lines: OutLine[] = [];
  const both = autoMerged(base, ours, target);
  const byPath = new Map(merged.conflicts.map((c) => [c.path, c]));
  for (const p of [...new Set([...both, ...byPath.keys()])].sort()) {
    if (both.has(p)) lines.push(plain(`Auto-merging ${p}`));
    const c = byPath.get(p);
    if (c) lines.push(plain(conflictLine(c, label)));
  }

  if (merged.conflicts.length > 0) {
    const first = merged.conflicts[0]!.path;
    lines.push(
      err(`error: could not revert ${id}... ${summary}`),
      err('hint: After resolving the conflicts, mark them with'),
      err('hint: "git add/rm <pathspec>", then run'),
      err('hint: "git revert --continue".'),
      err('hint: You can instead skip this commit with "git revert --skip".'),
      err('hint: To abort and get back to the state before "git revert",'),
      err('hint: run "git revert --abort".'),
    );
    return {
      world: next,
      lines,
      explain: { kind: 'warn', text: `Undoing that commit clashes with later changes. Open the file with \`code ${first}\`, choose what to keep, then \`git add ${first}\` and run \`git revert --continue\`.` },
      exitCode: 1,
    };
  }

  if (noEdit) {
    const made = makeCommit(next, message, { amend: false, all: false });
    if (made.exitCode !== 0) return { ...made, world };
    return { ...made, lines: [...lines, ...made.lines] };
  }
  return {
    world: { ...next, pending: { file: '.git/COMMIT_EDITMSG', text: messageTemplate(next, message), action: { amend: false, all: false } } },
    lines: [...lines, [{ text: EDITOR_WAITING, tone: 'muted' }]],
    explain: { kind: 'tip', text: 'Git opened an editor for the revert commit message. The suggested message is fine: save and close the file to make the commit.' },
    exitCode: 0,
  };
};
