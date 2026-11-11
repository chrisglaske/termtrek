import type { CommandFn } from '../registry';
import type { OutLine, Span } from '../types';
import type { Repo } from '../types';
import { activeRepo, getStatus, headCommitId, headTree } from './repoState';
import { mergeBase } from './refs';
import { trackingSummary } from './tracking';
import type { Change } from './repoState';
import { rebaseStatusLines } from './rebase';

/** Path of `rel` (repo-relative) as seen from `cwdRel` (repo-relative cwd), with `../` like Git. */
export function relFromCwd(cwdRel: string, rel: string): string {
  const isDir = rel.endsWith('/');
  const base = cwdRel === '' ? [] : cwdRel.split('/');
  const target = (isDir ? rel.slice(0, -1) : rel).split('/');
  let i = 0;
  while (i < base.length && i < (isDir ? target.length : target.length - 1) && base[i] === target[i]) i++;
  const out = '../'.repeat(base.length - i) + target.slice(i).join('/');
  return isDir ? (out === '' ? './' : out.endsWith('/') ? out : out + '/') : out;
}

export const LABEL = { new: 'new file:   ', modified: 'modified:   ', deleted: 'deleted:    ' } as const;
const line = (...spans: Span[]): OutLine => spans;
const muted = (t: string): OutLine => [{ text: t, tone: 'muted' }];
const blank: OutLine = [{ text: '' }];

export type UnmergedCode = 'UU' | 'AA' | 'UD' | 'DU' | 'AU' | 'UA';

/** Long-form `git status` label for each unmerged code. */
const UNMERGED_LABEL: Record<UnmergedCode, string> = {
  UU: 'both modified:   ',
  AA: 'both added:      ',
  UD: 'deleted by them: ',
  DU: 'deleted by us:   ',
  AU: 'added by us:     ',
  UA: 'added by them:   ',
};

/** Where the conflicted merge stands for a path, as Git's short-status code. */
export function unmergedCode(repo: Repo, path: string): UnmergedCode {
  const op = repo.op;
  const headId = headCommitId(repo);
  if (op?.kind === 'rebase') {
    // A rebase replays one commit: its parent is the base, HEAD is ours and the commit is theirs.
    const picked = repo.commits[op.rebase?.current ?? ''];
    const pbase = picked?.parents[0] ? repo.commits[picked.parents[0]]!.tree : {};
    return codeFor(path, pbase, headTree(repo), picked?.tree ?? {});
  }
  const reverted = op?.kind === 'revert' ? repo.commits[op.theirs] : undefined;
  // A revert merges with the reverted commit as base and its parent as "theirs".
  const baseId = reverted ? reverted.id : op && headId ? mergeBase(repo, headId, op.theirs) : null;
  const base = baseId ? repo.commits[baseId]!.tree : {};
  const ours = headTree(repo);
  const theirs = reverted ? (repo.commits[reverted.parents[0] ?? '']?.tree ?? {}) : op ? (repo.commits[op.theirs]?.tree ?? {}) : {};
  return codeFor(path, base, ours, theirs);
}

function codeFor(path: string, base: Record<string, string>, ours: Record<string, string>, theirs: Record<string, string>): UnmergedCode {
  if (!(path in base)) return path in ours && path in theirs ? 'AA' : path in ours ? 'AU' : 'UA';
  if (!(path in theirs)) return 'UD';
  if (!(path in ours)) return 'DU';
  return 'UU';
}

export const gitStatus: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  const st = repo ? getStatus(world) : null;
  if (!repo || !st) return { lines: [], exitCode: 128 }; // dispatcher guards this
  const short = args.includes('-s') || args.includes('--short') || args.includes('-sb');
  const showBranch = args.includes('-b') || args.includes('--branch') || args.includes('-sb');
  const cwdRel = world.cwd === repo.root ? '' : world.cwd.slice(repo.root.length + 1);
  const rel = (p: string) => relFromCwd(cwdRel, p);
  const born = headCommitId(repo) !== null;
  const lines: OutLine[] = [];
  const op = repo.op;
  const conflicts = op ? [...op.conflicts].sort() : [];

  if (short) {
    if (showBranch) {
      const name = st.branch ?? 'HEAD (no branch)';
      const t = born && st.branch ? trackingSummary(repo, st.branch) : null;
      const rel2 = !t ? '' : t.gone ? ' [gone]' : t.ahead || t.behind ? ` [${[t.ahead ? `ahead ${t.ahead}` : '', t.behind ? `behind ${t.behind}` : ''].filter(Boolean).join(', ')}]` : '';
      lines.push([{ text: born ? `## ${name}${t ? `...${t.upstream}${rel2}` : ''}` : `## No commits yet on ${name}` }]);
    }
    const code = (c: Change | undefined, staged: boolean) =>
      !c ? ' ' : c.kind === 'new' ? (staged ? 'A' : '?') : c.kind === 'modified' ? 'M' : 'D';
    const paths = new Set([...st.staged.map((c) => c.path), ...st.unstaged.map((c) => c.path), ...conflicts]);
    for (const p of [...paths].sort()) {
      if (conflicts.includes(p)) {
        lines.push(line({ text: unmergedCode(repo, p), tone: 'warn' }, { text: ' ' + rel(p) }));
        continue;
      }
      const s = st.staged.find((c) => c.path === p);
      const u = st.unstaged.find((c) => c.path === p);
      const spans: Span[] = [];
      spans.push({ text: code(s, true), tone: 'ok' }, { text: code(u, false), tone: 'error' }, { text: ' ' + rel(p) });
      lines.push(spans);
    }
    for (const p of st.untracked) if (!conflicts.includes(p)) lines.push(line({ text: '??', tone: 'error' }, { text: ' ' + rel(p) }));
    return { lines, explain: { kind: 'tip', text: '`git status` is your "where am I?" command.' }, exitCode: 0 };
  }

  if (op?.kind === 'rebase') {
    for (const t of rebaseStatusLines(repo, true)) lines.push(t.startsWith('  (') ? muted(t) : [{ text: t }]);
    lines.push(blank);
  } else lines.push([{ text: st.branch ? `On branch ${st.branch}` : `HEAD detached at ${headCommitId(repo) ?? ''}` }]);
  const track = born && st.branch ? trackingSummary(repo, st.branch) : null;
  if (track) {
    const n = (k: number) => `${k} commit${k === 1 ? '' : 's'}`;
    if (track.gone) lines.push([{ text: `Your branch is based on '${track.upstream}', but the upstream is gone.` }], muted('  (use "git branch --unset-upstream" to fixup)'));
    else if (track.ahead && track.behind) {
      lines.push(
        [{ text: `Your branch and '${track.upstream}' have diverged,` }],
        [{ text: `and have ${track.ahead} and ${track.behind} different commits each, respectively.` }],
        muted('  (use "git pull" if you want to integrate the remote branch with yours)'),
      );
    } else if (track.ahead) {
      lines.push([{ text: `Your branch is ahead of '${track.upstream}' by ${n(track.ahead)}.` }], muted('  (use "git push" to publish your local commits)'));
    } else if (track.behind) {
      lines.push([{ text: `Your branch is behind '${track.upstream}' by ${n(track.behind)}, and can be fast-forwarded.` }], muted('  (use "git pull" to update your local branch)'));
    } else lines.push([{ text: `Your branch is up to date with '${track.upstream}'.` }]);
    lines.push(blank);
  }
  if (!born) lines.push(blank, [{ text: 'No commits yet' }], blank);
  if (op?.kind === 'revert') {
    lines.push(
      [{ text: `You are currently reverting commit ${op.theirs}.` }],
      muted(conflicts.length ? '  (fix conflicts and run "git revert --continue")' : '  (all conflicts fixed: run "git revert --continue")'),
      muted('  (use "git revert --abort" to cancel the revert operation)'),
      blank,
    );
  } else if (op?.kind === 'rebase') {
    // The rebase block is already printed above.
  } else if (op && conflicts.length) {
    lines.push([{ text: 'You have unmerged paths.' }], muted('  (fix conflicts and run "git commit")'), muted('  (use "git merge --abort" to abort the merge)'), blank);
  } else if (op) {
    lines.push([{ text: 'All conflicts fixed but you are still merging.' }], muted('  (use "git commit" to conclude merge)'), blank);
  }
  // Conflicted paths only show under "Unmerged paths".
  const skip = (c: Change) => conflicts.includes(c.path);
  const staged = st.staged.filter((c) => !skip(c));
  const unstaged = st.unstaged.filter((c) => !skip(c));
  const untracked = st.untracked.filter((p) => !conflicts.includes(p));
  if (staged.length) {
    lines.push([{ text: 'Changes to be committed:' }]);
    if (op?.kind !== 'merge') lines.push(muted(born ? '  (use "git restore --staged <file>..." to unstage)' : '  (use "git rm --cached <file>..." to unstage)'));
    for (const c of staged) lines.push(line({ text: '\t' + LABEL[c.kind] + rel(c.path), tone: 'ok' }));
    lines.push(blank);
  }
  if (conflicts.length) {
    lines.push([{ text: 'Unmerged paths:' }]);
    if (op?.kind === 'rebase') lines.push(muted('  (use "git restore --staged <file>..." to unstage)'));
    const codes = conflicts.map((p) => unmergedCode(repo, p));
    const rm = codes.some((c) => c === 'UD' || c === 'DU');
    lines.push(muted(rm ? '  (use "git add/rm <file>..." as appropriate to mark resolution)' : '  (use "git add <file>..." to mark resolution)'));
    conflicts.forEach((p, i) => lines.push(line({ text: '\t' + UNMERGED_LABEL[codes[i]!] + rel(p), tone: 'warn' })));
    lines.push(blank);
  }
  if (unstaged.length) {
    lines.push([{ text: 'Changes not staged for commit:' }]);
    const anyDeleted = unstaged.some((c) => c.kind === 'deleted');
    lines.push(muted(`  (use "git add${anyDeleted ? '/rm' : ''} <file>..." to update what will be committed)`));
    lines.push(muted('  (use "git restore <file>..." to discard changes in working directory)'));
    for (const c of unstaged) lines.push(line({ text: '\t' + LABEL[c.kind === 'new' ? 'modified' : c.kind] + rel(c.path), tone: 'error' }));
    lines.push(blank);
  }
  if (untracked.length) {
    lines.push([{ text: 'Untracked files:' }]);
    lines.push(muted('  (use "git add <file>..." to include in what will be committed)'));
    for (const p of untracked) lines.push(line({ text: '\t' + rel(p), tone: 'error' }));
    lines.push(blank);
  }
  if (op && op.kind !== 'rebase') {
    if (staged.length === 0 && (conflicts.length > 0 || unstaged.length > 0)) {
      lines.push([{ text: 'no changes added to commit (use "git add" and/or "git commit -a")' }]);
    }
  } else if (staged.length === 0 && (unstaged.length > 0 || conflicts.length > 0)) {
    lines.push([{ text: 'no changes added to commit (use "git add" and/or "git commit -a")' }]);
  } else if (staged.length === 0 && untracked.length > 0) {
    lines.push([{ text: 'nothing added to commit but untracked files present (use "git add" to track)' }]);
  } else if (staged.length === 0) {
    lines.push([{ text: born ? 'nothing to commit, working tree clean' : 'nothing to commit (create/copy files and use "git add" to track)' }]);
  }
  return { lines, explain: { kind: 'tip', text: '`git status` is your "where am I?" command.' }, exitCode: 0 };
};
