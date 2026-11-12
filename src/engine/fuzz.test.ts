import { createWorld } from './world';
import { runLine } from './interpreter';
import { buildWorld } from './setup';
import { teammatePush } from './remote/teammate';
import { CLONED } from '../lessons/team/setups';
import type { PullRequest, RemoteSetup, World } from './types';

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

const BASE_PIECES = ['pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'echo', 'rm', 'clear', 'help', 'git', 'git init', 'git status', 'git add', 'git config', 'git add .', 'git commit -m', 'git commit -am', 'git log', 'git log --oneline', 'git diff', 'git diff --staged', 'git config user.name', 'status',
  '-a', '-p', '-r', '-rf', '/', '..', '~', 'a', 'b/c', '"', "'", '&&', ';', '|', '||', '>', '>>', '\\', '🙂', ' ', '  ', '\t'];

const BUSY_PIECES = [...BASE_PIECES,
  'git restore', 'git reset', 'git reflog', 'git branch', 'git switch', 'git checkout', 'git merge', 'git stash', 'git revert',
  '--hard', '--soft', '--abort', '--continue', '-c', '-d', '-D', '--no-edit', '--amend',
  'HEAD~1', 'HEAD@{1}', 'main', 'feature', 'notes.txt'];

const REMOTE_PIECES = [...BUSY_PIECES,
  'git clone', 'git remote', 'git fetch', 'git push', 'git pull', 'git rebase', 'git remote add', 'git remote -v',
  '-u', '--rebase', '--no-rebase', '--ff-only', '--continue', '--abort', '--skip', '--force-with-lease', '--prune', 'origin', 'upstream', 'origin/main', 'https://git.example.com/team/notes.git', 'FETCH_HEAD'];

function randomLines(seed: number, pieces: string[]): string[] {
  const rand = rng(seed);
  const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)]!;
  const lines: string[] = ['', 'a'.repeat(5000), '&&'.repeat(2500), '"'.repeat(5001)];
  while (lines.length < 500) {
    const n = Math.floor(rand() * 8);
    lines.push(Array.from({ length: n }, () => pick(pieces)).join(rand() < 0.7 ? ' ' : ''));
  }
  return lines;
}

function check(worlds: World[], lines: string[]) {
  for (const line of lines) {
    for (const w of worlds) {
      expect(() => runLine(w, line)).not.toThrow();
      const r = runLine(w, line);
      expect(typeof r.exitCode).toBe('number');
      for (const l of r.lines) expect(l.map((s) => s.text).join('')).not.toContain('internal error');
    }
  }
}

describe('fuzz', () => {
  it('fuzz: never throws', () => {
    check([
      createWorld(),
      createWorld({ cwd: 'p', repo: { at: 'p', commits: [{ message: 'm', files: { 'a.txt': '1' } }] }, files: { 'p/.gitignore': 'a\n' } }),
    ], randomLines(42, BASE_PIECES));
  });

  it('busy worlds', () => {
    const config = { 'user.name': 'Sam', 'user.email': 's@x.com' };
    const branched = buildWorld({
      cwd: 'p',
      config,
      repo: { at: 'p' },
      files: { 'p/notes.txt': 'base\n' },
      run: ['git add .', 'git commit -m "c1"', 'git switch -c feature', 'echo theirs > notes.txt', 'git commit -am "f1"', 'git switch main', 'echo ours > notes.txt', 'git commit -am "m1"'],
    });
    // buildWorld throws on a failing line, so the conflicted merge runs through runLine directly.
    const conflicted = runLine(branched, 'git merge feature').world;
    expect(conflicted.repo!.op?.conflicts).toEqual(['notes.txt']);
    expect(runLine(conflicted, 'git reset --hard').world.repo!.op).toBeNull();
    const pending = runLine(runLine(conflicted, 'git add notes.txt').world, 'git commit').world;
    expect(pending.pending).toBeDefined();
    const stashed = runLine(buildWorld({
      cwd: 'p',
      config,
      repo: { at: 'p' },
      files: { 'p/notes.txt': 'base\n' },
      run: ['git add .', 'git commit -m "c1"', 'echo wip > notes.txt', 'echo u > new.txt'],
    }), 'git stash -u').world;
    expect(stashed.repo!.stash).toHaveLength(1);
    check([branched, conflicted, pending, stashed], randomLines(7, BUSY_PIECES));
  });

  it('fuzz: remote worlds', () => {
    const URL = 'https://git.example.com/team/notes.git';
    const remote: RemoteSetup = { slug: 'team/notes', commits: [{ message: 'Add notes', files: { 'notes.txt': 'one\n' } }, { message: 'Add readme', files: { 'README.md': '# hi\n' } }] };
    const ALEX = { name: 'Alex Kim', email: 'alex@example.com' };
    const mate = (files: Record<string, string>) => teammatePush({ branch: 'main', message: 'Alex edit', files, author: ALEX });
    const base = (run: (string | ((w: World) => World))[]) => buildWorld({ config: { 'user.name': 'Sam', 'user.email': 's@x.com' }, remote, run: [`git clone ${URL}`, 'cd notes', ...run] });
    const cloned = base([]);
    const diverged = base([mate({ 'alex.txt': 'hi\n' }), 'echo mine > mine.txt', 'git add .', 'git commit -m "My edit"']);
    const clash = base([mate({ 'notes.txt': 'alex\n' }), 'echo mine > notes.txt', 'git add .', 'git commit -m "My notes"']);
    const midRebase = runLine(clash, 'git pull --rebase').world;
    expect(midRebase.repo!.op?.kind).toBe('rebase');
    expect(midRebase.repo!.op!.conflicts).toEqual(['notes.txt']);
    // an open pull request, built by hand: a pushed branch plus its PR on the server
    const pushed = base(['git switch -c feature', 'echo f > f.txt', 'git add .', 'git commit -m "Add f"', 'git push -u origin feature']);
    const pr: PullRequest = { number: 1, title: 'Add f', body: '', head: 'feature', base: 'main', author: 'Sam', state: 'open', comments: [], openedAt: pushed.seq };
    const withPr: World = { ...pushed, remote: { ...pushed.remote!, prs: [pr] } };
    check([cloned, diverged, midRebase, withPr], randomLines(11, REMOTE_PIECES));
  });

  it('playground fuzz', () => {
    check([buildWorld(CLONED)], randomLines(23, REMOTE_PIECES));
  });
});
