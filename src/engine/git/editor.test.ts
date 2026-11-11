import { createWorld } from '../world';
import { runLine } from '../interpreter';
import { buildWorld } from '../setup';
import { finishEditor } from './editor';
import { makeCommit } from './commit';
import type { RunResult, World } from '../types';

const text = (r: RunResult) => r.lines.map((l) => l.map((s) => s.text).join(''));
const ident = { 'user.name': 'Sam', 'user.email': 'sam@example.com' };
const base = (): World =>
  buildWorld({
    cwd: 'project',
    config: ident,
    repo: { at: 'project' },
    files: { 'project/notes.txt': 'a\n' },
    run: ['git add notes.txt', 'git commit -m "Add notes"'],
  });
const run = (w: World, ...cmds: string[]) => {
  let r = runLine(w, 'true');
  let world = w;
  for (const c of cmds) {
    r = runLine(world, c);
    world = r.world;
  }
  return { r, world };
};
const staged = (): World => run(base(), 'echo b >> notes.txt', 'git add notes.txt').world;
const commitCount = (w: World) => Object.keys(w.repo!.commits).length;

describe('commit editor', () => {
  it('commit without -m opens the editor', () => {
    const { r, world } = run(staged(), 'git commit');
    expect(r.exitCode).toBe(0);
    expect(world.pending?.text).toContain('# On branch main');
    expect(world.pending?.text).toContain('#\tmodified:   notes.txt');
    expect(world.pending?.text.startsWith('\n# Please enter')).toBe(true);
    expect(commitCount(world)).toBe(1);
  });
  it('still refuses with nothing to commit', () => {
    const { r, world } = run(base(), 'git commit');
    expect(r.exitCode).toBe(1);
    expect(world.pending).toBeUndefined();
    expect(text(r)[0]).toBe('On branch main');
  });
  it('finishEditor commits the message without comment lines', () => {
    const { world } = run(staged(), 'git commit');
    const r = finishEditor(world, 'Add more  \n\n# a comment\n#\n');
    expect(r.exitCode).toBe(0);
    expect(r.world.pending).toBeUndefined();
    expect(text(r)[0]).toMatch(/^\[main [0-9a-f]{7}\] Add more$/);
    expect(r.world.repo!.reflog[0]!.message).toBe('commit: Add more');
  });
  it('finishEditor aborts', () => {
    const { world } = run(staged(), 'git commit');
    for (const t of [null, '', '# only\n#']) {
      const r = finishEditor(world, t);
      expect(text(r)).toEqual(['Aborting commit due to empty commit message.']);
      expect(r.exitCode).toBe(1);
      expect(r.world.pending).toBeUndefined();
      expect(commitCount(r.world)).toBe(1);
    }
  });
  it('runLine while pending', () => {
    const { world } = run(staged(), 'git commit');
    const r = runLine(world, 'git status');
    expect(text(r)).toEqual(['hint: Waiting for your editor to close the file...']);
    expect(r.exitCode).toBe(1);
    expect(r.world).toBe(world);
  });
});

describe('git commit --amend', () => {
  it('amend -m replaces HEAD', () => {
    const w = base();
    const { r, world } = run(w, 'git commit --amend -m "Better"');
    expect(r.exitCode).toBe(0);
    const head = world.repo!.branches.main!;
    expect(head).not.toBe(w.repo!.branches.main);
    expect(world.repo!.commits[head]!.parents).toHaveLength(0);
    expect(world.repo!.commits[head]!.message).toBe('Better');
    expect(world.repo!.reflog[0]!.message).toBe('commit (amend): Better');
    expect(text(r).some((l) => l.startsWith(' Date: '))).toBe(true);
    expect(text(r)[0]).toBe(`[main (root-commit) ${head}] Better`);
  });
  it('amend keeps the parent count and history size of the branch', () => {
    const w = run(base(), 'echo b >> notes.txt', 'git commit -am "Second"').world;
    const { world } = run(w, 'git commit --amend -m "Second, fixed"');
    const head = world.repo!.commits[world.repo!.branches.main!]!;
    expect(head.parents).toHaveLength(1);
    expect(head.parents[0]).toBe(w.repo!.commits[w.repo!.branches.main!]!.parents[0]);
    const { r } = run(world, 'git log --oneline');
    expect(text(r)).toHaveLength(2);
  });
  it('amend --no-edit adds a newly staged file', () => {
    const w = run(base(), 'echo x > extra.txt', 'git add extra.txt').world;
    const { r, world } = run(w, 'git commit --amend --no-edit');
    const head = world.repo!.commits[world.repo!.branches.main!]!;
    expect(head.message).toBe('Add notes');
    expect(Object.keys(head.tree).sort()).toEqual(['extra.txt', 'notes.txt']);
    expect(text(r)).toContain(' 2 files changed, 2 insertions(+)');
  });
  it('amend without -m prefills the old message', () => {
    const { r, world } = run(base(), 'git commit --amend');
    expect(r.exitCode).toBe(0);
    expect(world.pending?.text.startsWith('Add notes\n# Please enter')).toBe(true);
    expect(world.pending?.action.amend).toBe(true);
    const done = finishEditor(world, 'Add my notes\n');
    expect(done.world.repo!.commits[done.world.repo!.branches.main!]!.message).toBe('Add my notes');
  });
  it('amend with no commits', () => {
    const w = createWorld({ cwd: 'project', config: ident, repo: { at: 'project' } });
    const { r } = run(w, 'git commit --amend -m x');
    expect(text(r)).toEqual(['fatal: You have nothing to amend.']);
    expect(r.exitCode).toBe(128);
  });
});

describe('makeCommit with an operation', () => {
  it('refuses while conflicts remain', () => {
    const w = base();
    const op = { kind: 'merge' as const, theirs: w.repo!.branches.main!, theirsLabel: 'side', message: "Merge branch 'side'", conflicts: ['notes.txt'] };
    const world: World = { ...w, repo: { ...w.repo!, op } };
    const r = makeCommit(world, 'x', { amend: false, all: false });
    expect(text(r)).toEqual([
      'error: Committing is not possible because you have unmerged files.',
      "hint: Fix them up in the work tree, and then use 'git add/rm <file>'",
      'hint: as appropriate to mark resolution and make a commit.',
      'fatal: Exiting because of an unresolved conflict.',
      'U\tnotes.txt',
    ]);
    expect(r.exitCode).toBe(128);
    expect(r.world).toBe(world);
  });
  it('concludes a merge with two parents and clears the op', () => {
    const w = run(base(), 'echo x > side.txt', 'git add side.txt', 'git commit -m "Side"').world;
    const mainId = w.repo!.branches.main!;
    const first = w.repo!.commits[mainId]!.parents[0]!;
    const op = { kind: 'merge' as const, theirs: first, theirsLabel: 'side', message: "Merge branch 'side'", conflicts: [] };
    const world: World = { ...w, repo: { ...w.repo!, op } };
    const r = makeCommit(world, op.message, { amend: false, all: false });
    expect(r.exitCode).toBe(0);
    const head = r.world.repo!.commits[r.world.repo!.branches.main!]!;
    expect(head.parents).toEqual([mainId, first]);
    expect(r.world.repo!.op).toBeNull();
    expect(r.world.repo!.reflog[0]!.message).toBe("commit (merge): Merge branch 'side'");
  });
  it('--no-edit uses the op message, and an empty editor keeps the op', () => {
    const w = base();
    const op = { kind: 'merge' as const, theirs: w.repo!.branches.main!, theirsLabel: 'side', message: "Merge branch 'side'", conflicts: [] };
    const world: World = { ...w, repo: { ...w.repo!, op } };
    const r = runLine(world, 'git commit --no-edit');
    expect(r.exitCode).toBe(0);
    const open = runLine(world, 'git commit');
    expect(open.world.pending?.text.startsWith("Merge branch 'side'\n#")).toBe(true);
    const aborted = finishEditor(open.world, '');
    expect(text(aborted)).toEqual(["Not committing merge; use 'git commit' to complete the merge."]);
    expect(aborted.world.repo!.op).not.toBeNull();
  });
  it('--amend during a merge or revert is refused before the editor opens', () => {
    const w = base();
    for (const kind of ['merge', 'revert'] as const) {
      const op = { kind, theirs: w.repo!.branches.main!, theirsLabel: 'side', message: 'x', conflicts: [] };
      const r = runLine({ ...w, repo: { ...w.repo!, op } }, 'git commit --amend');
      expect(text(r)).toEqual([`fatal: You are in the middle of a ${kind} -- cannot amend.`]);
      expect(r.exitCode).toBe(128);
      expect(r.world.pending).toBeUndefined();
    }
  });
  it('a revert conclusion has one parent and logs revert', () => {
    const w = base();
    const op = { kind: 'revert' as const, theirs: w.repo!.branches.main!, theirsLabel: 'abc', message: 'Revert "x"', conflicts: [] };
    const world: World = { ...w, repo: { ...w.repo!, op } };
    const r = makeCommit(world, 'Revert "x"', { amend: false, all: false });
    const head = r.world.repo!.commits[r.world.repo!.branches.main!]!;
    expect(head.parents).toHaveLength(1);
    expect(r.world.repo!.reflog[0]!.message).toBe('revert: Revert "x"');
  });
});
