import { buildWorld } from '../setup';
import { runLine } from '../interpreter';
import { finishEditor } from './editor';
import { mergeBase } from './refs';
import type { RunResult, World } from '../types';

const text = (r: RunResult) => r.lines.map((l) => l.map((s) => s.text).join(''));
const config = { 'user.name': 'Sam', 'user.email': 's@x.com' };
const P = '/home/you/p/';

/** main: notes.txt = base. feature adds `featureRun`, main then runs `mainRun`. */
const world = (featureRun: string[], mainRun: string[] = []): World =>
  buildWorld({
    cwd: 'p',
    config,
    repo: { at: 'p' },
    files: { 'p/notes.txt': 'base\n' },
    run: ['git add .', 'git commit -m "c1"', 'git switch -c feature', ...featureRun, 'git switch main', ...mainRun],
  });
const ffWorld = () => world(['echo f > f.txt', 'git add .', 'git commit -m "f1"']);
const cleanWorld = () => world(['echo f > f.txt', 'git add .', 'git commit -m "f1"'], ['echo m > m.txt', 'git add .', 'git commit -m "m1"']);
const conflictWorld = () =>
  world(['echo theirs > notes.txt', 'echo f > f.txt', 'git add .', 'git commit -m "f1"'], ['echo ours > notes.txt', 'git add .', 'git commit -m "m1"']);
const go = (w: World, ...lines: string[]) => {
  let r = runLine(w, 'true');
  for (const l of lines) r = runLine(r.world, l);
  return r;
};
const head = (w: World) => w.repo!.branches.main!;
const MARKED = '<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> feature\n';

describe('git merge', () => {
  it('fast-forward output and reflog', () => {
    const w = ffWorld();
    const from = head(w);
    const to = w.repo!.branches.feature!;
    const r = go(w, 'git merge feature');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual([`Updating ${from}..${to}`, 'Fast-forward', ' f.txt | 1 +', ' 1 file changed, 1 insertion(+)', ' create mode 100644 f.txt']);
    expect(head(r.world)).toBe(to);
    expect(r.world.files[P + 'f.txt']).toBe('f\n');
    expect(r.world.repo!.index['f.txt']).toBe('f\n');
    expect(r.world.repo!.reflog[0]).toEqual({ id: to, message: 'merge feature: Fast-forward' });
    expect(r.explain).toEqual({ kind: 'ok', text: "**main** just slid forward to **feature**'s commit; no new commit was needed." });
    expect(text(go(r.world, 'git merge feature'))).toEqual(['Already up to date.']);
    expect(text(go(w, 'git merge main'))).toEqual(['Already up to date.']);
  });

  it('--no-ff makes a merge commit with -m', () => {
    const w = ffWorld();
    const from = head(w);
    const to = w.repo!.branches.feature!;
    const r = go(w, 'git merge --no-ff -m "Join feature" feature');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual(["Merge made by the 'ort' strategy.", ' f.txt | 1 +', ' 1 file changed, 1 insertion(+)', ' create mode 100644 f.txt']);
    const c = r.world.repo!.commits[head(r.world)]!;
    expect(c.parents).toEqual([from, to]);
    expect(c.message).toBe('Join feature');
    expect(c.tree).toEqual({ 'notes.txt': 'base\n', 'f.txt': 'f\n' });
    expect(r.world.repo!.op).toBeNull();
    expect(r.world.repo!.reflog[0]!.message).toBe("merge feature: Merge made by the 'ort' strategy.");
    expect(r.explain).toEqual({ kind: 'ok', text: 'A merge commit has two parents, joining both lines of work.' });
    const noEdit = go(cleanWorld(), 'git merge --no-edit feature');
    expect(noEdit.world.repo!.commits[head(noEdit.world)]!.message).toBe("Merge branch 'feature'");
  });

  it('clean merge without -m opens the editor; finishEditor makes a 2-parent commit', () => {
    const w = cleanWorld();
    const r = go(w, 'git merge feature');
    expect(r.exitCode).toBe(0);
    expect(r.world.pending?.text.startsWith("Merge branch 'feature'\n\n# Please enter a commit message to explain why this merge is necessary,")).toBe(true);
    expect(r.world.repo!.op).toEqual({ kind: 'merge', theirs: w.repo!.branches.feature, theirsLabel: 'feature', message: "Merge branch 'feature'", conflicts: [] });
    expect(r.world.files[P + 'f.txt']).toBe('f\n');
    expect(r.world.repo!.index['f.txt']).toBe('f\n');
    const done = finishEditor(r.world, r.world.pending!.text);
    expect(done.exitCode).toBe(0);
    const c = done.world.repo!.commits[head(done.world)]!;
    expect(c.parents).toEqual([head(w), w.repo!.branches.feature]);
    expect(c.message).toBe("Merge branch 'feature'");
    expect(done.world.repo!.op).toBeNull();
    expect(text(done)).toEqual(["Merge made by the 'ort' strategy.", ' f.txt | 1 +', ' 1 file changed, 1 insertion(+)', ' create mode 100644 f.txt']);
    expect(done.world.repo!.reflog[0]!.message).toBe("merge feature: Merge made by the 'ort' strategy.");
    const other = go(w, 'git switch -c dev', 'git merge feature');
    expect(other.world.pending?.text.startsWith("Merge branch 'feature' into dev\n\n#")).toBe(true);
  });

  it('closing the editor keeps the merge in progress', () => {
    const w = go(cleanWorld(), 'git merge feature').world;
    const r = finishEditor(w, null);
    expect(text(r)).toEqual(["Not committing merge; use 'git commit' to complete the merge."]);
    expect(r.world.repo!.op?.kind).toBe('merge');
    expect(r.world.pending).toBeUndefined();
    const st = text(go(r.world, 'git status'));
    expect(st.slice(0, 3)).toEqual(['On branch main', 'All conflicts fixed but you are still merging.', '  (use "git commit" to conclude merge)']);
    const done = go(r.world, 'git commit --no-edit');
    expect(done.exitCode).toBe(0);
    expect(done.world.repo!.commits[head(done.world)]!.parents).toHaveLength(2);
  });

  it('conflict output, status sections, op.conflicts', () => {
    const w = conflictWorld();
    const r = go(w, 'git merge feature');
    expect(r.exitCode).toBe(1);
    expect(text(r)).toEqual([
      'Auto-merging notes.txt',
      'CONFLICT (content): Merge conflict in notes.txt',
      'Automatic merge failed; fix conflicts and then commit the result.',
    ]);
    expect(r.explain).toEqual({ kind: 'warn', text: "Git couldn't combine the same lines. Open the file with `code notes.txt`, choose what to keep, then `git add notes.txt`." });
    const repo = r.world.repo!;
    expect(repo.op).toEqual({ kind: 'merge', theirs: w.repo!.branches.feature, theirsLabel: 'feature', message: "Merge branch 'feature'", conflicts: ['notes.txt'] });
    expect(repo.index['notes.txt']).toBe('ours\n');
    expect(repo.index['f.txt']).toBe('f\n');
    expect(r.world.files[P + 'notes.txt']).toBe(MARKED);
    expect(head(r.world)).toBe(head(w));
    expect(text(go(r.world, 'git status'))).toEqual([
      'On branch main',
      'You have unmerged paths.',
      '  (fix conflicts and run "git commit")',
      '  (use "git merge --abort" to abort the merge)',
      '',
      'Changes to be committed:',
      '\tnew file:   f.txt',
      '',
      'Unmerged paths:',
      '  (use "git add <file>..." to mark resolution)',
      '\tboth modified:   notes.txt',
      '',
    ]);
  });

  it('add/add and modify/delete conflicts', () => {
    const w2 = buildWorld({
      cwd: 'p',
      config,
      repo: { at: 'p' },
      files: { 'p/a.txt': 'a\n', 'p/b.txt': 'b\n' },
      run: [
        'git add .', 'git commit -m "c1"',
        'git switch -c feature', 'rm a.txt', 'echo b2 > b.txt', 'echo t > both.txt', 'git add .', 'git commit -m "f1"',
        'git switch main', 'echo a2 > a.txt', 'rm b.txt', 'echo o > both.txt', 'git add .', 'git commit -m "m1"',
      ],
    });
    const r = go(w2, 'git merge feature');
    expect(r.exitCode).toBe(1);
    expect(text(r)).toEqual([
      'CONFLICT (modify/delete): a.txt deleted in feature and modified in HEAD.  Version HEAD of a.txt left in tree.',
      'CONFLICT (modify/delete): b.txt deleted in HEAD and modified in feature.  Version feature of b.txt left in tree.',
      'Auto-merging both.txt',
      'CONFLICT (add/add): Merge conflict in both.txt',
      'Automatic merge failed; fix conflicts and then commit the result.',
    ]);
    expect(r.world.files[P + 'b.txt']).toBe('b2\n');
    expect(r.world.repo!.index['b.txt']).toBeUndefined();
    expect(text(go(r.world, 'git status'))).toEqual([
      'On branch main',
      'You have unmerged paths.',
      '  (fix conflicts and run "git commit")',
      '  (use "git merge --abort" to abort the merge)',
      '',
      'Unmerged paths:',
      '  (use "git add/rm <file>..." as appropriate to mark resolution)',
      '\tdeleted by them: a.txt',
      '\tdeleted by us:   b.txt',
      '\tboth added:      both.txt',
      '',
      'no changes added to commit (use "git add" and/or "git commit -a")',
    ]);
    expect(text(go(r.world, 'git status -s'))).toEqual(['UD a.txt', 'DU b.txt', 'AA both.txt']);
    const fixed = go(r.world, 'git add a.txt b.txt both.txt');
    expect(fixed.world.repo!.op!.conflicts).toEqual([]);
    expect(fixed.world.repo!.index['b.txt']).toBe('b2\n');
    const gone = go(r.world, 'rm b.txt', 'git add b.txt');
    expect(gone.exitCode).toBe(0);
    expect(gone.world.repo!.op!.conflicts).toEqual(['a.txt', 'both.txt']);
    expect(gone.world.repo!.index['b.txt']).toBeUndefined();
    const all = go(r.world, 'rm a.txt', 'git add a.txt', 'echo t > both.txt', 'git add .', 'git commit --no-edit');
    expect(all.exitCode).toBe(0);
    expect(all.world.repo!.commits[head(all.world)]!.tree).toEqual({ 'b.txt': 'b2\n', 'both.txt': 't\n' });
  });

  it('commit refuses while conflicted', () => {
    const w = go(conflictWorld(), 'git merge feature').world;
    const r = go(w, 'git commit -m "x"');
    expect(r.exitCode).toBe(128);
    expect(text(r)).toEqual([
      'error: Committing is not possible because you have unmerged files.',
      "hint: Fix them up in the work tree, and then use 'git add/rm <file>'",
      'hint: as appropriate to mark resolution and make a commit.',
      'fatal: Exiting because of an unresolved conflict.',
      'U\tnotes.txt',
    ]);
    expect(text(go(w, 'git merge --continue'))[0]).toBe('error: Committing is not possible because you have unmerged files.');
  });

  it('add resolves, then commit --no-edit concludes', () => {
    const w0 = conflictWorld();
    const w = go(w0, 'git merge feature', 'echo both > notes.txt', 'git add notes.txt').world;
    expect(w.repo!.op!.conflicts).toEqual([]);
    expect(text(go(w, 'git status')).slice(0, 7)).toEqual([
      'On branch main',
      'All conflicts fixed but you are still merging.',
      '  (use "git commit" to conclude merge)',
      '',
      'Changes to be committed:',
      '\tnew file:   f.txt',
      '\tmodified:   notes.txt',
    ]);
    expect(go(w, 'git merge --continue').world.pending?.text.startsWith("Merge branch 'feature'\n")).toBe(true);
    const r = go(w, 'git commit --no-edit');
    expect(r.exitCode).toBe(0);
    const c = r.world.repo!.commits[head(r.world)]!;
    expect(c.parents).toEqual([head(w0), w0.repo!.branches.feature]);
    expect(c.tree).toEqual({ 'notes.txt': 'both\n', 'f.txt': 'f\n' });
    expect(r.world.repo!.reflog[0]!.message).toBe("commit (merge): Merge branch 'feature'");
    expect(r.world.repo!.op).toBeNull();
  });

  it('--abort restores', () => {
    const w0 = conflictWorld();
    const w = go(w0, 'git merge feature').world;
    const r = go(w, 'git merge --abort');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual([]);
    expect(r.world.repo!.op).toBeNull();
    expect(r.world.files[P + 'notes.txt']).toBe('ours\n');
    expect(r.world.files[P + 'f.txt']).toBeUndefined();
    expect(r.world.repo!.index).toEqual({ 'notes.txt': 'ours\n' });
    expect(text(go(r.world, 'git status')).at(-1)).toBe('nothing to commit, working tree clean');
    const none = go(w0, 'git merge --abort');
    expect(none.exitCode).toBe(128);
    expect(text(none)).toEqual(['fatal: There is no merge to abort (MERGE_HEAD missing).']);
    expect(text(go(w0, 'git merge --continue'))).toEqual(['fatal: There is no merge in progress (MERGE_HEAD missing).']);
  });

  it('merge guards', () => {
    const w0 = conflictWorld();
    const unknown = go(w0, 'git merge nope');
    expect(unknown.exitCode).toBe(1);
    expect(text(unknown)).toEqual(['merge: nope - not something we can merge']);
    const mid = go(w0, 'git merge feature').world;
    const again = go(mid, 'git merge feature');
    expect(again.exitCode).toBe(128);
    expect(text(again)).toEqual([
      'error: Merging is not possible because you have unmerged files.',
      "hint: Fix them up in the work tree, and then use 'git add/rm <file>'",
      'hint: as appropriate to mark resolution and make a commit.',
      'fatal: Exiting because of an unresolved conflict.',
    ]);
    const resolved = go(mid, 'git add notes.txt', 'git merge feature');
    expect(text(resolved)).toEqual(['fatal: You have not concluded your merge (MERGE_HEAD exists).', 'Please, commit your changes before you merge.']);
    const dirty = go(w0, 'echo local > notes.txt', 'git merge feature');
    expect(dirty.exitCode).toBe(2);
    expect(text(dirty)).toEqual([
      'error: Your local changes to the following files would be overwritten by merge:',
      '\tnotes.txt',
      'Please commit your changes or stash them before you merge.',
      'Aborting',
      'Merge with strategy ort failed.',
    ]);
    expect(dirty.world.repo!.op).toBeNull();
    expect(dirty.world.files[P + 'notes.txt']).toBe('local\n');
    const busy = go(cleanWorld(), 'echo local > notes.txt', 'echo z > z.txt', 'git add notes.txt z.txt', 'git merge feature');
    expect(busy.exitCode).toBe(2);
    expect(text(busy)).toEqual([
      'error: Your local changes to the following files would be overwritten by merge:',
      '  notes.txt z.txt',
      'Merge with strategy ort failed.',
    ]);
    expect(busy.world.repo!.op).toBeNull();
    expect(busy.world.files[P + 'f.txt']).toBeUndefined();
    const self = go(w0, 'git merge main');
    expect(text(self)).toEqual(['Already up to date.']);
  });

  it('mergeBase breaks time ties by commit id', () => {
    const w = ffWorld();
    const c = (id: string, parents: string[]) => ({ id, parents, tree: {}, message: id, author: { name: 'S', email: 'e' }, time: 5 });
    const repo = { ...w.repo!, commits: { ...w.repo!.commits, bbb0000: c('bbb0000', []), aaa0000: c('aaa0000', []), x000001: c('x000001', ['bbb0000', 'aaa0000']), y000001: c('y000001', ['aaa0000', 'bbb0000']) } };
    expect(mergeBase(repo, 'x000001', 'y000001')).toBe('aaa0000');
    expect(mergeBase(repo, 'y000001', 'x000001')).toBe('aaa0000');
  });
});
