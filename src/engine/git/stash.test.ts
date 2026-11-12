import { buildWorld } from '../setup';
import { runLine } from '../interpreter';
import type { RunResult, World } from '../types';

const text = (r: RunResult) => r.lines.map((l) => l.map((s) => s.text).join(''));
const config = { 'user.name': 'Sam', 'user.email': 's@x.com' };
const P = '/home/you/p/';

/** c1 on main: notes=base, other=x. */
const world = (extra: string[] = []): World =>
  buildWorld({
    cwd: 'p',
    config,
    repo: { at: 'p' },
    files: { 'p/notes.txt': 'base\n', 'p/other.txt': 'x\n' },
    run: ['git add .', 'git commit -m "c1"', ...extra],
  });
const go = (w: World, ...lines: string[]) => {
  let r = runLine(w, 'true');
  for (const l of lines) r = runLine(r.world, l);
  return r;
};
const head = (w: World) => w.repo!.branches.main!;

describe('git stash', () => {
  it('stash saves and cleans', () => {
    const w = world(['echo one > notes.txt', 'echo st > other.txt', 'git add other.txt']);
    const id = head(w);
    const r = go(w, 'git stash');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual([`Saved working directory and index state WIP on main: ${id} c1`]);
    expect(r.world.files[P + 'notes.txt']).toBe('base\n');
    expect(r.world.files[P + 'other.txt']).toBe('x\n');
    expect(r.world.repo!.index).toEqual({ 'notes.txt': w.repo!.commits[id]!.tree['notes.txt'], 'other.txt': w.repo!.commits[id]!.tree['other.txt'] });
    const entry = r.world.repo!.stash[0]!;
    expect(entry).toMatchObject({ base: id, branch: 'main', message: `WIP on main: ${id} c1`, work: { 'notes.txt': 'one\n', 'other.txt': 'st\n' } });
    expect(r.world.repo!.reflog[0]).toEqual({ id, message: 'reset: moving to HEAD' });
    expect(text(go(r.world, 'git status'))).toEqual(['On branch main', 'nothing to commit, working tree clean']);
    expect(r.explain?.kind).toBe('ok');
  });

  it('stash -m message in list', () => {
    const w = world(['echo one > notes.txt']);
    const id = head(w);
    const r = go(w, 'git stash -m "my msg"');
    expect(text(r)).toEqual(['Saved working directory and index state On main: my msg']);
    const r2 = go(r.world, 'echo two > notes.txt', 'git stash push -m second', 'git stash list');
    expect(text(r2)).toEqual(['stash@{0}: On main: second', 'stash@{1}: On main: my msg']);
    expect(text(go(go(w, 'git stash').world, 'git stash list'))).toEqual([`stash@{0}: WIP on main: ${id} c1`]);
  });

  it('stash with nothing', () => {
    const r = go(world(), 'git stash');
    expect(text(r)).toEqual(['No local changes to save']);
    expect(r.exitCode).toBe(0);
    expect(r.world.repo!.stash).toEqual([]);
  });

  it('untracked file stays unless -u', () => {
    const w = world(['echo u > new.txt', 'echo one > notes.txt']);
    const r = go(w, 'git stash');
    expect(r.world.files[P + 'new.txt']).toBe('u\n');
    expect(r.world.repo!.stash[0]!.work['new.txt']).toBeUndefined();
    expect(text(go(world(['echo u > new.txt']), 'git stash'))).toEqual(['No local changes to save']);
    const u = go(w, 'git stash -u');
    expect(u.world.files[P + 'new.txt']).toBeUndefined();
    expect(u.world.repo!.stash[0]!.work['new.txt']).toBe('u\n');
    const back = go(u.world, 'git stash pop');
    expect(back.world.files[P + 'new.txt']).toBe('u\n');
    expect(back.world.files[P + 'notes.txt']).toBe('one\n');
  });

  it('switch after stash works where it was refused', () => {
    const w = world(['git switch -c feature', 'echo f > notes.txt', 'git commit -am "f1"', 'git switch main', 'echo dirty > notes.txt']);
    const refused = go(w, 'git switch feature');
    expect(refused.exitCode).toBe(1);
    expect(text(refused)[0]).toBe('error: Your local changes to the following files would be overwritten by checkout:');
    const r = go(w, 'git stash', 'git switch feature');
    expect(r.exitCode).toBe(0);
    expect(r.world.files[P + 'notes.txt']).toBe('f\n');
    const back = go(r.world, 'git switch main', 'git stash pop');
    expect(back.world.files[P + 'notes.txt']).toBe('dirty\n');
  });

  it('pop restores and drops', () => {
    const w = world(['echo one > notes.txt']);
    const r = go(w, 'git stash');
    const id = r.world.repo!.stash[0]!.id;
    const p = go(r.world, 'git stash pop');
    expect(p.exitCode).toBe(0);
    expect(text(p)).toEqual([
      'On branch main',
      'Changes not staged for commit:',
      '  (use "git add <file>..." to update what will be committed)',
      '  (use "git restore <file>..." to discard changes in working directory)',
      '\tmodified:   notes.txt',
      '',
      'no changes added to commit (use "git add" and/or "git commit -a")',
      `Dropped refs/stash@{0} (${id})`,
    ]);
    expect(p.world.files[P + 'notes.txt']).toBe('one\n');
    expect(p.world.repo!.stash).toEqual([]);
    expect(p.explain).toEqual({ kind: 'ok', text: 'Your work is back and the shelf entry is gone.' });
  });

  it('pop does not restore staged state but keeps new files staged', () => {
    const w = world(['echo one > notes.txt', 'git add notes.txt', 'echo n > added.txt', 'git add added.txt']);
    const p = go(w, 'git stash', 'git stash pop');
    expect(text(go(p.world, 'git status'))).toEqual(expect.arrayContaining(['\tnew file:   added.txt', '\tmodified:   notes.txt']));
    const st = text(go(p.world, 'git status -s'));
    expect(st).toEqual(['A  added.txt', ' M notes.txt']);
  });

  it('apply keeps the entry', () => {
    const r = go(world(['echo one > notes.txt']), 'git stash');
    const a = go(r.world, 'git stash apply');
    expect(a.exitCode).toBe(0);
    expect(text(a).some((l) => l.startsWith('Dropped'))).toBe(false);
    expect(a.world.repo!.stash).toHaveLength(1);
    expect(a.world.files[P + 'notes.txt']).toBe('one\n');
    const again = go(a.world, 'git stash apply');
    expect(again.exitCode).toBe(1);
    expect(text(again)).toEqual([
      'error: Your local changes to the following files would be overwritten by merge:',
      '\tnotes.txt',
      'Please commit your changes or stash them before you merge.',
      'Aborting',
    ]);
  });

  it('pop conflict keeps the entry', () => {
    const w = world(['echo mine > notes.txt']);
    const r = go(w, 'git stash', 'echo other > notes.txt', 'git commit -am "c2"', 'git stash pop');
    expect(r.exitCode).toBe(1);
    const out = text(r);
    expect(out.slice(0, 2)).toEqual(['Auto-merging notes.txt', 'CONFLICT (content): Merge conflict in notes.txt']);
    expect(out[out.length - 1]).toBe('The stash entry is kept in case you need it again.');
    expect(r.world.files[P + 'notes.txt']).toBe('<<<<<<< Updated upstream\nother\n=======\nmine\n>>>>>>> Stashed changes\n');
    expect(r.world.repo!.stash).toHaveLength(1);
    expect(r.explain?.kind).toBe('warn');
  });

  it('pop with no entries', () => {
    const r = go(world(), 'git stash pop');
    expect(text(r)).toEqual(['No stash entries found.']);
    expect(r.exitCode).toBe(1);
    expect(text(go(world(), 'git stash list'))).toEqual([]);
  });

  it('drop', () => {
    const r = go(world(['echo one > notes.txt']), 'git stash', 'echo two > notes.txt', 'git stash');
    const [first, second] = r.world.repo!.stash;
    const d = go(r.world, 'git stash drop stash@{1}');
    expect(text(d)).toEqual([`Dropped stash@{1} (${second!.id})`]);
    expect(d.world.repo!.stash).toEqual([first]);
    expect(text(go(d.world, 'git stash drop'))).toEqual([`Dropped stash@{0} (${first!.id})`]);
    const bad = go(r.world, 'git stash drop stash@{5}');
    expect(text(bad)).toEqual(["fatal: log for 'stash' only has 2 entries"]);
    expect(bad.exitCode).toBe(128);
    expect(text(go(world(), 'git stash drop'))).toEqual(['No stash entries found.']);
  });

  it('refuses while a merge is in progress', () => {
    const w = world(['git switch -c f', 'echo x > notes.txt', 'git commit -am f', 'git switch main', 'echo y > notes.txt', 'git commit -am m']);
    const r = go(w, 'git merge f', 'git stash');
    expect(text(r)).toEqual(['error: could not write index', 'notes.txt: needs merge']);
    expect(r.exitCode).toBe(1);
  });

  it('pop and apply refuse during a merge without changing anything', () => {
    const w = world(['echo wip > other.txt', 'git stash', 'git switch -c f', 'echo x > notes.txt', 'git commit -am f', 'git switch main', 'echo y > notes.txt', 'git commit -am m']);
    const merging = go(w, 'git merge f').world;
    const kept = 'The stash entry is kept in case you need it again.';
    for (const [cmd, tail] of [['git stash pop', [kept]], ['git stash apply', []]] as const) {
      const r = go(merging, cmd);
      expect(text(r)).toEqual(['error: could not write index', 'notes.txt: needs merge', ...tail]);
      expect(r.exitCode).toBe(128);
      expect(r.world).toEqual(merging);
    }
  });

  it('accepts bare numbers and stash@{1} for pop and drop', () => {
    const r = go(world(['echo one > notes.txt']), 'git stash', 'echo two > notes.txt', 'git stash', 'echo three > notes.txt', 'git stash');
    const [a, b, c] = r.world.repo!.stash;
    const p = go(r.world, 'git stash pop stash@{1}');
    expect(text(p).at(-1)).toBe(`Dropped refs/stash@{1} (${b!.id})`);
    expect(p.world.repo!.stash).toEqual([a, c]);
    expect(p.world.files[P + 'notes.txt']).toBe('two\n');
    expect(text(go(r.world, 'git stash drop 2'))).toEqual([`Dropped stash@{2} (${c!.id})`]);
  });

  it('says clearly when a stash form is not supported', () => {
    for (const c of ['git stash show', 'git stash clear', 'git stash save', 'git stash push notes.txt']) {
      const r = go(world(['echo one > notes.txt']), c);
      expect(text(r)[0]).toMatch(/is not supported in this sandbox/);
      expect(r.exitCode).toBe(1);
    }
  });

  it('refuses with no commits and unknown subcommands', () => {
    expect(text(go(buildWorld({ cwd: 'p', config, repo: { at: 'p' }, files: { 'p/a.txt': '1' }, run: ['git add .'] }), 'git stash'))).toEqual(['You do not have the initial commit yet']);
    expect(text(go(world(), 'git stash nope'))).toEqual(["fatal: subcommand wasn't specified; 'push' can't be assumed due to unexpected token 'nope'"]);
  });
});
