import { buildWorld } from '../setup';
import { runLine } from '../interpreter';
import { finishEditor } from './editor';
import type { RunResult, World } from '../types';

const text = (r: RunResult) => r.lines.map((l) => l.map((s) => s.text).join(''));
const config = { 'user.name': 'Sam', 'user.email': 's@x.com' };
const P = '/home/you/p/';
const USAGE = 'usage: git revert [--[no-]edit] [-n] [-m <parent-number>] [-s] [-S[<keyid>]] <commit>...';

/** c1: notes=base. c2: add f.txt. c3: notes=one. */
const world = (extra: string[] = []): World =>
  buildWorld({
    cwd: 'p',
    config,
    repo: { at: 'p' },
    files: { 'p/notes.txt': 'base\n' },
    run: ['git add .', 'git commit -m "c1"', 'echo f > f.txt', 'git add .', 'git commit -m "add f"', 'echo one > notes.txt', 'git add .', 'git commit -m "change notes"', ...extra],
  });
const go = (w: World, ...lines: string[]) => {
  let r = runLine(w, 'true');
  for (const l of lines) r = runLine(r.world, l);
  return r;
};
const head = (w: World) => w.repo!.branches.main!;

describe('git revert', () => {
  it('revert HEAD opens the editor with the pinned message', () => {
    const w = world();
    const id = head(w);
    const r = go(w, 'git revert HEAD');
    expect(r.exitCode).toBe(0);
    expect(r.world.pending?.text.startsWith(`Revert "change notes"\n\nThis reverts commit ${id}.\n# Please enter`)).toBe(true);
    expect(r.world.repo!.op).toEqual({ kind: 'revert', theirs: id, theirsLabel: `parent of ${id} (change notes)`, message: `Revert "change notes"\n\nThis reverts commit ${id}.`, conflicts: [] });
    expect(r.world.files[P + 'notes.txt']).toBe('base\n');
    expect(head(r.world)).toBe(id);
    expect(text(go(finishEditor(r.world, null).world, 'git status')).slice(0, 4)).toEqual([
      'On branch main',
      `You are currently reverting commit ${id}.`,
      '  (all conflicts fixed: run "git revert --continue")',
      '  (use "git revert --abort" to cancel the revert operation)',
    ]);
  });

  it('finishing makes a 1-parent commit restoring the old content', () => {
    const w = world();
    const id = head(w);
    const r = go(w, 'git revert HEAD');
    const done = finishEditor(r.world, r.world.pending!.text);
    expect(done.exitCode).toBe(0);
    const c = done.world.repo!.commits[head(done.world)]!;
    expect(c.parents).toEqual([id]);
    expect(c.tree).toEqual({ 'notes.txt': 'base\n', 'f.txt': 'f\n' });
    expect(c.message).toBe(`Revert "change notes"\n\nThis reverts commit ${id}.`);
    expect(done.world.repo!.op).toBeNull();
    expect(done.world.repo!.reflog[0]!.message).toBe('revert: Revert "change notes"');
    expect(done.explain).toEqual({ kind: 'ok', text: 'Git added a new commit that undoes **change notes**. History still shows both, so this is safe on shared branches.' });
    expect(text(done)[0]).toBe(`[main ${head(done.world)}] Revert "change notes"`);
    const closed = finishEditor(r.world, null);
    expect(closed.world.repo!.op?.kind).toBe('revert');
  });

  it('revert --no-edit HEAD~1 with a later unrelated commit is clean', () => {
    const w = world();
    const id = w.repo!.commits[head(w)]!.parents[0]!;
    const r = go(w, 'git revert --no-edit HEAD~1');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual([`[main ${head(r.world)}] Revert "add f"`, ' 1 file changed, 1 deletion(-)', ' delete mode 100644 f.txt']);
    expect(r.world.repo!.op).toBeNull();
    expect(r.world.files[P + 'f.txt']).toBeUndefined();
    expect(r.world.files[P + 'notes.txt']).toBe('one\n');
    expect(r.world.repo!.commits[head(r.world)]!.message).toBe(`Revert "add f"\n\nThis reverts commit ${id}.`);
    expect(r.explain?.kind).toBe('ok');
  });

  it('revert conflict output and --abort', () => {
    const w = world(['echo two > notes.txt', 'git add .', 'git commit -m "more notes"']);
    const id = w.repo!.commits[head(w)]!.parents[0]!;
    const r = go(w, 'git revert HEAD~1');
    expect(r.exitCode).toBe(1);
    expect(text(r)).toEqual([
      'Auto-merging notes.txt',
      'CONFLICT (content): Merge conflict in notes.txt',
      `error: could not revert ${id}... change notes`,
      'hint: After resolving the conflicts, mark them with',
      'hint: "git add/rm <pathspec>", then run',
      'hint: "git revert --continue".',
      'hint: You can instead skip this commit with "git revert --skip".',
      'hint: To abort and get back to the state before "git revert",',
      'hint: run "git revert --abort".',
    ]);
    expect(r.world.files[P + 'notes.txt']).toBe(`<<<<<<< HEAD\ntwo\n=======\nbase\n>>>>>>> parent of ${id} (change notes)\n`);
    expect(r.world.repo!.index['notes.txt']).toBe('two\n');
    expect(r.world.repo!.op!.conflicts).toEqual(['notes.txt']);
    expect(text(go(r.world, 'git status'))).toEqual([
      'On branch main',
      `You are currently reverting commit ${id}.`,
      '  (fix conflicts and run "git revert --continue")',
      '  (use "git revert --abort" to cancel the revert operation)',
      '',
      'Unmerged paths:',
      '  (use "git add <file>..." to mark resolution)',
      '\tboth modified:   notes.txt',
      '',
      'no changes added to commit (use "git add" and/or "git commit -a")',
    ]);
    const stuck = go(r.world, 'git revert --continue');
    expect(stuck.exitCode).toBe(128);
    expect(text(stuck)[0]).toBe('error: Committing is not possible because you have unmerged files.');
    expect(text(go(r.world, 'git revert HEAD~2'))[0]).toBe('error: Reverting is not possible because you have unmerged files.');

    const ab = go(r.world, 'git revert --abort');
    expect(ab.exitCode).toBe(0);
    expect(ab.world.repo!.op).toBeNull();
    expect(ab.world.files[P + 'notes.txt']).toBe('two\n');
    expect(ab.world.repo!.index['notes.txt']).toBe('two\n');
    expect(text(go(ab.world, 'git status')).at(-1)).toBe('nothing to commit, working tree clean');

    const fixed = go(r.world, 'echo base2 > notes.txt', 'git add notes.txt', 'git revert --continue --no-edit');
    expect(fixed.exitCode).toBe(0);
    const c = fixed.world.repo!.commits[head(fixed.world)]!;
    expect(c.parents).toEqual([head(w)]);
    expect(c.tree['notes.txt']).toBe('base2\n');
    expect(fixed.world.repo!.op).toBeNull();
    const edit = go(r.world, 'echo base2 > notes.txt', 'git add notes.txt', 'git revert --continue');
    expect(edit.world.pending?.text.startsWith(`Revert "change notes"\n\nThis reverts commit ${id}.\n`)).toBe(true);
  });

  it('no revert in progress', () => {
    const r = go(world(), 'git revert --abort');
    expect(r.exitCode).toBe(128);
    expect(text(r)).toEqual(['error: no cherry-pick or revert in progress', 'fatal: revert failed']);
    expect(text(go(world(), 'git revert --continue'))).toEqual(['error: no cherry-pick or revert in progress', 'fatal: revert failed']);
  });

  it('reverting a commit that is already undone prints the clean-tree block and makes no commit', () => {
    const w = world();
    const id = head(w);
    const once = go(w, `git revert --no-edit ${id}`).world;
    const before = Object.keys(once.repo!.commits).length;
    for (const cmd of [`git revert --no-edit ${id}`, `git revert ${id}`]) {
      const r = go(once, cmd);
      expect(text(r)).toEqual(['On branch main', 'nothing to commit, working tree clean']);
      expect(r.exitCode).toBe(1);
      expect(Object.keys(r.world.repo!.commits)).toHaveLength(before);
      expect(r.world.repo!.op).toBeNull();
      expect(r.world.pending).toBeUndefined();
    }
  });

  it('revert a merge commit refuses', () => {
    const w = buildWorld({
      cwd: 'p',
      config,
      repo: { at: 'p' },
      files: { 'p/notes.txt': 'base\n' },
      run: ['git add .', 'git commit -m "c1"', 'git switch -c f', 'echo f > f.txt', 'git add .', 'git commit -m "f1"', 'git switch main', 'echo m > m.txt', 'git add .', 'git commit -m "m1"', 'git merge --no-ff -m "mm" f'],
    });
    const id = head(w);
    const r = go(w, 'git revert HEAD');
    expect(r.exitCode).toBe(128);
    expect(text(r)).toEqual([`error: commit ${id} is a merge but no -m option was given.`, 'fatal: revert failed']);
    expect(r.world.repo!.op).toBeNull();
  });

  it('revert without args prints usage; bad revision and dirty index refuse', () => {
    const r = go(world(), 'git revert');
    expect(r.exitCode).toBe(129);
    expect(text(r)).toEqual([USAGE]);
    const bad = go(world(), 'git revert nope');
    expect(bad.exitCode).toBe(128);
    expect(text(bad)[0]).toBe("fatal: ambiguous argument 'nope': unknown revision or path not in the working tree.");
    const dirty = go(world(), 'echo z > z.txt', 'git add z.txt', 'git revert --no-edit HEAD~1');
    expect(dirty.exitCode).toBe(128);
    expect(text(dirty)).toEqual(['error: your local changes would be overwritten by revert.', 'hint: commit your changes or stash them to proceed.', 'fatal: revert failed']);
  });
});
