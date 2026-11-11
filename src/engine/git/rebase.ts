import type { CommandFn } from '../registry';
import type { Commit, CommitEdit, OutLine, RebaseState, Repo, RepoOp, RunResult, World } from '../types';
import { shortId } from '../hash';
import { mergeTrees } from '../merge3';
import { err } from '../shell/fs';
import { makeCommit } from './commit';
import { EDITOR_WAITING, messageTemplate } from './editor';
import { autoMerged, conflictLine } from './merge';
import { isAncestor, logRef, mergeBase } from './refs';
import { activeRepo, headCommitId, headTree, workingFiles } from './repoState';
import { resolveRev } from './rev';
import { trackingSummary } from './tracking';
import { moveTree } from './worktree';

const plain = (t: string): OutLine => [{ text: t }];
const NO_REBASE = 'fatal: no rebase in progress';
const subjectOf = (c: Commit): string => c.message.split('\n')[0]!;
const sameTree = (a: Record<string, string>, b: Record<string, string>): boolean =>
  [...new Set([...Object.keys(a), ...Object.keys(b)])].every((p) => a[p] === b[p]);

const ALREADY = [
  'fatal: It seems that there is already a rebase-merge directory, and',
  'I wonder if you are in the middle of another rebase.  If that is the',
  'case, please try',
  '\tgit rebase (--continue | --abort | --skip)',
  'If that is not the case, please',
  '\trm -fr ".git/rebase-merge"',
  'and run me again.  I am stopping in case you still have something',
  'valuable there.',
  '',
];

/** TermTrek keeps one operation at a time, so commands that would start another one wait for the rebase to end. */
export function rebaseBusy(what: string): OutLine[] {
  return [
    err(`error: TermTrek can't start a ${what} while a rebase is in progress.`),
    err('hint: Finish the rebase with "git rebase --continue", or cancel it with "git rebase --abort".'),
  ];
}

/** What `git switch` prints during a rebase (TermTrek's `checkout <branch>` uses it too once conflicts are fixed). */
export const SWITCH_REBASING: OutLine[] = [err('fatal: cannot switch branch while rebasing'), plain('Consider "git rebase --quit" or "git worktree add".')];

/** The first-parent, non-merge commits after the merge base of `tip` and `onto`, oldest first. */
function picks(repo: Repo, tip: string, onto: string): string[] {
  const base = mergeBase(repo, tip, onto);
  const out: string[] = [];
  let cur: string | undefined = tip;
  while (cur && cur !== base) {
    const c: Commit | undefined = repo.commits[cur];
    if (!c) break;
    if (c.parents.length <= 1) out.push(cur);
    cur = c.parents[0];
  }
  return out.reverse();
}

/** The `git status` block for a rebase. `hints` adds the `(use ...)` lines (the commit template leaves them out). */
export function rebaseStatusLines(repo: Repo, hints: boolean): string[] {
  const op = repo.op;
  const st = op?.rebase;
  if (!op || !st) return [];
  const all = picks(repo, st.orig, st.onto);
  const done = all.slice(0, Math.max(0, all.length - st.todo.length));
  const pick = (id: string) => `   pick ${id} # ${repo.commits[id] ? subjectOf(repo.commits[id]!) : ''}`;
  const n = (k: number, one: string, many: string) => `${k} ${k === 1 ? one : many}`;
  const lines = [`interactive rebase in progress; onto ${st.onto}`];
  if (done.length) {
    lines.push(`${done.length === 1 ? 'Last command done' : 'Last commands done'} (${n(done.length, 'command', 'commands')} done):`, ...done.slice(-2).map(pick));
    if (done.length > 2 && hints) lines.push('  (see more in file .git/rebase-merge/done)');
  }
  if (st.todo.length) {
    lines.push(`${st.todo.length === 1 ? 'Next command to do' : 'Next commands to do'} (${n(st.todo.length, 'remaining command', 'remaining commands')}):`, ...st.todo.slice(0, 2).map(pick));
    if (hints) lines.push('  (use "git rebase --edit-todo" to view and edit)');
  } else lines.push('No commands remaining.');
  const where = `branch '${st.branch}' on '${st.onto}'.`;
  if (op.conflicts.length) {
    lines.push(`You are currently rebasing ${where}`);
    if (hints) {
      lines.push(
        '  (fix conflicts and then run "git rebase --continue")',
        '  (use "git rebase --skip" to skip this patch)',
        '  (use "git rebase --abort" to check out the original branch)',
      );
    }
  } else if (headCommitId(repo) === st.stoppedAt) {
    lines.push(`You are currently rebasing ${where}`);
    if (hints) lines.push('  (all conflicts fixed: run "git rebase --continue")');
  } else {
    lines.push(`You are currently editing a commit while rebasing ${where}`);
    if (hints) lines.push('  (use "git commit --amend" to amend the current commit)', '  (use "git rebase --continue" once you are satisfied with your changes)');
  }
  return lines;
}

/** The message `git commit` offers during a rebase stop: Git's MERGE_MSG until the learner commits by hand. */
export function rebaseMessage(repo: Repo): string {
  const op = repo.op;
  return op?.kind === 'rebase' && op.rebase && headCommitId(repo) === op.rebase.stoppedAt ? op.message : '';
}

/** Point HEAD (detached during a rebase) at `id`. */
const setHead = (repo: Repo, id: string): Repo =>
  repo.head.kind === 'branch' ? { ...repo, branches: { ...repo.branches, [repo.head.name]: id } } : { ...repo, head: { kind: 'detached', id } };

/** Move the branch to the new tip, re-attach HEAD and drop the rebase. */
function finish(world: World, lines: OutLine[]): RunResult {
  const repo = world.repo!;
  const st = repo.op!.rebase!;
  const id = headCommitId(repo)!;
  const next = logRef({ ...repo, op: null, branches: { ...repo.branches, [st.branch]: id }, head: { kind: 'branch', name: st.branch } }, id, `rebase (finish): returning to refs/heads/${st.branch}`);
  return {
    world: { ...world, repo: next },
    lines: [...lines, plain(`Successfully rebased and updated refs/heads/${st.branch}.`)],
    explain: { kind: 'ok', text: `**${st.branch}** now sits on top of **${st.ontoLabel}**. Rebasing made new copies of your commits, so their ids changed.` },
    exitCode: 0,
  };
}

/** Replay the commits left in the todo list, stopping at the first conflict. */
function replay(world0: World, lines: OutLine[]): RunResult {
  let world = world0;
  for (;;) {
    const repo = world.repo!;
    const op = repo.op!;
    const st = op.rebase!;
    const id = st.todo[0];
    if (id === undefined) return finish(world, lines);
    const commit = repo.commits[id]!;
    const subject = subjectOf(commit);
    const rest = st.todo.slice(1);
    const headId = headCommitId(repo)!;
    const ours = headTree(repo);
    const base = commit.parents[0] ? { ...repo.commits[commit.parents[0]]!.tree } : {};
    const label = `${id} (${subject})`;
    const merged = mergeTrees(base, ours, commit.tree, { ours: 'HEAD', theirs: label });
    const stop = (r: Repo, conflicts: string[]): Repo => ({
      ...r,
      op: { ...op, conflicts, message: commit.message + (conflicts.length ? `\n\n# Conflicts:\n${conflicts.map((p) => `#\t${p}\n`).join('')}` : ''), rebase: { ...st, todo: rest, current: id, stoppedAt: headId } },
    });
    const res = moveTree(world, repo, ours, merged.work, { force: false, verb: 'merge' });
    if (!res.ok) {
      return {
        world: { ...world, repo: stop(repo, []) },
        lines: [...lines, ...res.lines, err(`error: could not apply ${id}... ${subject}`), plain(`Could not apply ${id}... # ${subject}`)],
        exitCode: 1,
      };
    }
    if (merged.conflicts.length) {
      const index = { ...res.index };
      for (const c of merged.conflicts) {
        if (c.path in merged.tree) index[c.path] = merged.tree[c.path]!;
        else delete index[c.path];
      }
      const both = autoMerged(base, ours, commit.tree);
      const byPath = new Map(merged.conflicts.map((c) => [c.path, c]));
      for (const p of [...new Set([...both, ...byPath.keys()])].sort()) {
        if (both.has(p)) lines.push(plain(`Auto-merging ${p}`));
        const c = byPath.get(p);
        if (c) lines.push(plain(conflictLine(c, label)));
      }
      const first = merged.conflicts[0]!.path;
      return {
        world: { ...res.world, repo: stop({ ...repo, index }, merged.conflicts.map((c) => c.path)) },
        lines: [
          ...lines,
          err(`error: could not apply ${id}... ${subject}`),
          err('hint: Resolve all conflicts manually, mark them as resolved with'),
          err('hint: "git add/rm <conflicted_files>", then run "git rebase --continue".'),
          err('hint: You can instead skip this commit: run "git rebase --skip".'),
          err('hint: To abort and get back to the state before "git rebase", run "git rebase --abort".'),
          plain(`Could not apply ${id}... # ${subject}`),
        ],
        explain: { kind: 'warn', text: `Your commit **${subject}** and **${st.ontoLabel}** changed the same lines. Open the file with \`code ${first}\`, choose what to keep, then \`git add ${first}\` and run \`git rebase --continue\`.` },
        exitCode: 1,
      };
    }
    const nextOp: RepoOp = { ...op, rebase: { ...st, todo: rest, current: null, stoppedAt: null } };
    // A replay that changes nothing is dropped (TermTrek simplification of Git's empty-commit handling).
    if (sameTree(ours, merged.tree)) {
      world = { ...res.world, repo: { ...repo, index: res.index, op: nextOp } };
      continue;
    }
    const seq = world.seq + 1;
    const newId = shortId(headId + JSON.stringify(merged.tree) + commit.message + seq);
    const made: Commit = { id: newId, parents: [headId], tree: { ...merged.tree }, message: commit.message, author: { ...commit.author }, time: seq };
    const next = logRef(setHead({ ...repo, index: res.index, op: nextOp, commits: { ...repo.commits, [newId]: made } }, newId), newId, `rebase (pick): ${subject}`);
    world = { ...res.world, repo: next, seq };
  }
}

/**
 * Rebase the current branch onto commit `onto` (`ontoLabel` is how the learner named it).
 * Callers check for a clean tree and an attached HEAD first; `git pull --rebase` reuses this.
 */
export function startRebase(world: World, onto: string, ontoLabel: string): RunResult {
  const repo = world.repo!;
  const branch = repo.head.kind === 'branch' ? repo.head.name : '';
  const headId = headCommitId(repo)!;
  if (isAncestor(repo, onto, headId)) {
    return {
      world,
      lines: [plain(`Current branch ${branch} is up to date.`)],
      explain: { kind: 'tip', text: `**${branch}** already contains every commit from **${ontoLabel}**, so there was nothing to replay.` },
      exitCode: 0,
    };
  }
  const ours = headTree(repo);
  const res = moveTree(world, repo, ours, { ...repo.commits[onto]!.tree }, { force: false });
  if (!res.ok) return { world, lines: [...res.lines, err('error: could not detach HEAD')], exitCode: 1 };
  const st: RebaseState = { branch, onto, ontoLabel, orig: headId, todo: isAncestor(repo, headId, onto) ? [] : picks(repo, headId, onto), current: null, stoppedAt: null };
  const op: RepoOp = { kind: 'rebase', theirs: onto, theirsLabel: ontoLabel, message: '', conflicts: [], rebase: st };
  const next = logRef({ ...repo, index: res.index, head: { kind: 'detached', id: onto }, op }, onto, `rebase (start): checkout ${ontoLabel}`);
  return replay({ ...res.world, repo: next }, []);
}

/** Commit the staged fix for the stopped commit with `message`, keeping its author, then replay the rest. */
export function continueWithMessage(world: World, message: string, edit: CommitEdit = { amend: false, all: false }): RunResult {
  const repo0 = world.repo!;
  const st = repo0.op!.rebase!;
  const original = st.current ? repo0.commits[st.current] : undefined;
  const made = makeCommit({ ...world, repo: { ...repo0, op: { ...repo0.op!, conflicts: [] } } }, message, edit);
  if (made.exitCode !== 0) return { ...made, world };
  const repo = made.world.repo!;
  const id = headCommitId(repo)!;
  const commit = original ? { ...repo.commits[id]!, author: { ...original.author } } : repo.commits[id]!;
  const next: Repo = {
    ...repo,
    commits: { ...repo.commits, [id]: commit },
    reflog: [{ id, message: `rebase (continue): ${subjectOf(commit)}` }, ...repo.reflog.slice(1)],
    op: { ...repo.op!, conflicts: [], rebase: { ...st, current: null, stoppedAt: null } },
  };
  return replay({ ...made.world, repo: next }, [...made.lines]);
}

/** `git rebase --continue`. */
function cont(world: World, repo: Repo): RunResult {
  const op = repo.op!;
  const st = op.rebase!;
  const work = workingFiles(world, repo);
  const unstaged = Object.keys(repo.index).some((p) => work[p] !== repo.index[p]);
  if (op.conflicts.length || unstaged) {
    return {
      world,
      lines: [...[...op.conflicts].sort().map((p) => plain(`${p}: needs merge`)), plain('You must edit all merge conflicts and then'), plain('mark them as resolved using git add')],
      explain: { kind: 'tip', text: 'Stage your fixed files with `git add` first, then run `git rebase --continue` again.' },
      exitCode: 1,
    };
  }
  if (!sameTree(repo.index, headTree(repo))) {
    const message = rebaseMessage(repo) || (st.current ? repo.commits[st.current]!.message : '');
    return {
      world: { ...world, pending: { file: '.git/COMMIT_EDITMSG', text: messageTemplate(world, message), action: { amend: false, all: false }, rebase: true } },
      lines: [[{ text: EDITOR_WAITING, tone: 'muted' }]],
      explain: { kind: 'tip', text: 'Git opened an editor for the commit message. The original message is already there: save and close the file to commit your fix and carry on.' },
      exitCode: 0,
    };
  }
  // Nothing staged: the stopped commit is dropped (or was committed by hand) and the rest are replayed.
  return replay({ ...world, repo: { ...repo, op: { ...op, conflicts: [], rebase: { ...st, current: null, stoppedAt: null } } } }, []);
}

/** Put the index and files back to `tree`, treating conflicted files in the folder as changed. */
function resetTo(world: World, repo: Repo, tree: Record<string, string>): { world: World; index: Record<string, string> } | RunResult {
  const work = workingFiles(world, repo);
  const from = { ...repo.index };
  for (const p of repo.op?.conflicts ?? []) if (p in work) from[p] = work[p]!;
  const res = moveTree(world, repo, from, tree, { force: true });
  if (!res.ok) return { world, lines: res.lines, exitCode: 1 };
  return { world: res.world, index: res.index };
}

/** Git's refusal when the tree isn't clean, or null. Conflicted paths count as both unstaged and staged. */
function dirtyLines(world: World, repo: Repo): OutLine[] | null {
  const head = headTree(repo);
  const work = workingFiles(world, repo);
  const conflicts = repo.op?.conflicts ?? [];
  const unstaged = conflicts.length > 0 || Object.keys(repo.index).some((p) => work[p] !== repo.index[p]);
  const staged = conflicts.length > 0 || !sameTree(repo.index, head);
  if (!unstaged && !staged) return null;
  return [
    ...[...conflicts].sort().map((p) => plain(`${p}: needs merge`)),
    err(`error: cannot rebase: ${unstaged ? 'You have unstaged changes.' : 'Your index contains uncommitted changes.'}`),
    ...(unstaged && staged ? [err('error: additionally, your index contains uncommitted changes.')] : []),
    err('error: Please commit or stash them.'),
  ];
}

const USAGE = 'usage: git rebase [-i] [options] [--exec <cmd>] [--onto <newbase> | --keep-base] [<upstream> [<branch>]]';

export const gitRebase: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let action: 'continue' | 'skip' | 'abort' | null = null;
  const pos: string[] = [];
  for (const a of args) {
    if (a === '--continue' || a === '--skip' || a === '--abort') action = a.slice(2) as 'continue' | 'skip' | 'abort';
    else if (a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`), plain(USAGE)], exitCode: 129 };
    else pos.push(a);
  }
  const op = repo.op;
  const rebasing = op?.kind === 'rebase' && op.rebase ? op : null;

  if (action) {
    if (!rebasing) return { lines: [err(NO_REBASE)], exitCode: 128 };
    if (action === 'continue') return cont(world, repo);
    const st = rebasing.rebase!;
    const target = action === 'abort' ? { ...repo.commits[st.orig]!.tree } : headTree(repo);
    const reset = resetTo(world, repo, target);
    if ('exitCode' in reset) return reset;
    if (action === 'skip') {
      const next: Repo = { ...repo, index: reset.index, op: { ...rebasing, conflicts: [], rebase: { ...st, current: null, stoppedAt: null } } };
      return replay({ ...reset.world, repo: next }, []);
    }
    const next = logRef({ ...repo, index: reset.index, op: null, head: { kind: 'branch', name: st.branch }, branches: { ...repo.branches, [st.branch]: st.orig } }, st.orig, `rebase (abort): returning to refs/heads/${st.branch}`);
    return {
      world: { ...reset.world, repo: next },
      lines: [],
      explain: { kind: 'ok', text: `The rebase is cancelled. **${st.branch}**, your files and the staging area are back to how they were before \`git rebase\`.` },
      exitCode: 0,
    };
  }

  if (rebasing) return { lines: ALREADY.map((t, i) => (i === 0 ? err(t) : plain(t))), exitCode: 128 };
  if (pos.length > 1) return { lines: [plain(USAGE)], exitCode: 129 };
  const branch = repo.head.kind === 'branch' ? repo.head.name : null;
  let onto: string | null;
  let label: string;
  if (pos.length === 0) {
    const intro = [plain(branch ? 'There is no tracking information for the current branch.' : 'You are not currently on a branch.'), plain('Please specify which branch you want to rebase against.'), plain('See git-rebase(1) for details.'), plain(''), plain("    git rebase '<branch>'"), plain('')];
    if (!branch) return { lines: intro, exitCode: 1 };
    const t = trackingSummary(repo, branch);
    if (!t || t.gone) {
      return {
        lines: [...intro, plain('If you wish to set tracking information for this branch you can do so with:'), plain(''), plain(`    git branch --set-upstream-to=<remote>/<branch> ${branch}`), plain('')],
        explain: { kind: 'tip', text: `**${branch}** has no upstream, so Git doesn't know what to rebase onto. Name it, for example \`git rebase main\`.` },
        exitCode: 1,
      };
    }
    label = `refs/remotes/${t.upstream}`;
    onto = repo.remoteRefs[t.upstream] ?? null;
  } else {
    label = pos[0]!;
    onto = resolveRev(repo, label);
    if (onto === null) return { lines: [err(`fatal: invalid upstream '${label}'`)], exitCode: 128 };
  }
  const dirty = dirtyLines(world, repo);
  if (dirty) return { lines: dirty, exitCode: 1 };
  if (op) return { lines: rebaseBusy('rebase'), exitCode: 128 };
  if (!branch) return { lines: [err('error: TermTrek can only rebase a branch. Switch to one first, for example `git switch main`.')], exitCode: 1 };
  if (onto === null || headCommitId(repo) === null) return { lines: [err(`fatal: invalid upstream '${label}'`)], exitCode: 128 };
  return startRebase(world, onto, label);
};
