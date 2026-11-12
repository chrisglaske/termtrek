import type { CommandFn } from '../registry';
import type { OutLine } from '../types';
import { err } from '../shell/fs';
import { decorationFor } from './log';
import { activeRepo, headCommitId } from './repoState';

export const gitReflog: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let limit = Infinity;
  for (let i = 0; i < args.length; i++) {
    const a = args[i]!;
    if (a === 'show') continue;
    if (a === '-n' || a === '--max-count') {
      const k = Number(args[++i]);
      if (!Number.isInteger(k) || k < 0) return { lines: [err(`fatal: '${args[i] ?? ''}': not an integer`)], exitCode: 128 };
      limit = k;
    } else if (/^-\d+$/.test(a)) limit = Number(a.slice(1));
    else if (/^-n\d+$/.test(a)) limit = Number(a.slice(2));
    else return { lines: [err(`fatal: unrecognized argument: ${a}`)], exitCode: 128 };
  }
  if (headCommitId(repo) === null && repo.reflog.length === 0) {
    const b = repo.head.kind === 'branch' ? repo.head.name : 'HEAD';
    return { lines: [err(`fatal: your current branch '${b}' does not have any commits yet`)], exitCode: 128 };
  }
  const lines: OutLine[] = repo.reflog.slice(0, limit).map((e, i) => {
    const decor = decorationFor(repo, e.id);
    return [
      { text: e.id, tone: 'id' as const },
      { text: ' ' },
      ...(decor ? [{ text: decor, tone: 'ok' as const }, { text: ' ' }] : []),
      { text: `HEAD@{${i}}: ${e.message}` },
    ];
  });
  return {
    lines,
    explain: { kind: 'tip', text: 'The **reflog** is Git\'s diary of everywhere `HEAD` has been. Even after a reset, an old commit is still listed here. Use `git reset --hard HEAD@{1}` style references to get back to it.' },
    exitCode: 0,
  };
};
