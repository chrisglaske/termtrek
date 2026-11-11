import { buildWorld } from '../setup';
import { runLine } from '../interpreter';
import { finishEditor } from './editor';
import { moveTree } from './worktree';
import { badRevision } from './rev';
import { getStatus } from './repoState';
import type { World } from '../types';

type R = ReturnType<typeof runLine>;
const text = (r: R) => r.lines.map((l) => l.map((s) => s.text).join(''));
const config = { 'user.name': 'Sam', 'user.email': 's@x.com' };
const P = '/home/you/p/';

/** Three commits on main; notes.txt is 1, 2, 3 and other.txt is added in c2. */
const base = (extra: string[] = []): World =>
  buildWorld({
    cwd: 'p',
    config,
    repo: { at: 'p' },
    files: { 'p/notes.txt': '1\n' },
    run: [
      'git add .', 'git commit -m "c1"',
      'echo 2 > notes.txt', 'echo x > other.txt', 'git add .', 'git commit -m "c2"',
      'echo 3 > notes.txt', 'git add .', 'git commit -m "c3"',
      ...extra,
    ],
  });
const go = (w: World, line: string) => {
  const r = runLine(w, line);
  return { r, w: r.world };
};
const ids = (w: World) => Object.values(w.repo!.commits).sort((a, b) => a.time - b.time).map((c) => c.id);

describe('git restore', () => {
  it('restore discards a working edit', () => {
    const w0 = base(['echo oops > notes.txt']);
    const { r, w } = go(w0, 'git restore notes.txt');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual([]);
    expect(w.files[P + 'notes.txt']).toBe('3\n');
    expect(r.explain?.text).toContain('gone');
  });
  it('restore --staged unstages a new file and keeps it on disk', () => {
    const w0 = base(['echo hi > new.txt', 'git add new.txt']);
    const { r, w } = go(w0, 'git restore --staged new.txt');
    expect(r.exitCode).toBe(0);
    expect(w.repo!.index['new.txt']).toBeUndefined();
    expect(w.files[P + 'new.txt']).toBe('hi\n');
    expect(getStatus(w)!.untracked).toEqual(['new.txt']);
  });
  it('restore -SW resets both index and folder', () => {
    const w0 = base(['echo a > notes.txt', 'git add notes.txt', 'echo b > notes.txt']);
    const { w } = go(w0, 'git restore -SW .');
    expect(w.repo!.index['notes.txt']).toBe('3\n');
    expect(w.files[P + 'notes.txt']).toBe('3\n');
  });
  it('restore unknown path', () => {
    const { r } = go(base(), 'git restore nope.txt');
    expect(r.exitCode).toBe(1);
    expect(text(r)).toEqual(["error: pathspec 'nope.txt' did not match any file(s) known to git"]);
  });
  it('restore with no path', () => {
    const { r } = go(base(), 'git restore');
    expect(r.exitCode).toBe(128);
    expect(text(r)).toEqual(['fatal: you must specify path(s) to restore']);
  });
});

describe('git reset', () => {
  it('reset --soft HEAD~1 keeps changes staged', () => {
    const w0 = base();
    const [, c2] = ids(w0);
    const { r, w } = go(w0, 'git reset --soft HEAD~1');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual([]);
    expect(w.repo!.branches.main).toBe(c2);
    expect(getStatus(w)!.staged.length).toBeGreaterThan(0);
  });
  it('reset mixed prints Unstaged changes after reset', () => {
    const { r, w } = go(base(), 'git reset HEAD~1');
    expect(text(r)).toEqual(['Unstaged changes after reset:', 'M\tnotes.txt']);
    expect(getStatus(w)!.staged).toEqual([]);
    expect(w.files[P + 'notes.txt']).toBe('3\n');
  });
  it('reset --hard HEAD~1', () => {
    const w0 = base();
    const [, c2] = ids(w0);
    const { r, w } = go(w0, 'git reset --hard HEAD~1');
    expect(text(r)).toEqual([`HEAD is now at ${c2} c2`]);
    expect(w.files[P + 'notes.txt']).toBe('2\n');
    expect(getStatus(w)!.staged).toEqual([]);
  });
  it('reset --hard removes files the target lacks', () => {
    const { w } = go(base(), 'git reset --hard HEAD~2');
    expect(w.files[P + 'other.txt']).toBeUndefined();
  });
  it('reset notes.txt unstages only that file', () => {
    const w0 = base(['echo a > notes.txt', 'echo b > other.txt', 'git add .']);
    const { r, w } = go(w0, 'git reset notes.txt');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual(['Unstaged changes after reset:', 'M\tnotes.txt']);
    expect(w.repo!.index['notes.txt']).toBe('3\n');
    expect(w.repo!.index['other.txt']).toBe('b\n');
    expect(w.repo!.branches.main).toBe(w0.repo!.branches.main);
  });
  it('reset --hard during a conflicted merge clears the merge', () => {
    const w0 = buildWorld({
      cwd: 'p',
      config: { 'user.name': 'Sam', 'user.email': 's@x.com' },
      repo: { at: 'p' },
      files: { 'p/notes.txt': 'base\n' },
      run: ['git add .', 'git commit -m "c1"', 'git switch -c feature', 'echo theirs > notes.txt', 'git commit -am "f1"', 'git switch main', 'echo ours > notes.txt', 'git commit -am "m1"'],
    });
    const merging = runLine(w0, 'git merge feature').world;
    expect(merging.repo!.op?.kind).toBe('merge');
    for (const cmd of ['git reset --hard', 'git reset']) {
      const r = runLine(merging, cmd);
      expect(r.world.repo!.op).toBeNull();
      expect(text(runLine(r.world, 'git status')).join('\n')).not.toContain('unmerged');
    }
    const after = runLine(merging, 'git reset --hard').world;
    expect(text(runLine(after, 'git switch -c x'))).toEqual(["Switched to a new branch 'x'"]);
  });
  it('reset --soft is refused during a merge and keeps the merge', () => {
    const w0 = buildWorld({
      cwd: 'p',
      config: { 'user.name': 'Sam', 'user.email': 's@x.com' },
      repo: { at: 'p' },
      files: { 'p/notes.txt': 'base\n' },
      run: ['git add .', 'git commit -m "c1"', 'git switch -c feature', 'echo theirs > notes.txt', 'git commit -am "f1"', 'git switch main', 'echo ours > notes.txt', 'git commit -am "m1"'],
    });
    const merging = runLine(w0, 'git merge feature').world;
    const r = runLine(merging, 'git reset --soft');
    expect(text(r)).toEqual(['fatal: Cannot do a soft reset in the middle of a merge.']);
    expect(r.exitCode).toBe(128);
    expect(r.world.repo!.op).toEqual(merging.repo!.op);
    expect(r.world.repo!.op?.kind).toBe('merge');
  });
  it('restore on an unmerged path is refused', () => {
    const w0 = buildWorld({
      cwd: 'p',
      config: { 'user.name': 'Sam', 'user.email': 's@x.com' },
      repo: { at: 'p' },
      files: { 'p/notes.txt': 'base\n' },
      run: ['git add .', 'git commit -m "c1"', 'git switch -c feature', 'echo theirs > notes.txt', 'git commit -am "f1"', 'git switch main', 'echo ours > notes.txt', 'git commit -am "m1"'],
    });
    const merging = runLine(w0, 'git merge feature').world;
    const r = runLine(merging, 'git restore notes.txt');
    expect(text(r)).toEqual(["error: path 'notes.txt' is unmerged"]);
    expect(r.exitCode).toBe(1);
    expect(r.world.files[P + 'notes.txt']).toBe(merging.files[P + 'notes.txt']);
    expect(r.world.repo!.op).toEqual(merging.repo!.op);
  });
  it('reset --hard during a revert clears the revert', () => {
    const w0 = buildWorld({
      cwd: 'p',
      config: { 'user.name': 'Sam', 'user.email': 's@x.com' },
      repo: { at: 'p' },
      files: { 'p/notes.txt': 'base\n' },
      run: ['git add .', 'git commit -m "c1"', 'echo one > notes.txt', 'git commit -am "c2"'],
    });
    const reverting = finishEditor(runLine(w0, 'git revert HEAD').world, null).world;
    expect(reverting.repo!.op?.kind).toBe('revert');
    const r = runLine(reverting, 'git reset --hard');
    expect(r.world.repo!.op).toBeNull();
    expect(text(runLine(r.world, 'git status'))[0]).toBe('On branch main');
    expect(text(runLine(r.world, 'git status')).join('\n')).not.toContain('reverting');
  });
  it('reset bad revision', () => {
    const { r } = go(base(), 'git reset HEAD~10');
    expect(r.exitCode).toBe(128);
    expect(r.lines).toEqual(badRevision('HEAD~10'));
  });
});

describe('git reflog', () => {
  it('reflog after reset', () => {
    const w0 = base();
    const [, c2, c3] = ids(w0);
    const { w } = go(w0, 'git reset --hard HEAD~1');
    const { r } = go(w, 'git reflog');
    const t = text(r);
    expect(t[0]).toBe(`${c2} (HEAD -> main) HEAD@{0}: reset: moving to HEAD~1`);
    expect(t[1]).toBe(`${c3} HEAD@{1}: commit: c3`);
    expect(t).toHaveLength(4);
    expect(text(go(w, 'git reflog -n 1').r)).toHaveLength(1);
  });
  it('reflog on an empty repo', () => {
    const { r } = go(buildWorld({ cwd: 'p', config, repo: { at: 'p' } }), 'git reflog');
    expect(r.exitCode).toBe(128);
    expect(text(r)).toEqual(["fatal: your current branch 'main' does not have any commits yet"]);
  });
  it('reset --hard HEAD@{1} recovers', () => {
    const w0 = base();
    const [, , c3] = ids(w0);
    const { w } = go(go(w0, 'git reset --hard HEAD~1').w, 'git reset --hard HEAD@{1}');
    expect(w.repo!.branches.main).toBe(c3);
    expect(w.files[P + 'notes.txt']).toBe('3\n');
  });
});

describe('git log decorations', () => {
  it('log --oneline decorates tips', () => {
    const w0 = base();
    const [c1, c2, c3] = ids(w0);
    const w = { ...w0, repo: { ...w0.repo!, branches: { ...w0.repo!.branches, feature: c2! } } };
    const t = text(go(w, 'git log --oneline').r);
    expect(t).toEqual([`${c3} (HEAD -> main) c3`, `${c2} (feature) c2`, `${c1} c1`]);
  });
  it('log full format decorates and detached HEAD', () => {
    const w0 = base();
    const [, c2] = ids(w0);
    const w = go(w0, `git reset --hard ${c2}`).w;
    const det = { ...w, repo: { ...w.repo!, head: { kind: 'detached' as const, id: c2! } } };
    expect(text(go(det, 'git log').r)[0]).toBe(`commit ${c2} (HEAD, main)`);
  });
  it("log --all includes another branch's commits", () => {
    const w0 = base();
    const [, c2, c3] = ids(w0);
    const x = { ...w0.repo!.commits[c2!]!, id: 'dddd111', parents: [c2!], message: 'side', time: 50 };
    const w = { ...w0, repo: { ...w0.repo!, commits: { ...w0.repo!.commits, dddd111: x }, branches: { ...w0.repo!.branches, side: 'dddd111' } } };
    const t = text(go(w, 'git log --oneline --all').r);
    expect(t[0]).toBe('dddd111 (side) side');
    expect(t[1]).toBe(`${c3} (HEAD -> main) c3`);
    expect(text(go(w, 'git log --oneline').r).join('\n')).not.toContain('side');
  });
  it('log --graph marks commits and tips the map after a merge', () => {
    const w0 = base();
    const [c1, c2, c3] = ids(w0);
    const m = { ...w0.repo!.commits[c3!]!, id: 'eeee222', parents: [c3!, c1!], message: 'merge', time: 60 };
    const w = { ...w0, repo: { ...w0.repo!, commits: { ...w0.repo!.commits, eeee222: m }, branches: { main: 'eeee222' } } };
    const { r } = go(w, 'git log --oneline --graph');
    expect(text(r)).toEqual([`* eeee222 (HEAD -> main) merge`, `* ${c3} c3`, `* ${c2} c2`, `* ${c1} c1`]);
    expect(r.explain?.text).toContain('**Your repo**');
  });
});

describe('moveTree', () => {
  it('moveTree refuses to overwrite local changes', () => {
    const w0 = base(['echo mine > notes.txt']);
    const repo = w0.repo!;
    const [c1] = ids(w0);
    const res = moveTree(w0, repo, repo.commits[ids(w0)[2]!]!.tree, repo.commits[c1!]!.tree, { force: false });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.lines.map((l) => l.map((s) => s.text).join(''))).toEqual([
      'error: Your local changes to the following files would be overwritten by checkout:',
      '\tnotes.txt',
      'Please commit your changes or stash them before you switch branches.',
      'Aborting',
    ]);
  });
  it('carries over local changes on untouched paths', () => {
    const w0 = base();
    const [, c2, c3] = ids(w0);
    const from = w0.repo!.commits[c2!]!.tree;
    const to = w0.repo!.commits[c3!]!.tree;
    // Folder and index sit at c2, with an extra edit on other.txt that c2 and c3 share.
    const w1 = { ...w0, files: { ...w0.files, [P + 'notes.txt']: '2\n', [P + 'other.txt']: 'mine\n' } };
    const res = moveTree(w1, { ...w0.repo!, index: from }, from, to, { force: false });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.world.files[P + 'other.txt']).toBe('mine\n');
    expect(res.world.files[P + 'notes.txt']).toBe('3\n');
    expect(res.index['other.txt']).toBe('x\n');
  });
  it('refuses to overwrite untracked files', () => {
    const w0 = base();
    const [c1, c2] = ids(w0);
    const from = w0.repo!.commits[c1!]!.tree;
    const to = w0.repo!.commits[c2!]!.tree;
    const w1 = { ...w0, files: { ...w0.files, [P + 'notes.txt']: '1\n', [P + 'other.txt']: 'mine\n' } };
    const res = moveTree(w1, { ...w0.repo!, index: from }, from, to, { force: false });
    expect(res.ok).toBe(false);
    if (res.ok) return;
    expect(res.lines.map((l) => l.map((s) => s.text).join(''))).toEqual([
      'error: The following untracked working tree files would be overwritten by checkout:',
      '\tother.txt',
      'Please move or remove them before you switch branches.',
      'Aborting',
    ]);
  });
});
