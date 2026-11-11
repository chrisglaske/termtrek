import { buildWorld } from '../setup';
import { runLine } from '../interpreter';
import { finishEditor } from './editor';
import { teammatePush } from '../remote/teammate';
import type { RunResult, World } from '../types';

const text = (r: RunResult) => r.lines.map((l) => l.map((s) => s.text).join(''));
const config = { 'user.name': 'Sam Rivera', 'user.email': 'sam@example.com' };
const P = '/home/you/p/';
const write = (path: string, content: string) => (w: World): World => ({ ...w, files: { ...w.files, [P + path]: content } });
const as = (name: string, email: string) => (w: World): World => ({ ...w, config: { ...w.config, 'user.name': name, 'user.email': email } });
const go = (w: World, ...lines: string[]) => {
  let r = runLine(w, 'true');
  for (const l of lines) r = runLine(r.world, l);
  return r;
};
const tip = (w: World, b: string) => w.repo!.branches[b]!;
const subject = (w: World, id: string) => w.repo!.commits[id]!.message.split('\n')[0]!;
const HINTS = [
  'hint: Resolve all conflicts manually, mark them as resolved with',
  'hint: "git add/rm <conflicted_files>", then run "git rebase --continue".',
  'hint: You can instead skip this commit: run "git rebase --skip".',
  'hint: To abort and get back to the state before "git rebase", run "git rebase --abort".',
];

/**
 * main: "Add notes" (notes a/b/c), then "Main edit" (notes a/MAIN/c).
 * feature (from "Add notes"): "Feature edit" (notes a/FEAT/c, by Alex Kim), then "Add other" (other.txt).
 * HEAD is on feature.
 */
const conflictWorld = (): World =>
  buildWorld({
    cwd: 'p',
    config,
    repo: { at: 'p' },
    files: { 'p/notes.txt': 'a\nb\nc\n' },
    run: [
      'git add .', 'git commit -m "Add notes"', 'git switch -c feature',
      as('Alex Kim', 'alex@example.com'), write('notes.txt', 'a\nFEAT\nc\n'), 'git commit -am "Feature edit"', as('Sam Rivera', 'sam@example.com'),
      'echo x > other.txt', 'git add other.txt', 'git commit -m "Add other"',
      'git switch main', write('notes.txt', 'a\nMAIN\nc\n'), 'git commit -am "Main edit"', 'git switch feature',
    ],
  });

/** Like conflictWorld, but the commits touch different files, so the replay is clean. */
const cleanWorld = (): World =>
  buildWorld({
    cwd: 'p',
    config,
    repo: { at: 'p' },
    files: { 'p/notes.txt': 'a\nb\nc\n' },
    run: [
      'git add .', 'git commit -m "Add notes"', 'git switch -c feature',
      as('Alex Kim', 'alex@example.com'), 'echo z > z.txt', 'git add z.txt', 'git commit -m "Add z"', as('Sam Rivera', 'sam@example.com'),
      'echo y > y.txt', 'git add y.txt', 'git commit -m "Add y"',
      'git switch main', 'echo w > w.txt', 'git add w.txt', 'git commit -m "Add w"', 'git switch feature',
    ],
  });

const stopped = () => go(conflictWorld(), 'git rebase main');

describe('git rebase', () => {
  it('rebase replays commits onto upstream', () => {
    const w = cleanWorld();
    const old = tip(w, 'feature');
    const oldParent = w.repo!.commits[old]!.parents[0]!;
    const main = tip(w, 'main');
    const r = go(w, 'git rebase main');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual(['Successfully rebased and updated refs/heads/feature.']);
    const repo = r.world.repo!;
    expect(repo.head).toEqual({ kind: 'branch', name: 'feature' });
    expect(repo.op).toBeNull();
    const y = tip(r.world, 'feature');
    const z = repo.commits[y]!.parents[0]!;
    expect(y).not.toBe(old);
    expect(z).not.toBe(oldParent);
    expect(repo.commits[z]!.parents).toEqual([main]);
    expect(subject(r.world, y)).toBe('Add y');
    expect(subject(r.world, z)).toBe('Add z');
    expect(repo.commits[z]!.author).toEqual({ name: 'Alex Kim', email: 'alex@example.com' });
    expect(repo.commits[y]!.author).toEqual({ name: 'Sam Rivera', email: 'sam@example.com' });
    expect(repo.commits[y]!.tree).toEqual({ 'notes.txt': 'a\nb\nc\n', 'w.txt': 'w\n', 'y.txt': 'y\n', 'z.txt': 'z\n' });
    expect(r.world.files[P + 'w.txt']).toBe('w\n');
    expect(repo.index).toEqual(repo.commits[y]!.tree);
    expect(repo.reflog.slice(0, 4)).toEqual([
      { id: y, message: 'rebase (finish): returning to refs/heads/feature' },
      { id: y, message: 'rebase (pick): Add y' },
      { id: z, message: 'rebase (pick): Add z' },
      { id: main, message: 'rebase (start): checkout main' },
    ]);
  });

  it('rebase with no upstream', () => {
    const r = go(cleanWorld(), 'git rebase');
    expect(r.exitCode).toBe(1);
    expect(text(r)).toEqual([
      'There is no tracking information for the current branch.',
      'Please specify which branch you want to rebase against.',
      'See git-rebase(1) for details.',
      '',
      "    git rebase '<branch>'",
      '',
      'If you wish to set tracking information for this branch you can do so with:',
      '',
      '    git branch --set-upstream-to=<remote>/<branch> feature',
      '',
    ]);
    const d = go(cleanWorld(), 'git switch --detach HEAD', 'git rebase');
    expect(d.exitCode).toBe(1);
    expect(text(d)).toEqual([
      'You are not currently on a branch.',
      'Please specify which branch you want to rebase against.',
      'See git-rebase(1) for details.',
      '',
      "    git rebase '<branch>'",
      '',
    ]);
    expect(text(go(cleanWorld(), 'git rebase nope'))).toEqual(["fatal: invalid upstream 'nope'"]);
    expect(go(cleanWorld(), 'git rebase nope').exitCode).toBe(128);
  });

  it('rebase with no argument uses the upstream', () => {
    let w = buildWorld({ config, remote: { slug: 'team/notes', commits: [{ message: 'Add notes', files: { 'notes.txt': 'one\n' } }] } });
    w = go(w, 'git clone https://git.example.com/team/notes.git', 'cd notes', 'echo mine > mine.txt', 'git add .', 'git commit -m "Mine"').world;
    w = teammatePush({ branch: 'main', message: 'Alex edit', files: { 'alex.txt': 'alex\n' }, author: { name: 'Alex Kim', email: 'alex@example.com' } })(w);
    const r = go(w, 'git fetch', 'git rebase');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual(['Successfully rebased and updated refs/heads/main.']);
    const repo = r.world.repo!;
    expect(repo.commits[repo.branches.main!]!.parents).toEqual([repo.remoteRefs['origin/main']]);
    expect(repo.reflog.find((e) => e.message.startsWith('rebase (start)'))!.message).toBe('rebase (start): checkout refs/remotes/origin/main');
    expect(text(go(r.world, 'git status'))[1]).toBe("Your branch is ahead of 'origin/main' by 1 commit.");
  });

  it('rebase refuses a dirty tree', () => {
    const u = go(cleanWorld(), 'echo more >> y.txt', 'git rebase main');
    expect(u.exitCode).toBe(1);
    expect(text(u)).toEqual(['error: cannot rebase: You have unstaged changes.', 'error: Please commit or stash them.']);
    expect(u.world.repo!.op).toBeNull();
    const s = go(cleanWorld(), 'echo more >> y.txt', 'git add y.txt', 'git rebase main');
    expect(text(s)).toEqual(['error: cannot rebase: Your index contains uncommitted changes.', 'error: Please commit or stash them.']);
    const both = go(cleanWorld(), 'echo n > n.txt', 'git add n.txt', 'echo more >> y.txt', 'git rebase main');
    expect(text(both)).toEqual([
      'error: cannot rebase: You have unstaged changes.',
      'error: additionally, your index contains uncommitted changes.',
      'error: Please commit or stash them.',
    ]);
    // Untracked files do not block a rebase.
    expect(go(cleanWorld(), 'echo u > u.txt', 'git rebase main').exitCode).toBe(0);
  });

  it('rebase refuses while a merge is in progress', () => {
    const m = go(conflictWorld(), 'git merge main', 'git rebase main');
    expect(m.exitCode).toBe(1);
    expect(text(m)).toEqual([
      'notes.txt: needs merge',
      'error: cannot rebase: You have unstaged changes.',
      'error: additionally, your index contains uncommitted changes.',
      'error: Please commit or stash them.',
    ]);
    expect(m.world.repo!.op!.kind).toBe('merge');
  });

  it('rebase up to date and fast-forward', () => {
    const w = cleanWorld();
    const up = go(w, 'git rebase feature~1');
    expect(up.exitCode).toBe(0);
    expect(text(up)).toEqual(['Current branch feature is up to date.']);
    expect(up.world.repo).toEqual(w.repo);
    const main = tip(w, 'main');
    const ff = go(w, 'git switch -c behind main~1', 'git rebase main');
    expect(ff.exitCode).toBe(0);
    expect(text(ff)).toEqual(['Successfully rebased and updated refs/heads/behind.']);
    expect(tip(ff.world, 'behind')).toBe(main);
    expect(ff.world.repo!.head).toEqual({ kind: 'branch', name: 'behind' });
    expect(ff.world.files[P + 'w.txt']).toBe('w\n');
    expect(ff.world.repo!.reflog.slice(0, 2)).toEqual([
      { id: main, message: 'rebase (finish): returning to refs/heads/behind' },
      { id: main, message: 'rebase (start): checkout main' },
    ]);
  });

  it('rebase conflict stops', () => {
    const w = conflictWorld();
    const feat = w.repo!.commits[tip(w, 'feature')]!.parents[0]!;
    const other = tip(w, 'feature');
    const main = tip(w, 'main');
    const r = go(w, 'git rebase main');
    expect(r.exitCode).toBe(1);
    expect(text(r)).toEqual([
      'Auto-merging notes.txt',
      'CONFLICT (content): Merge conflict in notes.txt',
      `error: could not apply ${feat}... Feature edit`,
      ...HINTS,
      `Could not apply ${feat}... # Feature edit`,
    ]);
    const repo = r.world.repo!;
    expect(repo.head).toEqual({ kind: 'detached', id: main });
    expect(repo.branches.feature).toBe(other);
    expect(repo.op?.kind).toBe('rebase');
    expect(repo.op?.conflicts).toEqual(['notes.txt']);
    expect(repo.op?.rebase).toEqual({ branch: 'feature', onto: main, ontoLabel: 'main', orig: other, todo: [other], current: feat, stoppedAt: main });
    expect(r.world.files[P + 'notes.txt']).toBe(`a\n<<<<<<< HEAD\nMAIN\n=======\nFEAT\n>>>>>>> ${feat} (Feature edit)\nc\n`);
    expect(text(go(r.world, 'git status'))).toEqual([
      `interactive rebase in progress; onto ${main}`,
      'Last command done (1 command done):',
      `   pick ${feat} # Feature edit`,
      'Next command to do (1 remaining command):',
      `   pick ${other} # Add other`,
      '  (use "git rebase --edit-todo" to view and edit)',
      `You are currently rebasing branch 'feature' on '${main}'.`,
      '  (fix conflicts and then run "git rebase --continue")',
      '  (use "git rebase --skip" to skip this patch)',
      '  (use "git rebase --abort" to check out the original branch)',
      '',
      'Unmerged paths:',
      '  (use "git restore --staged <file>..." to unstage)',
      '  (use "git add <file>..." to mark resolution)',
      '\tboth modified:   notes.txt',
      '',
      'no changes added to commit (use "git add" and/or "git commit -a")',
    ]);
    expect(text(go(r.world, 'git status -s'))).toEqual(['UU notes.txt']);
    expect(text(go(r.world, 'git rebase --continue'))).toEqual([
      'notes.txt: needs merge',
      'You must edit all merge conflicts and then',
      'mark them as resolved using git add',
    ]);
    expect(go(r.world, 'git rebase --continue').exitCode).toBe(1);
    expect(text(go(r.world, 'git rebase main'))).toEqual([
      'fatal: It seems that there is already a rebase-merge directory, and',
      'I wonder if you are in the middle of another rebase.  If that is the',
      'case, please try',
      '\tgit rebase (--continue | --abort | --skip)',
      'If that is not the case, please',
      '\trm -fr ".git/rebase-merge"',
      'and run me again.  I am stopping in case you still have something',
      'valuable there.',
      '',
    ]);
  });

  it('rebase continue opens the editor and finishes', () => {
    const r = stopped();
    const feat = r.world.repo!.op!.rebase!.current!;
    const main = r.world.repo!.op!.rebase!.onto;
    const other = r.world.repo!.op!.rebase!.orig;
    const fixed = go(r.world, 'echo fixed > notes.txt', 'git add notes.txt');
    expect(text(go(fixed.world, 'git status')).slice(6, 9)).toEqual([
      `You are currently rebasing branch 'feature' on '${main}'.`,
      '  (all conflicts fixed: run "git rebase --continue")',
      '',
    ]);
    const c = go(fixed.world, 'git rebase --continue');
    expect(c.exitCode).toBe(0);
    expect(text(c)).toEqual(['hint: Waiting for your editor to close the file...']);
    expect(c.world.pending?.rebase).toBe(true);
    expect(c.world.pending!.text).toBe([
      'Feature edit',
      '',
      '# Conflicts:',
      '#\tnotes.txt',
      '',
      '# Please enter the commit message for your changes. Lines starting',
      "# with '#' will be ignored, and an empty message aborts the commit.",
      '#',
      `# interactive rebase in progress; onto ${main}`,
      '# Last command done (1 command done):',
      `#    pick ${feat} # Feature edit`,
      '# Next command to do (1 remaining command):',
      `#    pick ${other} # Add other`,
      `# You are currently rebasing branch 'feature' on '${main}'.`,
      '#',
      '# Changes to be committed:',
      '#\tmodified:   notes.txt',
      '#',
      '',
    ].join('\n'));
    const done = finishEditor(c.world, c.world.pending!.text);
    expect(done.exitCode).toBe(0);
    const repo = done.world.repo!;
    const top = tip(done.world, 'feature');
    const mid = repo.commits[top]!.parents[0]!;
    expect(text(done)).toEqual([
      `[detached HEAD ${mid}] Feature edit`,
      ' 1 file changed, 1 insertion(+), 3 deletions(-)',
      'Successfully rebased and updated refs/heads/feature.',
    ]);
    expect(repo.op).toBeNull();
    expect(repo.head).toEqual({ kind: 'branch', name: 'feature' });
    expect(repo.commits[mid]!.message).toBe('Feature edit');
    expect(repo.commits[mid]!.author).toEqual({ name: 'Alex Kim', email: 'alex@example.com' });
    expect(repo.commits[mid]!.parents).toEqual([main]);
    expect(repo.commits[top]!.tree).toEqual({ 'notes.txt': 'fixed\n', 'other.txt': 'x\n' });
    expect(repo.reflog.slice(0, 4).map((e) => e.message)).toEqual([
      'rebase (finish): returning to refs/heads/feature',
      'rebase (pick): Add other',
      'rebase (continue): Feature edit',
      'rebase (start): checkout main',
    ]);
  });

  it('rebase continue editor closed', () => {
    const r = stopped();
    const fixed = go(r.world, 'echo fixed > notes.txt', 'git add notes.txt', 'git rebase --continue');
    for (const save of [null, '# only comments\n']) {
      const closed = finishEditor(fixed.world, save);
      expect(closed.exitCode).toBe(1);
      expect(text(closed)).toEqual(['Aborting commit due to empty commit message.', 'error: could not commit staged changes.']);
      expect(closed.world.pending).toBeUndefined();
      // Still stopped: same HEAD, same branch tip, the fix is still staged.
      expect(closed.world.repo!.op).toEqual(fixed.world.repo!.op);
      expect(closed.world.repo!.head).toEqual(r.world.repo!.head);
      expect(closed.world.repo!.branches).toEqual(r.world.repo!.branches);
      expect(closed.world.repo!.index['notes.txt']).toBe('fixed\n');
      expect(closed.world.files[P + 'notes.txt']).toBe('fixed\n');
      const again = go(closed.world, 'git rebase --continue');
      expect(again.world.pending?.rebase).toBe(true);
    }
  });

  it('rebase abort restores the branch', () => {
    const w = buildWorld({
      cwd: 'p',
      config,
      repo: { at: 'p' },
      files: { 'p/notes.txt': 'a\nb\nc\n' },
      run: [
        'git add .', 'git commit -m "Add notes"', 'git switch -c feature',
        'echo x > other.txt', 'git add other.txt', 'git commit -m "Add other"',
        write('notes.txt', 'a\nFEAT\nc\n'), 'git commit -am "Feature edit"',
        'git switch main', write('notes.txt', 'a\nMAIN\nc\n'), 'git commit -am "Main edit"', 'git switch feature',
      ],
    });
    const r = go(w, 'git rebase main');
    expect(r.exitCode).toBe(1);
    // One commit was already replayed before the stop.
    expect(r.world.repo!.reflog[0]!.message).toBe('rebase (pick): Add other');
    const a = go(r.world, 'echo junk > junk.txt', 'git add junk.txt', 'git rebase --abort');
    expect(a.exitCode).toBe(0);
    expect(text(a)).toEqual([]);
    const repo = a.world.repo!;
    expect(repo.op).toBeNull();
    expect(repo.head).toEqual({ kind: 'branch', name: 'feature' });
    expect(repo.branches).toEqual(w.repo!.branches);
    expect(repo.index).toEqual(w.repo!.index);
    expect(a.world.files).toEqual(w.files);
    expect(repo.reflog[0]).toEqual({ id: tip(w, 'feature'), message: 'rebase (abort): returning to refs/heads/feature' });
    expect(text(go(a.world, 'git status'))).toEqual(['On branch feature', 'nothing to commit, working tree clean']);
  });

  it('rebase skip drops the commit', () => {
    const r = stopped();
    const main = r.world.repo!.op!.rebase!.onto;
    const s = go(r.world, 'git rebase --skip');
    expect(s.exitCode).toBe(0);
    expect(text(s)).toEqual(['Successfully rebased and updated refs/heads/feature.']);
    const repo = s.world.repo!;
    const top = tip(s.world, 'feature');
    expect(repo.commits[top]!.parents).toEqual([main]);
    expect(subject(s.world, top)).toBe('Add other');
    expect(repo.commits[top]!.tree).toEqual({ 'notes.txt': 'a\nMAIN\nc\n', 'other.txt': 'x\n' });
    expect(s.world.files[P + 'notes.txt']).toBe('a\nMAIN\nc\n');
    expect(repo.op).toBeNull();
  });

  it('continue with the conflict resolved to HEAD drops the commit', () => {
    const r = stopped();
    const main = r.world.repo!.op!.rebase!.onto;
    const c = go(r.world, 'git checkout main -- notes.txt', 'git add notes.txt', 'git rebase --continue');
    expect(c.exitCode).toBe(0);
    expect(text(c)).toEqual(['Successfully rebased and updated refs/heads/feature.']);
    expect(c.world.repo!.commits[tip(c.world, 'feature')]!.parents).toEqual([main]);
  });

  it('commit by hand during a rebase stop', () => {
    const r = stopped();
    const main = r.world.repo!.op!.rebase!.onto;
    const h = go(r.world, 'echo fixed > notes.txt', 'git add notes.txt', 'git commit -m "By hand"');
    expect(h.exitCode).toBe(0);
    const mine = h.world.repo!.head.kind === 'detached' ? h.world.repo!.head.id : '';
    expect(text(h)[0]).toBe(`[detached HEAD ${mine}] By hand`);
    expect(h.world.repo!.op?.kind).toBe('rebase');
    expect(h.world.repo!.commits[mine]!.parents).toEqual([main]);
    expect(h.world.repo!.commits[mine]!.author).toEqual({ name: 'Sam Rivera', email: 'sam@example.com' });
    expect(h.world.repo!.reflog[0]!.message).toBe('commit: By hand');
    expect(text(go(h.world, 'git status')).slice(6)).toEqual([
      `You are currently editing a commit while rebasing branch 'feature' on '${main}'.`,
      '  (use "git commit --amend" to amend the current commit)',
      '  (use "git rebase --continue" once you are satisfied with your changes)',
      '',
      'nothing to commit, working tree clean',
    ]);
    const c = go(h.world, 'git rebase --continue');
    expect(c.exitCode).toBe(0);
    expect(text(c)).toEqual(['Successfully rebased and updated refs/heads/feature.']);
    const top = tip(c.world, 'feature');
    expect(subject(c.world, top)).toBe('Add other');
    expect(c.world.repo!.commits[top]!.parents).toEqual([mine]);
    expect(c.world.repo!.head).toEqual({ kind: 'branch', name: 'feature' });
    expect(c.world.repo!.op).toBeNull();
  });

  it('hand commit editor shows the rebase template', () => {
    const r = stopped();
    const c = go(r.world, 'echo fixed > notes.txt', 'git add notes.txt', 'git commit');
    expect(c.world.pending!.text.startsWith('Feature edit\n\n# Conflicts:\n#\tnotes.txt\n\n# Please enter')).toBe(true);
    expect(c.world.pending!.rebase).toBeUndefined();
    const closed = finishEditor(c.world, null);
    expect(text(closed)).toEqual(['Aborting commit due to empty commit message.']);
    expect(closed.world.repo!.op?.kind).toBe('rebase');
  });

  it('guards during a rebase', () => {
    const r = stopped();
    const before = r.world;
    const SWITCH = ['fatal: cannot switch branch while rebasing', 'Consider "git rebase --quit" or "git worktree add".'];
    const UNMERGED = [
      'error: Merging is not possible because you have unmerged files.',
      "hint: Fix them up in the work tree, and then use 'git add/rm <file>'",
      'hint: as appropriate to mark resolution and make a commit.',
      'fatal: Exiting because of an unresolved conflict.',
    ];
    const cases: [string, string[], number][] = [
      ['git switch main', SWITCH, 128],
      ['git switch -c x', SWITCH, 128],
      ['git checkout main', ['error: you need to resolve your current index first', 'notes.txt: needs merge'], 1],
      ['git merge main', UNMERGED, 128],
      ['git revert HEAD', [
        'error: Reverting is not possible because you have unmerged files.',
        "hint: Fix them up in the work tree, and then use 'git add/rm <file>'",
        'hint: as appropriate to mark resolution and make a commit.',
        'fatal: revert failed',
      ], 128],
      ['git stash pop', ['error: could not write index', 'notes.txt: needs merge', 'The stash entry is kept in case you need it again.'], 128],
      ['git stash apply', ['error: could not write index', 'notes.txt: needs merge'], 128],
      ['git reset --soft HEAD', ['fatal: Cannot do a soft reset in the middle of a merge.'], 128],
    ];
    for (const [cmd, out, code] of cases) {
      const g = go(before, cmd);
      expect([cmd, text(g)]).toEqual([cmd, out]);
      expect(g.exitCode).toBe(code);
      expect(g.world.repo).toEqual(before.repo);
      expect(g.world.files).toEqual(before.files);
    }
    // Once the conflicts are fixed, Git still will not switch, and TermTrek keeps checkout and merge out of the rebase too.
    const fixed = go(before, 'echo fixed > notes.txt', 'git add notes.txt').world;
    for (const cmd of ['git switch main', 'git checkout main']) {
      const g = go(fixed, cmd);
      expect([cmd, text(g)]).toEqual([cmd, SWITCH]);
      expect(g.world.repo).toEqual(fixed.repo);
    }
    const m = go(fixed, 'git merge main');
    expect(m.exitCode).toBe(128);
    expect(text(m)).toEqual([
      "error: TermTrek can't start a merge while a rebase is in progress.",
      'hint: Finish the rebase with "git rebase --continue", or cancel it with "git rebase --abort".',
    ]);
    expect(m.world.repo).toEqual(fixed.repo);
    // Allowed: restoring a path, and a soft reset once the conflicts are fixed (the rebase keeps going).
    const co = go(fixed, 'git checkout -- notes.txt');
    expect(co.exitCode).toBe(0);
    const soft = go(fixed, 'git reset --soft HEAD');
    expect(soft.exitCode).toBe(0);
    expect(soft.world.repo!.op).toEqual(fixed.repo!.op);
    const hard = go(before, 'git reset --hard');
    expect(hard.exitCode).toBe(0);
    expect(hard.world.repo!.op?.kind).toBe('rebase');
    expect(hard.world.repo!.op?.conflicts).toEqual([]);
  });

  it('continue with unstaged edits asks for git add', () => {
    const r = go(stopped().world, 'echo fixed > notes.txt', 'git add notes.txt', 'echo more >> notes.txt', 'git rebase --continue');
    expect(r.exitCode).toBe(1);
    expect(text(r)).toEqual(['You must edit all merge conflicts and then', 'mark them as resolved using git add']);
  });

  it('any command mid-rebase never throws', () => {
    const cmds = ['git status', 'git status -sb', 'git log --oneline', 'git diff', 'git add .', 'git commit', 'git commit --amend -m x', 'git commit -m x', 'git stash', 'git branch', 'git branch -d feature', 'git reflog', 'git restore notes.txt', 'git reset --hard', 'git reset', 'git rebase --continue', 'git rebase --skip', 'git rebase --abort', 'git rebase -i main', 'git rebase a b', 'git merge --abort', 'git revert --continue', 'git push', 'git fetch'];
    for (const w of [stopped().world, go(stopped().world, 'echo f > notes.txt', 'git add .').world]) {
      for (const c of cmds) {
        const r = go(w, c);
        expect([c, text(r).some((l) => l.includes('internal error'))]).toEqual([c, false]);
      }
    }
  });

  it('no rebase in progress', () => {
    for (const flag of ['--continue', '--skip', '--abort']) {
      const r = go(cleanWorld(), `git rebase ${flag}`);
      expect(text(r)).toEqual(['fatal: no rebase in progress']);
      expect(r.exitCode).toBe(128);
    }
  });
});
