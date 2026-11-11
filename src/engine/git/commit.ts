import type { CommandFn } from '../registry';
import type { OutLine } from '../types';
import { lineDiff } from '../diffLines';
import { shortId } from '../hash';
import { err, out } from '../shell/fs';
import { activeRepo, headCommitId, headTree, workingFiles } from './repoState';
import { gitStatus } from './status';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export const gitCommit: CommandFn = (world, args, io) => {
  const repo0 = activeRepo(world);
  if (!repo0) return { lines: [], exitCode: 128 };
  let all = false;
  let allowEmpty = false;
  const messages: string[] = [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === '-a' || a === '--all') all = true;
    else if (a === '--allow-empty') allowEmpty = true;
    else if (a === '-m' || a === '-am' || a === '-ma' || a === '--message') {
      if (a !== '-m' && a !== '--message') all = true;
      const v = args[i + 1];
      if (v === undefined) return { lines: [err(`error: switch \`m' requires a value`)], exitCode: 129 };
      messages.push(v);
      i++;
    } else if (a.startsWith('--message=')) messages.push(a.slice(10));
    else if (a.startsWith('-m') && a.length > 2) messages.push(a.slice(2));
    else return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
  }

  const name = world.config['user.name'];
  const email = world.config['user.email'];
  if (!name || !email) {
    const missing = !email ? 'email' : 'name';
    return {
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
  }

  // -a: stage modifications and deletions of tracked files only.
  let index = { ...repo0.index };
  if (all) {
    const work = workingFiles(world, repo0);
    for (const p of Object.keys(index)) {
      if (p in work) index[p] = work[p]!;
      else delete index[p];
    }
  }

  const head = headTree(repo0);
  const paths = [...new Set([...Object.keys(head), ...Object.keys(index)])].sort();
  const changed = paths.filter((p) => head[p] !== index[p]);
  if (changed.length === 0 && !allowEmpty) {
    const st = gitStatus(world, [], io);
    return { lines: st.lines, exitCode: 1 };
  }
  if (messages.length === 0) {
    return {
      lines: [[{ text: 'hint: add a message with -m "Describe your change"', tone: 'muted' }]],
      explain: { kind: 'tip', text: 'Without `-m`, Git opens a text editor for the message. That version comes in a later lesson, so for now add `-m "your message"`.' },
      exitCode: 1,
    };
  }
  if (messages.every((m) => m.trim() === '')) {
    return { lines: [err('Aborting commit due to empty commit message.')], exitCode: 1 };
  }
  const message = messages.join('\n\n');

  const seq = world.seq + 1;
  const parentId = headCommitId(repo0);
  const parents = parentId ? [parentId] : [];
  const id = shortId(parents.join(',') + JSON.stringify(index) + message + seq);
  const commit = { id, parents, tree: { ...index }, message, author: { name, email }, time: seq };
  const branch = repo0.head.kind === 'branch' ? repo0.head.name : null;
  const repo = {
    ...repo0,
    index,
    commits: { ...repo0.commits, [id]: commit },
    branches: branch ? { ...repo0.branches, [branch]: id } : repo0.branches,
    head: branch ? repo0.head : { kind: 'detached' as const, id },
    reflog: [{ id, message: `commit${parentId ? '' : ' (initial)'}: ${message.split('\n')[0]}` }, ...repo0.reflog],
  };

  const summary = message.split('\n')[0]!;
  const where = branch ? (parentId ? branch : `${branch} (root-commit)`) : parentId ? 'detached HEAD' : 'detached HEAD (root-commit)';
  const lines: OutLine[] = [[{ text: `[${where} ` }, { text: id, tone: 'id' }, { text: `] ${summary}` }]];
  let ins = 0;
  let del = 0;
  const modes: string[] = [];
  for (const p of changed) {
    for (const d of lineDiff(head[p] ?? '', index[p] ?? '')) {
      if (d.op === '+') ins++;
      else if (d.op === '-') del++;
    }
    if (!(p in head)) modes.push(` create mode 100644 ${p}`);
    else if (!(p in index)) modes.push(` delete mode 100644 ${p}`);
  }
  if (changed.length) {
    const parts = [plural(changed.length, 'file changed', 'files changed')];
    if (ins) parts.push(plural(ins, 'insertion(+)', 'insertions(+)'));
    if (del) parts.push(plural(del, 'deletion(-)', 'deletions(-)'));
    lines.push([{ text: ' ' + parts.join(', ') }], ...modes.map((m) => [{ text: m }]));
  }
  return {
    world: { ...world, repo, seq },
    lines,
    explain: { kind: 'ok', text: `Snapshot saved as **${id}**. **${branch ?? 'HEAD'}** moved forward to point at it.` },
    exitCode: 0,
  };
};
