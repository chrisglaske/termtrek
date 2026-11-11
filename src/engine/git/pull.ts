import type { CommandFn } from '../registry';
import type { OutLine, RunResult, World } from '../types';
import { err, out } from '../shell/fs';
import { fromUrl } from '../remote/host';
import { fetchInto } from './fetch';
import { isAncestor } from './refs';
import { activeRepo, headCommitId, headTree, workingFiles } from './repoState';
import { startMerge } from './merge';
import { startRebase } from './rebase';

const has = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);
const USAGE = 'usage: git pull [<options>] [<repository> [<refspec>...]]';
const blank: OutLine = [{ text: '' }];

const UNMERGED = [
  err('error: Pulling is not possible because you have unmerged files.'),
  err("hint: Fix them up in the work tree, and then use 'git add/rm <file>'"),
  err('hint: as appropriate to mark resolution and make a commit.'),
  err('fatal: Exiting because of an unresolved conflict.'),
];

const DIVERGENT = [
  'hint: You have divergent branches and need to specify how to reconcile them.',
  'hint: You can do so by running one of the following commands sometime before',
  'hint: your next pull:',
  'hint:',
  'hint:   git config pull.rebase false  # merge',
  'hint:   git config pull.rebase true   # rebase',
  'hint:   git config pull.ff only       # fast-forward only',
  'hint:',
  'hint: You can replace "git config" with "git config --global" to set a default',
  'hint: preference for all repositories. You can also pass --rebase, --no-rebase,',
  'hint: or --ff-only on the command line to override the configured default per',
  'hint: invocation.',
];

const FF_ONLY = [
  "hint: Diverging branches can't be fast-forwarded, you need to either:",
  'hint:',
  'hint: \tgit merge --no-ff',
  'hint:',
  'hint: or:',
  'hint:',
  'hint: \tgit rebase',
];

/** Git's refusal while an operation is running, worded for the kind of operation. */
function busyLines(world: World): OutLine[] | null {
  const op = world.repo!.op;
  if (!op) return null;
  if (op.conflicts.length > 0) return UNMERGED;
  if (op.kind === 'merge') {
    return [err('error: You have not concluded your merge (MERGE_HEAD exists).'), err('hint: Please, commit your changes before merging.'), err('fatal: Exiting because of unfinished merge.')];
  }
  if (op.kind === 'rebase') {
    return [out('You are not currently on a branch.'), out('Please specify which branch you want to merge with.'), out('See git-pull(1) for details.'), blank, out('    git pull <remote> <branch>'), blank];
  }
  return [err(`error: TermTrek can't start a pull while a ${op.kind} is in progress.`), err('hint: Finish it first, or cancel it with "git revert --abort".')];
}

export const gitPull: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let flag: 'rebase' | 'merge' | 'ff-only' | null = null;
  let noFf = false;
  let quiet = false;
  let noEdit = false;
  const pos: string[] = [];
  for (const a of args) {
    if (a === '--rebase' || a === '-r' || a === '--rebase=true') flag = 'rebase';
    else if (a === '--no-rebase' || a === '--rebase=false') flag = 'merge';
    // Like Git, the last of --ff, --no-ff and --ff-only wins.
    else if (a === '--ff-only') [flag, noFf] = ['ff-only', false];
    else if (a === '--no-ff') [flag, noFf] = [flag === 'ff-only' ? null : flag, true];
    else if (a === '--ff') [flag, noFf] = [flag === 'ff-only' ? null : flag, false];
    else if (a === '--no-edit') noEdit = true;
    else if (a === '--edit') noEdit = false;
    else if (a === '-q' || a === '--quiet') quiet = true;
    else if (a === '-v' || a === '--verbose') quiet = false;
    else if (a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`), out(USAGE)], exitCode: 129 };
    else pos.push(a);
  }

  const busy = busyLines(world);
  if (busy) return { lines: busy, exitCode: busy[0]![0]!.text.startsWith('You are') ? 1 : 128 };

  const branch = repo.head.kind === 'branch' ? repo.head.name : null;
  const up = branch && has(repo.upstream, branch) ? repo.upstream[branch]! : null;
  let remoteName: string;
  let wanted: string | null;
  if (pos.length === 0) {
    if (!up) {
      const intro = [out(branch ? 'There is no tracking information for the current branch.' : 'You are not currently on a branch.'), out('Please specify which branch you want to merge with.'), out('See git-pull(1) for details.'), blank, out('    git pull <remote> <branch>'), blank];
      if (!branch) return { lines: intro, exitCode: 1 };
      const first = has(repo.remotes, 'origin') ? 'origin' : (Object.keys(repo.remotes)[0] ?? 'origin');
      return {
        lines: [...intro, out('If you wish to set tracking information for this branch you can do so with:'), blank, out(`    git branch --set-upstream-to=${first}/<branch> ${branch}`), blank],
        explain: { kind: 'tip', text: `**${branch}** isn't linked to a branch on the server, so Git doesn't know what to pull. Name one, for example \`git pull origin main\`.` },
        exitCode: 1,
      };
    }
    remoteName = up.remote;
    wanted = up.branch;
  } else {
    remoteName = pos[0]!;
    wanted = pos[1] ?? null;
  }

  const fetched = fetchInto(world, remoteName, { prune: false });
  if (!fetched.ok) return { lines: fetched.lines, exitCode: fetched.exitCode };
  const fetchLines = quiet ? [] : fetched.lines;
  const w1 = fetched.world;
  const r1 = w1.repo!;
  // -q hides the progress report of a pull that went through; conflicts, errors and the editor prompt still show.
  const done = (r: RunResult): RunResult => ({ ...r, lines: quiet && r.exitCode === 0 && !r.world?.pending ? [] : [...fetchLines, ...r.lines] });
  const fail = (lines: OutLine[], exitCode: number): RunResult => ({ world: w1, lines: [...fetchLines, ...lines], exitCode });

  if (wanted === null) {
    if (up && up.remote === remoteName) wanted = up.branch;
    else {
      return fail([out(`You asked to pull from the remote '${remoteName}', but did not specify`), out('a branch. Because this is not the default configured remote'), out('for your current branch, you must specify a branch on the command line.')], 1);
    }
  }
  const ref = `${remoteName}/${wanted}`;
  if (!has(r1.remoteRefs, ref)) {
    if (pos.length === 0) return fail([out(`Your configuration specifies to merge with the ref 'refs/heads/${wanted}'`), out('from the remote, but no such ref was fetched.')], 1);
    return fail([err(`fatal: couldn't find remote ref ${wanted}`)], 128);
  }
  if (!branch) return fail([err('error: TermTrek can only pull into a branch. Switch to one first, for example `git switch main`.')], 1);

  const tip = r1.remoteRefs[ref]!;
  const headId = headCommitId(r1);
  const mode = flag ?? (world.config['pull.rebase'] === 'true' ? 'rebase' : world.config['pull.rebase'] === 'false' ? 'merge' : world.config['pull.ff'] === 'only' ? 'ff-only' : null);

  if (mode === 'rebase') {
    const head = headTree(r1);
    const work = workingFiles(w1, r1);
    const unstaged = Object.keys(r1.index).some((p) => work[p] !== r1.index[p]);
    const staged = [...new Set([...Object.keys(r1.index), ...Object.keys(head)])].some((p) => r1.index[p] !== head[p]);
    if (headId !== null && (unstaged || staged)) {
      return fail([
        err(`error: cannot pull with rebase: ${unstaged ? 'You have unstaged changes.' : 'Your index contains uncommitted changes.'}`),
        ...(unstaged && staged ? [err('error: additionally, your index contains uncommitted changes.')] : []),
        err('error: Please commit or stash them.'),
      ], 128);
    }
  }

  const message = `Merge branch '${wanted}' of ${fromUrl(r1.remotes[remoteName]!)}${branch === 'main' || branch === 'master' ? '' : ` into ${branch}`}`;
  const merge = (): RunResult => done(startMerge(w1, tip, ref, message, { noFf, noEdit }));

  if (headId === null) return merge();
  if (mode === 'rebase') return done(startRebase(w1, tip, ref));
  if (isAncestor(r1, tip, headId) || isAncestor(r1, headId, tip) || mode === 'merge' || noFf) return merge();

  // Diverged, and nothing says how to reconcile the two lines of work.
  if (mode === 'ff-only') {
    return {
      world: w1,
      lines: [...fetchLines, ...FF_ONLY.map((t) => err(t)), err('fatal: Not possible to fast-forward, aborting.')],
      explain: { kind: 'warn', text: `Your **${branch}** and **${ref}** each have commits the other lacks, so they can't be joined by just sliding forward. Run \`git pull --rebase\` or \`git pull --no-rebase\` to combine them.` },
      exitCode: 128,
    };
  }
  return {
    world: w1,
    lines: [...fetchLines, ...DIVERGENT.map((t) => err(t)), err('fatal: Need to specify how to reconcile divergent branches.')],
    explain: {
      kind: 'warn',
      text: `Your **${branch}** and **${ref}** each have commits the other doesn't, and Git won't guess how to combine them. The download worked, so only the combining is left. Run \`git pull --rebase\` to replay your commits on top of theirs, or \`git pull --no-rebase\` to join the two lines with a merge commit.`,
    },
    exitCode: 128,
  };
};
