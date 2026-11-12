import type { CommandFn } from '../registry';
import { resolvePath } from '../paths';
import { err, isDir } from '../shell/fs';
import { activeRepo, ignorePatterns, workingFiles } from './repoState';
import { isIgnored } from './ignore';

export const gitAdd: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let all = false;
  let force = false;
  let update = false;
  const specs: string[] = [];
  let dashdash = false;
  for (const a of args) {
    if (!dashdash && a === '--') dashdash = true;
    else if (!dashdash && (a === '-A' || a === '--all')) all = true;
    else if (!dashdash && (a === '-f' || a === '--force')) force = true;
    else if (!dashdash && (a === '-u' || a === '--update')) update = true;
    else if (!dashdash && a.startsWith('-') && a.length > 1) return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`)], exitCode: 129 };
    else specs.push(a);
  }
  if (specs.length === 0 && !all && !update) {
    return {
      lines: [[{ text: 'Nothing specified, nothing added.' }], [{ text: "hint: Maybe you wanted to say 'git add .'?", tone: 'muted' }]],
      exitCode: 0,
    };
  }
  const work = workingFiles(world, repo);
  const patterns = ignorePatterns(world, repo);
  const index = { ...repo.index };
  const rootPrefix = repo.root + '/';
  const ignoredHit: string[] = [];
  const staged = new Set<string>();

  const touched = new Set<string>();
  const stage = (p: string) => {
    touched.add(p);
    if (p in work) {
      if (index[p] !== work[p]) staged.add(p);
      index[p] = work[p]!;
    } else if (p in index) {
      delete index[p];
      staged.add(p);
    }
  };

  const targets: { abs: string; label: string }[] = [];
  if (all || update) targets.push({ abs: repo.root, label: '.' });
  for (const s of specs) targets.push({ abs: resolvePath(world, s), label: s });

  for (const t of targets) {
    const isRoot = t.abs === repo.root;
    if (!isRoot && !t.abs.startsWith(rootPrefix)) {
      return { lines: [err(`fatal: ${t.label}: '${t.label}' is outside repository at '${repo.root}'`)], exitCode: 128 };
    }
    const rel = isRoot ? '' : t.abs.slice(rootPrefix.length);
    const inside = (p: string) => rel === '' || p === rel || p.startsWith(rel + '/');
    const unmerged = repo.op?.conflicts ?? [];
    const candidates = new Set([...Object.keys(work), ...Object.keys(index), ...unmerged].filter(inside));
    const exact = rel in work || rel in index || unmerged.includes(rel);
    if (candidates.size === 0 && !exact && !isDir(world, t.abs)) {
      return { lines: [err(`fatal: pathspec '${t.label}' did not match any files`)], exitCode: 128 };
    }
    for (const p of [...candidates].sort()) {
      if (update && !(p in index)) continue;
      const untrackedIgnored = !(p in index) && isIgnored(patterns, p);
      if (untrackedIgnored && !force) {
        if (p === rel) ignoredHit.push(t.label);
        continue;
      }
      stage(p);
    }
  }

  // Staging a conflicted path marks it resolved.
  const op = repo.op && repo.op.conflicts.length ? { ...repo.op, conflicts: repo.op.conflicts.filter((p) => !touched.has(p)) } : repo.op;
  const world2 = { ...world, repo: { ...repo, index, op } };
  if (ignoredHit.length) {
    return {
      world: world2,
      lines: [
        [{ text: 'The following paths are ignored by one of your .gitignore files:', tone: 'error' }],
        ...ignoredHit.map((p) => [{ text: p, tone: 'error' as const }]),
        [{ text: 'hint: Use -f if you really want to add them.', tone: 'muted' }],
        [{ text: 'hint: Turn this message off by running', tone: 'muted' }],
        [{ text: 'hint: "git config advice.addIgnoredFile false"', tone: 'muted' }],
      ],
      exitCode: 1,
    };
  }
  const label = specs.length ? specs.join(', ') : all ? '-A' : '-u';
  const everything = !update && (all || specs.includes('.'));
  return {
    world: world2,
    lines: [],
    explain: { kind: 'ok', text: `Staged **${everything ? 'everything in this folder' : label}**. Staging is like packing a box: you choose what goes into the next commit.` },
    exitCode: 0,
  };
};
