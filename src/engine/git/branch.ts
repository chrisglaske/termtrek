import type { CommandFn } from '../registry';
import type { OutLine, Repo } from '../types';
import { err } from '../shell/fs';
import { isAncestor } from './refs';
import { resolveRev } from './rev';
import { activeRepo, headCommitId } from './repoState';

/** Git's refname rules for a branch name, in the cases a learner is likely to hit. */
export function validBranchName(name: string): boolean {
  if (name === '' || name === '@' || name === 'HEAD' || name.startsWith('-') || name.startsWith('/') || name.endsWith('/') || name.endsWith('.')) return false;
  if (name.includes('..') || name.includes('//') || name.includes('@{') || name.endsWith('.lock')) return false;
  // eslint-disable-next-line no-control-regex
  return !/[\s~^:?*[\\\u0000-\u001f\u007f]/.test(name);
}

export const invalidBranchName = (name: string): OutLine[] => [
  err(`fatal: '${name}' is not a valid branch name`),
  err("hint: See 'git help check-ref-format'"),
];

export const hasBranch = (repo: Repo, name: string): boolean => Object.prototype.hasOwnProperty.call(repo.branches, name);

export const gitBranch: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let del: 'd' | 'D' | null = null;
  let move = false;
  const names: string[] = [];
  let dashdash = false;
  for (const a of args) {
    if (!dashdash && a === '--') dashdash = true;
    else if (!dashdash && (a === '-d' || a === '--delete')) del = del ?? 'd';
    else if (!dashdash && (a === '-D')) del = 'D';
    else if (!dashdash && (a === '-m' || a === '--move' || a === '-M')) move = true;
    else if (!dashdash && a === '-f') del = del === 'd' ? 'D' : del;
    else if (!dashdash && a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
    else names.push(a);
  }
  const headId = headCommitId(repo);
  const current = repo.head.kind === 'branch' ? repo.head.name : null;

  if (del) {
    if (names.length === 0) return { lines: [err('fatal: branch name required')], exitCode: 128 };
    const branches = { ...repo.branches };
    const lines: OutLine[] = [];
    let code = 0;
    for (const n of names) {
      const tip = hasBranch(repo, n) ? repo.branches[n] : undefined;
      if (tip === undefined) {
        lines.push(err(`error: branch '${n}' not found`));
        code = 1;
      } else if (n === current) {
        lines.push(err(`error: cannot delete branch '${n}' used by worktree at '${repo.root}'`));
        code = 1;
      } else if (tip !== null && del === 'd' && !(headId !== null && isAncestor(repo, tip, headId))) {
        lines.push(err(`error: the branch '${n}' is not fully merged`), err(`hint: If you are sure you want to delete it, run 'git branch -D ${n}'`));
        code = 1;
      } else {
        delete branches[n];
        lines.push([{ text: `Deleted branch ${n} (was ` }, { text: tip ?? '', tone: 'id' }, { text: ').' }]);
      }
    }
    const deleted = lines.some((l) => l[0]!.text.startsWith('Deleted'));
    return {
      world: deleted ? { ...world, repo: { ...repo, branches } } : undefined,
      lines,
      explain: deleted
        ? { kind: 'ok', text: 'Deleted the branch label. Its commits are not erased: if another branch or `git reflog` still reaches them, they are still there.' }
        : code
          ? { kind: 'warn', text: 'Git refuses to delete a branch whose commits no other branch has. Merge it first, or use `git branch -D` if you are sure you want to throw it away.' }
          : undefined,
      exitCode: code,
    };
  }

  if (move) {
    const [oldName, newName] = names.length >= 2 ? [names[0]!, names[1]!] : [current, names[0]];
    if (names.length === 0) return { lines: [err('fatal: branch name required')], exitCode: 128 };
    if (names.length > 2) return { lines: [err('fatal: too many arguments')], exitCode: 128 };
    if (oldName === null || oldName === undefined) return { lines: [err('fatal: cannot rename the current branch while not on any.')], exitCode: 128 };
    if (!hasBranch(repo, oldName)) return { lines: [err(`fatal: no branch named '${oldName}'`)], exitCode: 128 };
    if (!validBranchName(newName!)) return { lines: invalidBranchName(newName!), exitCode: 128 };
    if (hasBranch(repo, newName!) && newName !== oldName) return { lines: [err(`fatal: a branch named '${newName}' already exists`)], exitCode: 128 };
    const branches: Record<string, string | null> = {};
    for (const [k, v] of Object.entries(repo.branches)) branches[k === oldName ? newName! : k] = v;
    const next: Repo = { ...repo, branches, head: current === oldName ? { kind: 'branch', name: newName! } : repo.head };
    return {
      world: { ...world, repo: next },
      lines: [],
      explain: { kind: 'ok', text: `Renamed **${oldName}** to **${newName}**. The commits are unchanged, only the label moved.` },
      exitCode: 0,
    };
  }

  if (names.length === 0) {
    const lines: OutLine[] = [];
    if (repo.head.kind === 'detached') lines.push([{ text: '* (HEAD detached at ' }, { text: repo.head.id, tone: 'id' }, { text: ')' }]);
    for (const n of Object.keys(repo.branches).sort()) {
      if (repo.branches[n] === null) continue;
      lines.push(n === current ? [{ text: '* ' + n, tone: 'ok' }] : [{ text: '  ' + n }]);
    }
    return {
      lines,
      explain: { kind: 'tip', text: 'These are your branches. The one with the **star** is where you are now. Use `git switch <name>` to move to another.' },
      exitCode: 0,
    };
  }

  const [name, start] = names;
  if (names.length > 2) return { lines: [err('fatal: too many arguments')], exitCode: 128 };
  if (!validBranchName(name!)) return { lines: invalidBranchName(name!), exitCode: 128 };
  if (hasBranch(repo, name!)) return { lines: [err(`fatal: a branch named '${name}' already exists`)], exitCode: 128 };
  const startId = start === undefined ? headId : resolveRev(repo, start);
  if (startId === null) {
    return { lines: [err(`fatal: not a valid object name: '${start ?? current ?? 'HEAD'}'`)], exitCode: 128 };
  }
  return {
    world: { ...world, repo: { ...repo, branches: { ...repo.branches, [name!]: startId } } },
    lines: [],
    explain: { kind: 'ok', text: `Created **${name}** pointing at **${startId}**. You are still on **${current ?? 'a detached HEAD'}**. Use \`git switch ${name}\` to move onto it.` },
    exitCode: 0,
  };
};
