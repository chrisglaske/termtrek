import type { CommandFn } from '../registry';
import type { CommitEdit, OutLine, RunResult, World } from '../types';
import { lineDiff } from '../diffLines';
import { shortId } from '../hash';
import { err, out } from '../shell/fs';
import { activeRepo, headCommitId, headTree, workingFiles } from './repoState';
import { logRef } from './refs';
import { formatDate } from './log';
import { EDITOR_WAITING, messageTemplate } from './editor';
import { gitStatus } from './status';

/** Reflog message prefix for an amended commit (used by `git commit --amend`). */
export const AMEND_REFLOG = 'commit (amend)';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const identityError = (world: World): RunResult | null => {
  const name = world.config['user.name'];
  const email = world.config['user.email'];
  if (name && email) return null;
  const missing = !email ? 'email' : 'name';
  return {
    world,
    lines: [
      err('Author identity unknown'),
      out(''),
      out('*** Please tell me who you are.'),
      out(''),
      out('Run'),
      out(''),
      out('  git config --global user.email "you@example.com"'),
      out('  git config --global user.name "Your Name"'),
      out(''),
      out("to set your account's default identity."),
      out('Omit --global to set the identity only in this repository.'),
      out(''),
      err(`fatal: no ${missing} was given and auto-detection is disabled`),
    ],
    explain: { kind: 'tip', text: 'Git signs every commit with your name. Set it once with `git config --global user.name "Your Name"` and `git config --global user.email "you@example.com"`.' },
    exitCode: 128,
  };
};

/** The index a commit would record: `-a` also stages modifications and deletions of tracked files. */
export function commitIndex(world: World, edit: CommitEdit): Record<string, string> {
  const repo = activeRepo(world);
  if (!repo) return {};
  const index = { ...repo.index };
  if (edit.all) {
    const work = workingFiles(world, repo);
    for (const p of Object.keys(index)) {
      if (p in work) index[p] = work[p]!;
      else delete index[p];
    }
  }
  return index;
}

/** The commit tree the new commit is compared against: HEAD, or HEAD's parent when amending. */
export function baseTree(world: World, edit: CommitEdit): Record<string, string> {
  const repo = activeRepo(world);
  if (!repo) return {};
  if (!edit.amend) return headTree(repo);
  const id = headCommitId(repo);
  const old = id ? repo.commits[id] : undefined;
  const parent = old?.parents[0];
  return parent ? { ...repo.commits[parent]!.tree } : {};
}

/** Create the commit for `edit` with `message`, handling amend and in-progress merge/revert. */
export function makeCommit(world: World, message: string, edit: CommitEdit): RunResult {
  const repo0 = activeRepo(world);
  if (!repo0) return { world, lines: [], exitCode: 128 };
  const denied = identityError(world);
  if (denied) return denied;
  const name = world.config['user.name']!;
  const email = world.config['user.email']!;
  const op = repo0.op;
  if (op && op.conflicts.length > 0) {
    return {
      world,
      lines: [
        err('error: Committing is not possible because you have unmerged files.'),
        err("hint: Fix them up in the work tree, and then use 'git add/rm <file>'"),
        err('hint: as appropriate to mark resolution and make a commit.'),
        err('fatal: Exiting because of an unresolved conflict.'),
        ...[...op.conflicts].sort().map((p) => [{ text: `U\t${p}` }]),
      ],
      exitCode: 128,
    };
  }
  const headId = headCommitId(repo0);
  const old = headId ? repo0.commits[headId] : undefined;
  if (edit.amend && !old) return { world, lines: [err('fatal: You have nothing to amend.')], exitCode: 128 };
  if (edit.amend && op) return { world, lines: [err(`fatal: You are in the middle of a ${op.kind} -- cannot amend.`)], exitCode: 128 };

  const index = commitIndex(world, edit);
  const base = baseTree(world, edit);
  const parents = edit.amend ? [...old!.parents] : headId ? (op?.kind === 'merge' ? [headId, op.theirs] : [headId]) : [];
  const seq = world.seq + 1;
  const id = shortId(parents.join(',') + JSON.stringify(index) + message + seq);
  const time = edit.amend ? old!.time : seq;
  const commit = { id, parents, tree: { ...index }, message, author: { name, email }, time };
  const branch = repo0.head.kind === 'branch' ? repo0.head.name : null;
  const summary = message.split('\n')[0]!;
  const reflog = edit.amend
    ? `${AMEND_REFLOG}: ${summary}`
    : op?.kind === 'merge'
      ? `commit (merge): ${summary}`
      : op?.kind === 'revert'
        ? `revert: ${summary}`
        : `commit${headId ? '' : ' (initial)'}: ${summary}`;
  const repo = logRef({
    ...repo0,
    index,
    op: null,
    commits: { ...repo0.commits, [id]: commit },
    branches: branch ? { ...repo0.branches, [branch]: id } : repo0.branches,
    head: branch ? repo0.head : { kind: 'detached' as const, id },
  }, id, reflog);

  const root = parents.length === 0;
  const where = branch ? (root ? `${branch} (root-commit)` : branch) : root ? 'detached HEAD (root-commit)' : 'detached HEAD';
  const lines: OutLine[] = [[{ text: `[${where} ` }, { text: id, tone: 'id' }, { text: `] ${summary}` }]];
  if (edit.amend) lines.push([{ text: ` Date: ${formatDate(old!.time)}` }]);
  if (parents.length < 2) {
    const paths = [...new Set([...Object.keys(base), ...Object.keys(index)])].sort();
    const changed = paths.filter((p) => base[p] !== index[p]);
    let ins = 0;
    let del = 0;
    const modes: string[] = [];
    for (const p of changed) {
      for (const d of lineDiff(base[p] ?? '', index[p] ?? '')) {
        if (d.op === '+') ins++;
        else if (d.op === '-') del++;
      }
      if (!(p in base)) modes.push(` create mode 100644 ${p}`);
      else if (!(p in index)) modes.push(` delete mode 100644 ${p}`);
    }
    if (changed.length) {
      const parts = [plural(changed.length, 'file changed', 'files changed')];
      if (ins) parts.push(plural(ins, 'insertion(+)', 'insertions(+)'));
      if (del) parts.push(plural(del, 'deletion(-)', 'deletions(-)'));
      lines.push([{ text: ' ' + parts.join(', ') }], ...modes.map((m) => [{ text: m }]));
    }
  }
  const reverted = op?.kind === 'revert' ? repo0.commits[op.theirs] : undefined;
  const explain = reverted
    ? { kind: 'ok' as const, text: `Git added a new commit that undoes **${reverted.message.split('\n')[0]}**. History still shows both, so this is safe on shared branches.` }
    : edit.amend
    ? { kind: 'ok' as const, text: `**${branch ?? 'HEAD'}** now points at **${id}**, a replacement for **${old!.id}**. The old commit is still in \`git reflog\`.` }
    : op?.kind === 'merge'
    ? { kind: 'ok' as const, text: `Merge saved as **${id}**. A merge commit has two parents, joining both lines of work, and **${branch ?? 'HEAD'}** now points at it.` }
    : { kind: 'ok' as const, text: `Snapshot saved as **${id}**. **${branch ?? 'HEAD'}** moved forward to point at it.` };
  return { world: { ...world, repo, seq }, lines, explain, exitCode: 0 };
}

export const gitCommit: CommandFn = (world, args, io) => {
  const repo0 = activeRepo(world);
  if (!repo0) return { lines: [], exitCode: 128 };
  const edit: CommitEdit = { amend: false, all: false };
  let allowEmpty = false;
  let noEdit = false;
  const messages: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-a' || a === '--all') edit.all = true;
    else if (a === '--allow-empty') allowEmpty = true;
    else if (a === '--amend') edit.amend = true;
    else if (a === '--no-edit') noEdit = true;
    else if (a === '-m' || a === '-am' || a === '-ma' || a === '--message') {
      if (a !== '-m' && a !== '--message') edit.all = true;
      const v = args[i + 1];
      if (v === undefined) return { lines: [err(`error: switch \`m' requires a value`)], exitCode: 129 };
      messages.push(v);
      i++;
    } else if (a.startsWith('--message=')) messages.push(a.slice(10));
    else if (a.startsWith('-m') && a.length > 2) messages.push(a.slice(2));
    else return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
  }

  const denied = identityError(world);
  if (denied) return denied;

  const op = repo0.op;
  const headId = headCommitId(repo0);
  const old = headId ? repo0.commits[headId] : undefined;
  if (edit.amend && !old) return { lines: [err('fatal: You have nothing to amend.')], exitCode: 128 };
  if (edit.amend && op) return { lines: [err(`fatal: You are in the middle of a ${op.kind} -- cannot amend.`)], exitCode: 128 };

  if (!edit.amend && !op && !allowEmpty) {
    const head = headTree(repo0);
    const index = commitIndex(world, edit);
    const paths = new Set([...Object.keys(head), ...Object.keys(index)]);
    if (![...paths].some((p) => head[p] !== index[p])) {
      const st = gitStatus(world, [], io);
      return { lines: st.lines, exitCode: 1 };
    }
  }

  if (messages.length > 0) {
    if (messages.every((m) => m.trim() === '')) return { lines: [err('Aborting commit due to empty commit message.')], exitCode: 1 };
    return makeCommit(world, messages.join('\n\n'), edit);
  }
  if (noEdit) {
    const kept = op ? op.message : edit.amend ? old!.message : '';
    if (kept.trim() === '') return { lines: [err('Aborting commit due to empty commit message.')], exitCode: 1 };
    return makeCommit(world, kept, edit);
  }
  if (op && op.conflicts.length > 0) return makeCommit(world, op.message, edit); // refuses with Git's conflict message
  const first = op ? op.message : edit.amend ? old!.message : '';
  const text = messageTemplate(world, first, edit);
  return {
    world: { ...world, pending: { file: '.git/COMMIT_EDITMSG', text, action: edit } },
    lines: [[{ text: EDITOR_WAITING, tone: 'muted' }]],
    explain: { kind: 'tip', text: 'Git opened an editor for your commit message. Write it on the first line, then save and close the file. An empty message cancels the commit.' },
    exitCode: 0,
  };
};
