import { buildWorld } from '../setup';
import { runLine } from '../interpreter';
import { teammatePush } from '../remote/teammate';
import type { RemoteSetup, RunResult, World } from '../types';

const text = (r: RunResult) => r.lines.map((l) => l.map((s) => s.text).join(''));
const config = { 'user.name': 'Sam', 'user.email': 's@x.com' };
const URL = 'https://git.example.com/team/notes.git';
const remote: RemoteSetup = { slug: 'team/notes', commits: [{ message: 'Add notes', files: { 'notes.txt': 'one\n' } }] };
const run = (w: World, ...lines: string[]) => lines.reduce((acc, l) => runLine(acc, l).world, w);
const base = (): World =>
  buildWorld({ cwd: 'p', config, repo: { at: 'p' }, files: { 'p/a.txt': '1\n', 'p/b.txt': '1\n' }, run: ['git add .', 'git commit -m "c1"'] });
const cloned = (): World => run(buildWorld({ config, remote }), `git clone ${URL}`, 'cd notes');
/** Detach on main, then make n commits. */
const detachedWith = (n: number): World => {
  const cmds = ['git checkout --detach'];
  for (let i = 1; i <= n; i++) cmds.push(`echo ${i} >> b.txt`, `git commit -am "d${i}"`);
  return run(base(), ...cmds);
};
const warn = (r: RunResult) => text(r);

describe('leaving commits behind', () => {
  it('lists the commits and the branch hint (2 commits)', () => {
    const w = detachedWith(2);
    const tip = w.repo!.head.kind === 'detached' ? w.repo!.head.id : '';
    const out = text(runLine(w, 'git checkout main'));
    expect(out.slice(0, 3)).toEqual(['Warning: you are leaving 2 commits behind, not connected to', 'any of your branches:', '']);
    expect(out[3]).toMatch(/^ {2}[0-9a-f]{7} d2$/);
    expect(out[4]).toMatch(/^ {2}[0-9a-f]{7} d1$/);
    expect(out.slice(5)).toEqual([
      '',
      'If you want to keep them by creating a new branch, this may be a good time',
      'to do so with:',
      '',
      ` git branch <new-branch-name> ${tip}`,
      '',
      "Switched to branch 'main'",
    ]);
  });
  it('uses the singular for one commit', () => {
    const out = warn(runLine(detachedWith(1), 'git switch main'));
    expect(out[0]).toBe('Warning: you are leaving 1 commit behind, not connected to');
    expect(out).toContain('If you want to keep it by creating a new branch, this may be a good time');
  });
  it('shows 5 commits in full but 4 plus "... and N more." from 6', () => {
    expect(warn(runLine(detachedWith(5), 'git switch main')).filter((l) => /^ {2}[0-9a-f]{7} /.test(l))).toHaveLength(5);
    const six = warn(runLine(detachedWith(6), 'git switch main'));
    expect(six.filter((l) => /^ {2}[0-9a-f]{7} /.test(l))).toHaveLength(4);
    expect(six).toContain(' ... and 2 more.');
  });
  it('is silent when a branch keeps the commits', () => {
    const w = run(detachedWith(2), 'git switch -c keep');
    expect(text(runLine(w, 'git switch main'))).toEqual(["Switched to branch 'main'"]);
  });
});

describe('switch trailers', () => {
  it('B3: switching back to a tracking branch reports up to date', () => {
    const w = run(cloned(), 'git switch -c x');
    expect(text(runLine(w, 'git switch main'))).toEqual(["Switched to branch 'main'", "Your branch is up to date with 'origin/main'."]);
  });
  it('B3: ahead and behind wording', () => {
    const ahead = run(cloned(), 'echo z > z.txt', 'git add .', 'git commit -m "z"', 'git switch -c x');
    expect(text(runLine(ahead, 'git switch main'))).toEqual(["Switched to branch 'main'", "Your branch is ahead of 'origin/main' by 1 commit.", '  (use "git push" to publish your local commits)']);
    const behind = run(
      run(cloned(), 'git switch -c x'),
      'echo hi > hi.txt',
    );
    void behind;
    const mate = teammatePush({ branch: 'main', message: 'Alex edit', files: { 'alex.txt': 'hi\n' }, author: { name: 'Alex Kim', email: 'alex@example.com' } })(run(cloned(), 'git switch -c x'));
    const b = run(mate, 'git fetch');
    expect(text(runLine(b, 'git switch main'))).toEqual(["Switched to branch 'main'", "Your branch is behind 'origin/main' by 1 commit, and can be fast-forwarded.", '  (use "git pull" to update your local branch)']);
  });
  it('B7: switch -c with local changes prints only the new-branch line', () => {
    const w = run(base(), 'echo m >> a.txt');
    expect(text(runLine(w, 'git switch -c feat'))).toEqual(["Switched to a new branch 'feat'"]);
    expect(text(runLine(w, 'git checkout -b feat'))).toEqual(["Switched to a new branch 'feat'"]);
  });
  it('B7: switching to an existing branch still lists carried changes', () => {
    const w = run(base(), 'git branch o', 'echo m >> a.txt');
    expect(text(runLine(w, 'git switch o'))).toEqual(['M\ta.txt', "Switched to branch 'o'"]);
  });
});

describe('checkout paths', () => {
  const dirty = () => run(base(), 'echo m >> a.txt', 'echo m >> b.txt');
  it('B8: counts the paths restored from the index', () => {
    expect(text(runLine(dirty(), 'git checkout a.txt'))).toEqual(['Updated 1 path from the index']);
    expect(text(runLine(dirty(), 'git checkout .'))).toEqual(['Updated 2 paths from the index']);
    expect(text(runLine(base(), 'git checkout a.txt'))).toEqual(['Updated 0 paths from the index']);
  });
  it('B8: stays silent after --', () => {
    expect(text(runLine(dirty(), 'git checkout -- a.txt'))).toEqual([]);
    expect(text(runLine(dirty(), 'git checkout HEAD -- a.txt'))).toEqual([]);
  });
  it('B8: names the source when a revision is given without --', () => {
    const w = run(dirty(), 'git branch o');
    expect(text(runLine(w, 'git checkout o a.txt'))[0]).toMatch(/^Updated 1 path from [0-9a-f]{7}$/);
  });
});

describe('refusals', () => {
  const conflicted = (): World =>
    run(base(), 'git switch -c p1', 'echo p > a.txt', 'git commit -am "p"', 'git switch main', 'echo q > a.txt', 'git commit -am "q"', 'git merge p1');
  it('B11: switch mid-merge points at merge --quit', () => {
    const r = runLine(conflicted(), 'git switch p1');
    expect(text(r)).toEqual(['fatal: cannot switch branch while merging', 'Consider "git merge --quit" or "git worktree add".']);
    expect(r.exitCode).toBe(128);
  });
  it('B11: checkout keeps the resolve-index error', () => {
    expect(text(runLine(conflicted(), 'git checkout p1'))[0]).toBe('error: you need to resolve your current index first');
  });
  it('B22: a remote branch is not a branch to switch to', () => {
    const r = runLine(cloned(), 'git switch origin/main');
    expect(text(r)).toEqual(["fatal: a branch is expected, got remote branch 'origin/main'", 'hint: If you want to detach HEAD at the commit, try again with the --detach option.']);
    expect(r.exitCode).toBe(128);
  });
});

describe('unborn branch (A6)', () => {
  const fresh = (): World => run(buildWorld({ cwd: 'p', config, dirs: ['p'] }), 'git init');
  it('switch -c on an unborn branch renames it', () => {
    const w = run(fresh(), 'git switch -c topic', 'echo a > a.txt', 'git add .', 'git commit -m "first"');
    expect(Object.keys(w.repo!.branches)).toEqual(['topic']);
    const r = runLine(w, 'git switch main');
    expect(text(r)).toEqual(['fatal: invalid reference: main']);
    expect(r.exitCode).toBe(128);
  });
  it('checkout of the unborn branch name is a pathspec error', () => {
    const r = runLine(fresh(), 'git checkout main');
    expect(text(r)).toEqual(["error: pathspec 'main' did not match any file(s) known to git"]);
    expect(r.exitCode).toBe(1);
  });
});
