import type { CommandFn } from '../registry';
import type { OutLine, World } from '../types';
import { resolvePath } from '../paths';
import { err, out } from '../shell/fs';
import { activeRepo, headTree, workingFiles } from './repoState';
import { matchPathspecs, writeWork } from './worktree';

const HINT_BOTH_OR_STAGED = '(use --cached to keep the file, or -f to force removal)';

function list(paths: string[], one: string, many: string, tail: string): OutLine[] {
  const head = paths.length === 1 ? one : many;
  return [...head.split('\n').map((l) => err(l)), ...paths.map((p) => err(`    ${p}`)), err(tail)];
}

/** Drop folders left empty by removed files (real Git does the same). */
function pruneDirs(world: World, rootAbs: string, removed: string[]): World {
  let dirs = world.dirs;
  const files = Object.keys(world.files);
  const candidates = new Set<string>();
  for (const p of removed) {
    let abs = `${rootAbs}/${p}`;
    for (;;) {
      abs = abs.slice(0, abs.lastIndexOf('/'));
      if (abs.length <= rootAbs.length) break;
      candidates.add(abs);
    }
  }
  for (const d of [...candidates].sort((a, b) => b.length - a.length)) {
    const used = files.some((f) => f.startsWith(d + '/')) || dirs.some((x) => x.startsWith(d + '/'));
    if (!used) dirs = dirs.filter((x) => x !== d);
  }
  return { ...world, dirs };
}

export const gitRm: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let cached = false;
  let force = false;
  let recursive = false;
  let dry = false;
  let quiet = false;
  let ignoreUnmatch = false;
  const specs: string[] = [];
  let dashdash = false;
  for (const a of args) {
    if (!dashdash && a === '--') dashdash = true;
    else if (!dashdash && a === '--cached') cached = true;
    else if (!dashdash && a === '--force') force = true;
    else if (!dashdash && a === '--dry-run') dry = true;
    else if (!dashdash && a === '--quiet') quiet = true;
    else if (!dashdash && a === '--ignore-unmatch') ignoreUnmatch = true;
    else if (!dashdash && /^-[frnq]+$/.test(a)) {
      for (const c of a.slice(1)) {
        if (c === 'f') force = true;
        else if (c === 'r') recursive = true;
        else if (c === 'n') dry = true;
        else quiet = true;
      }
    } else if (!dashdash && a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
    else specs.push(a);
  }
  if (specs.length === 0) return { lines: [err('fatal: No pathspec was given. Which files should I remove?')], exitCode: 128 };

  const m = matchPathspecs(world, repo, specs, Object.keys(repo.index));
  if ('outside' in m) return { lines: [err(`fatal: ${m.outside}: '${m.outside}' is outside repository at '${repo.root}'`)], exitCode: 128 };
  if ('missing' in m) {
    if (ignoreUnmatch) return { lines: [], exitCode: 0 };
    return { lines: [err(`fatal: pathspec '${m.missing}' did not match any files`)], exitCode: 128 };
  }
  if (!recursive) {
    for (const s of specs) {
      const abs = resolvePath(world, s);
      const rel = abs === repo.root ? '' : abs.slice(repo.root.length + 1);
      if (rel === '' || !(rel in repo.index) || s.endsWith('/')) {
        return { lines: [err(`fatal: not removing '${s}' recursively without -r`)], exitCode: 128 };
      }
    }
  }

  if (!force) {
    const head = headTree(repo);
    const work = workingFiles(world, repo);
    const both: string[] = [];
    const staged: string[] = [];
    const local: string[] = [];
    for (const p of m.paths) {
      const stagedChange = head[p] !== repo.index[p];
      const localChange = p in work && work[p] !== repo.index[p];
      if (stagedChange && localChange) both.push(p);
      else if (!cached) {
        if (stagedChange) staged.push(p);
        if (localChange) local.push(p);
      }
    }
    const lines: OutLine[] = [
      ...(both.length ? list(both, 'error: the following file has staged content different from both the\nfile and the HEAD:', 'error: the following files have staged content different from both the\nfile and the HEAD:', '(use -f to force removal)') : []),
      ...(staged.length ? list(staged, 'error: the following file has changes staged in the index:', 'error: the following files have changes staged in the index:', HINT_BOTH_OR_STAGED) : []),
      ...(local.length ? list(local, 'error: the following file has local modifications:', 'error: the following files have local modifications:', HINT_BOTH_OR_STAGED) : []),
    ];
    if (lines.length) return { lines, exitCode: 1 };
  }

  const lines = quiet ? [] : m.paths.map((p) => out(`rm '${p}'`));
  if (dry) return { lines, exitCode: 0 };
  const index = { ...repo.index };
  let next = world;
  for (const p of m.paths) {
    delete index[p];
    if (!cached) next = writeWork(next, repo, p, undefined);
  }
  if (!cached) next = pruneDirs(next, repo.root, m.paths);
  const what = m.paths.length === 1 ? `**${m.paths[0]}**` : `${m.paths.length} files`;
  const text = cached
    ? `Took ${what} out of the staging area but left it in your folder. Git will no longer track it, so it shows as untracked until you commit the removal.`
    : `Deleted ${what} from your folder and staged the deletion. It disappears from the project once you commit.`;
  return { world: { ...next, repo: { ...repo, index } }, lines, explain: { kind: 'ok', text }, exitCode: 0 };
};
