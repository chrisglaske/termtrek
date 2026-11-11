import type { CommandFn } from '../registry';
import type { OutLine, Repo } from '../types';
import { err } from '../shell/fs';
import { isAncestor } from './refs';
import { resolveRev } from './rev';
import { activeRepo, headCommitId } from './repoState';
import { parseRemoteRef, setUpstream, TRACK_LINE, trackingSummary } from './tracking';

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
  let verbose = 0;
  let remotes = false;
  let all = false;
  let upstreamTo: string | null = null;
  const names: string[] = [];
  let dashdash = false;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (!dashdash && a === '--') dashdash = true;
    else if (!dashdash && (a === '-v' || a === '--verbose')) verbose += 1;
    else if (!dashdash && a === '-vv') verbose += 2;
    else if (!dashdash && (a === '-r' || a === '--remotes')) remotes = true;
    else if (!dashdash && (a === '-a' || a === '--all')) all = true;
    else if (!dashdash && a.startsWith('--set-upstream-to=')) upstreamTo = a.slice('--set-upstream-to='.length);
    else if (!dashdash && (a === '-u' || a === '--set-upstream-to')) {
      const v = args[++i];
      if (v === undefined) return { lines: [err(`error: switch \`u' requires a value`)], exitCode: 129 };
      upstreamTo = v;
    }
    else if (!dashdash && (a === '-d' || a === '--delete')) del = del ?? 'd';
    else if (!dashdash && (a === '-D')) del = 'D';
    else if (!dashdash && (a === '-m' || a === '--move' || a === '-M')) move = true;
    else if (!dashdash && a === '-f') del = del === 'd' ? 'D' : del;
    else if (!dashdash && a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
    else names.push(a);
  }
  const headId = headCommitId(repo);
  const current = repo.head.kind === 'branch' ? repo.head.name : null;

  if (upstreamTo !== null) {
    if (names.length > 1) return { lines: [err('fatal: too many arguments to set new upstream')], exitCode: 128 };
    const up = parseRemoteRef(repo, upstreamTo);
    if (!up) return { lines: [err(`fatal: the requested upstream branch '${upstreamTo}' does not exist`)], exitCode: 128 };
    const target = names[0] ?? current;
    if (target === null) return { lines: [err(`fatal: could not set upstream of HEAD to '${upstreamTo}' when it does not point to any branch.`)], exitCode: 128 };
    if (!hasBranch(repo, target) || repo.branches[target] === null) return { lines: [err(`fatal: branch '${target}' does not exist`)], exitCode: 128 };
    return {
      world: { ...world, repo: setUpstream(repo, target, up) },
      lines: [[{ text: TRACK_LINE(target, up) }]],
      explain: { kind: 'ok', text: `**${target}** now follows **${up.remote}/${up.branch}**. That is how \`git status\`, \`git pull\` and \`git push\` know which remote branch to compare against.` },
      exitCode: 0,
    };
  }

  if (del) {
    if (names.length === 0) return { lines: [err('fatal: branch name required')], exitCode: 128 };
    const branches = { ...repo.branches };
    const upstream = { ...repo.upstream };
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
        delete upstream[n];
        lines.push([{ text: `Deleted branch ${n} (was ` }, { text: tip ?? '', tone: 'id' }, { text: ').' }]);
      }
    }
    const deleted = lines.some((l) => l[0]!.text.startsWith('Deleted'));
    return {
      world: deleted ? { ...world, repo: { ...repo, branches, upstream } } : undefined,
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
    const upstream: Repo['upstream'] = {};
    for (const [k, v] of Object.entries(repo.upstream)) upstream[k === oldName ? newName! : k] = v;
    const next: Repo = { ...repo, branches, upstream, head: current === oldName ? { kind: 'branch', name: newName! } : repo.head };
    return {
      world: { ...world, repo: next },
      lines: [],
      explain: { kind: 'ok', text: `Renamed **${oldName}** to **${newName}**. The commits are unchanged, only the label moved.` },
      exitCode: 0,
    };
  }

  if (names.length === 0 || remotes || all) {
    const lines: OutLine[] = [];
    const remoteLines = (prefix: string): OutLine[] => {
      const rows: OutLine[] = [];
      const keys = Object.keys(repo.remoteRefs).sort();
      if (repo.originHead !== null && keys.includes(`origin/${repo.originHead}`)) rows.push([{ text: `  ${prefix}origin/HEAD -> origin/${repo.originHead}`, tone: 'warn' }]);
      for (const k of keys) rows.push([{ text: `  ${prefix}${k}`, tone: 'warn' }]);
      return rows;
    };
    if (!remotes) {
      const shown = Object.keys(repo.branches).sort().filter((n) => repo.branches[n] !== null);
      const detached = repo.head.kind === 'detached' ? `(HEAD detached at ${repo.head.id})` : null;
      const width = Math.max(detached?.length ?? 0, ...shown.map((n) => n.length));
      const row = (label: string, id: string | null, star: boolean, branch: string | null): OutLine => {
        const mark = star ? '* ' : '  ';
        if (!verbose) return star ? [{ text: mark + label, tone: 'ok' }] : [{ text: mark + label }];
        const sum = verbose > 1 && branch !== null ? trackingSummary(repo, branch) : null;
        const bracket = sum ? ` [${sum.upstream}${sum.gone ? ': gone' : sum.ahead || sum.behind ? ': ' + [sum.ahead ? `ahead ${sum.ahead}` : '', sum.behind ? `behind ${sum.behind}` : ''].filter(Boolean).join(', ') : ''}]` : '';
        return [
          { text: mark + label.padEnd(width) + ' ', tone: star ? 'ok' : undefined },
          { text: id ?? '', tone: 'id' },
          { text: bracket + ' ' + (id ? repo.commits[id]!.message.split('\n')[0]! : '') },
        ];
      };
      if (detached) lines.push(row(detached, headCommitId(repo), true, null));
      for (const n of shown) lines.push(row(n, repo.branches[n]!, n === current, n));
    }
    if (remotes) lines.push(...remoteLines(''));
    else if (all) lines.push(...remoteLines('remotes/'));
    return {
      lines,
      explain: remotes || all
        ? { kind: 'tip', text: 'The `origin/...` names are **remote-tracking branches**: your last-known copy of the server\'s branches. They only move when you fetch or pull.' }
        : verbose > 1
          ? { kind: 'tip', text: 'The part in **[brackets]** is the remote branch each local branch follows, and how far apart the two are.' }
          : { kind: 'tip', text: 'These are your branches. The one with the **star** is where you are now. Use `git switch <name>` to move to another.' },
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
