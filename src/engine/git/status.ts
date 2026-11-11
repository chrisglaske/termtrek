import type { CommandFn } from '../registry';
import type { OutLine, Span } from '../types';
import { activeRepo, getStatus, headCommitId } from './repoState';
import type { Change } from './repoState';

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

const LABEL = { new: 'new file:   ', modified: 'modified:   ', deleted: 'deleted:    ' } as const;
const line = (...spans: Span[]): OutLine => spans;
const muted = (t: string): OutLine => [{ text: t, tone: 'muted' }];
const blank: OutLine = [{ text: '' }];

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

  if (short) {
    if (showBranch) {
      const name = st.branch ?? 'HEAD (no branch)';
      lines.push([{ text: born ? `## ${name}` : `## No commits yet on ${name}` }]);
    }
    const code = (c: Change | undefined, staged: boolean) =>
      !c ? ' ' : c.kind === 'new' ? (staged ? 'A' : '?') : c.kind === 'modified' ? 'M' : 'D';
    const paths = new Set([...st.staged.map((c) => c.path), ...st.unstaged.map((c) => c.path)]);
    for (const p of [...paths].sort()) {
      const s = st.staged.find((c) => c.path === p);
      const u = st.unstaged.find((c) => c.path === p);
      const spans: Span[] = [];
      spans.push({ text: code(s, true), tone: 'ok' }, { text: code(u, false), tone: 'error' }, { text: ' ' + rel(p) });
      lines.push(spans);
    }
    for (const p of st.untracked) lines.push(line({ text: '??', tone: 'error' }, { text: ' ' + rel(p) }));
    return { lines, explain: { kind: 'tip', text: '`git status` is your "where am I?" command.' }, exitCode: 0 };
  }

  lines.push([{ text: st.branch ? `On branch ${st.branch}` : `HEAD detached at ${headCommitId(repo) ?? ''}` }]);
  if (!born) lines.push(blank, [{ text: 'No commits yet' }], blank);
  if (st.staged.length) {
    lines.push([{ text: 'Changes to be committed:' }]);
    lines.push(muted(born ? '  (use "git restore --staged <file>..." to unstage)' : '  (use "git rm --cached <file>..." to unstage)'));
    for (const c of st.staged) lines.push(line({ text: '\t' + LABEL[c.kind] + rel(c.path), tone: 'ok' }));
    lines.push(blank);
  }
  if (st.unstaged.length) {
    lines.push([{ text: 'Changes not staged for commit:' }]);
    const anyDeleted = st.unstaged.some((c) => c.kind === 'deleted');
    lines.push(muted(`  (use "git add${anyDeleted ? '/rm' : ''} <file>..." to update what will be committed)`));
    lines.push(muted('  (use "git restore <file>..." to discard changes in working directory)'));
    for (const c of st.unstaged) lines.push(line({ text: '\t' + LABEL[c.kind === 'new' ? 'modified' : c.kind] + rel(c.path), tone: 'error' }));
    lines.push(blank);
  }
  if (st.untracked.length) {
    lines.push([{ text: 'Untracked files:' }]);
    lines.push(muted('  (use "git add <file>..." to include in what will be committed)'));
    for (const p of st.untracked) lines.push(line({ text: '\t' + rel(p), tone: 'error' }));
    lines.push(blank);
  }
  if (st.staged.length === 0 && st.unstaged.length > 0) {
    lines.push([{ text: 'no changes added to commit (use "git add" and/or "git commit -a")' }]);
  } else if (st.staged.length === 0 && st.untracked.length > 0) {
    lines.push([{ text: 'nothing added to commit but untracked files present (use "git add" to track)' }]);
  } else if (st.staged.length === 0) {
    lines.push([{ text: born ? 'nothing to commit, working tree clean' : 'nothing to commit (create/copy files and use "git add" to track)' }]);
  }
  return { lines, explain: { kind: 'tip', text: '`git status` is your "where am I?" command.' }, exitCode: 0 };
};
