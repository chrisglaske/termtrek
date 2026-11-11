import { buildWorld } from '../setup';
import { runLine } from '../interpreter';
import type { World } from '../types';

type R = ReturnType<typeof runLine>;
const text = (r: R) => r.lines.map((l) => l.map((s) => s.text).join(''));
const config = { 'user.name': 'Sam', 'user.email': 's@x.com' };
const P = '/home/you/p/';

/** Two commits on main: notes.txt is 1 then 2. */
const base = (extra: string[] = []): World =>
  buildWorld({
    cwd: 'p',
    config,
    repo: { at: 'p' },
    files: { 'p/notes.txt': '1\n' },
    run: ['git add .', 'git commit -m "c1"', 'echo 2 > notes.txt', 'git add .', 'git commit -m "c2"', ...extra],
  });
const go = (w: World, line: string) => {
  const r = runLine(w, line);
  return { r, w: r.world };
};
const run = (w: World, ...lines: string[]) => lines.reduce((acc, l) => runLine(acc, l).world, w);

describe('git branch', () => {
  it('branch lists with star', () => {
    const w = run(base(), 'git branch zeta', 'git branch alpha');
    const { r } = go(w, 'git branch');
    expect(text(r)).toEqual(['  alpha', '* main', '  zeta']);
    const d = go(w, 'git checkout HEAD~1');
    expect(text(go(d.w, 'git branch').r)[0]).toMatch(/^\* \(HEAD detached at [0-9a-f]{7}\)$/);
  });
  it('branch create, duplicate, invalid name', () => {
    const w = base();
    const { r, w: w1 } = go(w, 'git branch feature');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual([]);
    expect(w1.repo!.branches.feature).toBe(w.repo!.branches.main);
    expect(text(go(w1, 'git branch feature').r)).toEqual(["fatal: a branch named 'feature' already exists"]);
    expect(text(go(w1, 'git branch "a b"').r)[0]).toBe("fatal: 'a b' is not a valid branch name");
    expect(text(go(w1, 'git branch a..b').r)[0]).toBe("fatal: 'a..b' is not a valid branch name");
    expect(text(go(w1, 'git branch -- -x').r)[0]).toBe("fatal: '-x' is not a valid branch name");
    const unborn = buildWorld({ cwd: 'p', config, repo: { at: 'p' } });
    expect(text(go(unborn, 'git branch x').r)).toEqual(["fatal: not a valid object name: 'main'"]);
  });
  it('branch -d unmerged refuses, -D deletes', () => {
    const w = run(base(), 'git switch -c feature', 'echo f > f.txt', 'git add .', 'git commit -m "f1"', 'git switch main');
    const tip = w.repo!.branches.feature!;
    const { r } = go(w, 'git branch -d feature');
    expect(r.exitCode).toBe(1);
    expect(text(r)).toEqual([
      "error: the branch 'feature' is not fully merged",
      "hint: If you are sure you want to delete it, run 'git branch -D feature'",
    ]);
    const forced = go(w, 'git branch -D feature');
    expect(text(forced.r)).toEqual([`Deleted branch feature (was ${tip}).`]);
    expect(forced.w.repo!.branches.feature).toBeUndefined();
    const merged = go(run(base(), 'git branch old'), 'git branch -d old');
    expect(text(merged.r)[0]).toMatch(/^Deleted branch old \(was [0-9a-f]{7}\)\.$/);
  });
  it('cannot delete current branch', () => {
    const { r } = go(base(), 'git branch -d main');
    expect(r.exitCode).toBe(1);
    expect(text(r)).toEqual(["error: cannot delete branch 'main' used by worktree at '/home/you/p'"]);
    expect(text(go(base(), 'git branch -D nope').r)).toEqual(["error: branch 'nope' not found"]);
  });
  it('renames with -m', () => {
    const w = base();
    const a = go(w, 'git branch -m trunk');
    expect(a.w.repo!.head).toEqual({ kind: 'branch', name: 'trunk' });
    expect(a.w.repo!.branches.main).toBeUndefined();
    const b = go(run(w, 'git branch x'), 'git branch -m x y');
    expect(Object.keys(b.w.repo!.branches).sort()).toEqual(['main', 'y']);
  });
});

describe('git switch and checkout', () => {
  it('switch -c then commit moves only the new branch', () => {
    const w0 = base();
    const mainTip = w0.repo!.branches.main;
    const { r, w } = go(w0, 'git switch -c feature');
    expect(text(r)).toEqual(["Switched to a new branch 'feature'"]);
    const w2 = run(w, 'echo f > f.txt', 'git add .', 'git commit -m "f1"');
    expect(w2.repo!.branches.main).toBe(mainTip);
    expect(w2.repo!.branches.feature).not.toBe(mainTip);
    expect(text(go(w0, 'git checkout -b other').r)).toEqual(["Switched to a new branch 'other'"]);
  });
  it('switch changes working files', () => {
    const w = run(base(), 'git switch -c feature', 'echo f > f.txt', 'git add .', 'git commit -m "f1"');
    expect(w.files[P + 'f.txt']).toBe('f\n');
    const { r, w: w2 } = go(w, 'git switch main');
    expect(text(r)).toEqual(["Switched to branch 'main'"]);
    expect(w2.files[P + 'f.txt']).toBeUndefined();
    expect(r.explain?.text).toContain('new commits will go on **main**');
    expect(text(go(w2, 'git switch main').r)).toEqual(["Already on 'main'"]);
  });
  it('switch carries a compatible local change', () => {
    const w0 = run(base(), 'git switch -c feature', 'echo f > f.txt', 'git add .', 'git commit -m "f1"', 'git switch main', 'echo scribble > notes.txt');
    const { r, w } = go(w0, 'git switch feature');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual(['M\tnotes.txt', "Switched to branch 'feature'"]);
    expect(w.files[P + 'notes.txt']).toBe('scribble\n');
    expect(w.files[P + 'f.txt']).toBe('f\n');
  });
  it('switch refuses to overwrite', () => {
    const w0 = run(base(), 'git switch -c feature', 'echo f > notes.txt', 'git add .', 'git commit -m "f1"', 'git switch main', 'echo mine > notes.txt');
    const { r, w } = go(w0, 'git switch feature');
    expect(r.exitCode).toBe(1);
    expect(text(r)).toEqual([
      'error: Your local changes to the following files would be overwritten by checkout:',
      '\tnotes.txt',
      'Please commit your changes or stash them before you switch branches.',
      'Aborting',
    ]);
    expect(w.files).toEqual(w0.files);
    expect(w.repo).toEqual(w0.repo);
  });
  it('switch - returns to previous', () => {
    const w0 = run(base(), 'git switch -c feature');
    const { r, w } = go(w0, 'git switch -');
    expect(text(r)).toEqual(["Switched to branch 'main'"]);
    expect(w.repo!.head).toEqual({ kind: 'branch', name: 'main' });
    expect(go(w, 'git checkout -').w.repo!.head).toEqual({ kind: 'branch', name: 'feature' });
  });
  it('switch errors', () => {
    const w = base();
    expect(text(go(w, 'git switch nope').r)).toEqual(['fatal: invalid reference: nope']);
    const id = w.repo!.branches.main!;
    expect(text(go(w, `git switch ${id}`).r)).toEqual([
      `fatal: a branch is expected, got commit '${id}'`,
      'hint: If you want to detach HEAD at the commit, try again with the --detach option.',
    ]);
    const d = go(w, `git switch --detach HEAD~1`);
    expect(d.w.repo!.head.kind).toBe('detached');
    expect(text(d.r).at(-1)).toMatch(/^HEAD is now at [0-9a-f]{7} c1$/);
  });
  it('checkout HEAD~1 detaches with advice', () => {
    const { r, w } = go(base(), 'git checkout HEAD~1');
    const t = text(r);
    expect(t).toEqual([
      "Note: switching to 'HEAD~1'.",
      '',
      "You are in 'detached HEAD' state. You can look around, make experimental",
      'changes and commit them, and you can discard any commits you make in this',
      'state without impacting any branches by switching back to a branch.',
      '',
      'If you want to create a new branch to retain commits you create, you may',
      'do so (now or later) by using -c with the switch command. Example:',
      '',
      '  git switch -c <new-branch-name>',
      '',
      'Or undo this operation with:',
      '',
      '  git switch -',
      '',
      expect.stringMatching(/^HEAD is now at [0-9a-f]{7} c1$/),
    ]);
    expect(w.repo!.head.kind).toBe('detached');
    expect(w.files[P + 'notes.txt']).toBe('1\n');
    expect(text(runLine(w, 'git status'))[0]).toMatch(/^HEAD detached at [0-9a-f]{7}$/);
    expect(r.explain?.text).toContain('git switch -');
    const back = go(w, 'git switch main');
    expect(text(back.r)[0]).toMatch(/^Previous HEAD position was [0-9a-f]{7} c1$/);
  });
  it('--detach prints only the HEAD line', () => {
    for (const cmd of ['git switch --detach HEAD~1', 'git checkout --detach HEAD~1']) {
      const { r, w } = go(base(), cmd);
      expect(text(r)).toEqual([expect.stringMatching(/^HEAD is now at [0-9a-f]{7} c1$/)]);
      expect(w.repo!.head.kind).toBe('detached');
    }
  });
  it('checkout -- notes.txt discards', () => {
    const w0 = base(['echo oops > notes.txt']);
    const { r, w } = go(w0, 'git checkout -- notes.txt');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual([]);
    expect(r.explain?.text).toContain('gone for good');
    expect(w.files[P + 'notes.txt']).toBe('2\n');
    expect(text(go(w0, 'git checkout nope.txt').r)).toEqual(["error: pathspec 'nope.txt' did not match any file(s) known to git"]);
    expect(go(w0, 'git checkout notes.txt').w.files[P + 'notes.txt']).toBe('2\n');
  });
  it('checkout <rev> <path> restores the path from that commit', () => {
    const w0 = base(['git branch old HEAD~1']);
    for (const cmd of ['git checkout old notes.txt', 'git checkout old -- notes.txt', 'git checkout HEAD~1 -- notes.txt']) {
      const { r, w } = go(w0, cmd);
      expect(text(r)).toEqual([]);
      expect(w.files[P + 'notes.txt']).toBe('1\n');
      expect(w.repo!.index['notes.txt']).toBe('1\n');
      expect(w.repo!.head).toEqual({ kind: 'branch', name: 'main' });
    }
  });
  it('checkout HEAD on a branch prints nothing', () => {
    const { r, w } = go(base(), 'git checkout HEAD');
    expect(text(r)).toEqual([]);
    expect(w.repo!.head).toEqual({ kind: 'branch', name: 'main' });
  });
  it('switch - after a detached position refuses like Git', () => {
    const w0 = base();
    const d = run(w0, 'git switch --detach HEAD~1', 'git switch main');
    const id = w0.repo!.commits[w0.repo!.commits[w0.repo!.branches.main!]!.parents[0]!]!.id;
    const { r } = go(d, 'git switch -');
    expect(r.exitCode).toBe(128);
    expect(text(r)).toEqual([
      `fatal: a branch is expected, got commit '${id}'`,
      'hint: If you want to detach HEAD at the commit, try again with the --detach option.',
    ]);
  });
  it('HEAD is not a valid branch name', () => {
    expect(text(go(base(), 'git branch HEAD').r)[0]).toBe("fatal: 'HEAD' is not a valid branch name");
  });
  it('reflog shows checkout: moving from main to feature', () => {
    const w = run(base(), 'git switch -c feature');
    expect(text(runLine(w, 'git reflog'))[0]).toMatch(/HEAD@\{0\}: checkout: moving from main to feature$/);
  });
  it('blocks switching during an op', () => {
    const w0 = base();
    const conflicted = { ...w0, repo: { ...w0.repo!, op: { kind: 'merge' as const, theirs: 'x', theirsLabel: 'f', message: 'm', conflicts: ['notes.txt'] } } };
    expect(text(go(conflicted, 'git switch -c z').r)).toEqual(['error: you need to resolve your current index first', '\tnotes.txt']);
    const clean = { ...w0, repo: { ...w0.repo!, op: { ...conflicted.repo!.op!, conflicts: [] } } };
    expect(text(go(clean, 'git checkout -b z').r)).toEqual(['fatal: cannot switch branch while merging']);
  });
});
