import type { CommandFn } from '../registry';
import { err } from '../shell/fs';
import { activeRepo, headTree, workingFiles } from './repoState';
import { matchPathspecs, writeWork } from './worktree';

export const gitRestore: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let staged = false;
  let worktree = false;
  const specs: string[] = [];
  let dashdash = false;
  for (const a of args) {
    if (!dashdash && a === '--') dashdash = true;
    else if (!dashdash && (a === '--staged' || a === '-S')) staged = true;
    else if (!dashdash && (a === '--worktree' || a === '-W')) worktree = true;
    else if (!dashdash && (a === '-SW' || a === '-WS')) staged = worktree = true;
    else if (!dashdash && a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
    else specs.push(a);
  }
  if (!staged) worktree = true;
  if (specs.length === 0) return { lines: [err('fatal: you must specify path(s) to restore')], exitCode: 128 };

  const head = headTree(repo);
  const known = staged ? [...Object.keys(head), ...Object.keys(repo.index)] : Object.keys(repo.index);
  const m = matchPathspecs(world, repo, specs, known);
  if ('outside' in m) return { lines: [err(`fatal: ${m.outside}: '${m.outside}' is outside repository at '${repo.root}'`)], exitCode: 128 };
  if ('missing' in m) return { lines: [err(`error: pathspec '${m.missing}' did not match any file(s) known to git`)], exitCode: 1 };

  const unmerged = repo.op?.conflicts ?? [];
  const stuck = m.paths.find((p) => unmerged.includes(p));
  if (stuck !== undefined) return { lines: [err(`error: path '${stuck}' is unmerged`)], exitCode: 1 };

  const source = staged ? head : repo.index;
  const index = { ...repo.index };
  let next = world;
  const lost: string[] = [];
  const work = workingFiles(world, repo);
  for (const p of m.paths) {
    if (staged) {
      if (p in head) index[p] = head[p]!;
      else delete index[p];
    }
    if (worktree && (p in source || staged)) {
      const want = source[p];
      if (work[p] !== want) lost.push(p);
      next = writeWork(next, repo, p, want);
    }
  }
  const what = m.paths.length === 1 ? `**${m.paths[0]}**` : specs.map((s) => `**${s}**`).join(', ');
  let text: string;
  if (staged && worktree) text = `Reset ${what} in the staging area and in your folder to match the last commit. Any edits that weren't committed are gone.`;
  else if (staged) text = `Unstaged ${what}. The file in your folder is untouched, so your edits are safe, they just aren't in the next commit.`;
  else text = `Put ${what} back to how it was in the staging area. The edit you discarded is gone for good, because Git never saved it.`;
  return {
    world: { ...next, repo: { ...repo, index } },
    lines: [],
    explain: { kind: staged && !worktree ? 'ok' : 'warn', text },
    exitCode: 0,
  };
};
