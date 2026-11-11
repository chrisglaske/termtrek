import { createWorld } from '../world';
import { runLine } from '../interpreter';
import { lineDiff } from '../diffLines';

type R = ReturnType<typeof runLine>;
const text = (r: R) => r.lines.map((l) => l.map((s) => s.text).join(''));
const ident = { 'user.name': 'Sam', 'user.email': 'sam@example.com' };
const fresh = (config: Record<string, string> = ident) =>
  createWorld({ cwd: 'project', config, repo: { at: 'project' }, files: { 'project/notes.txt': 'a\n' } });
const run = (w: ReturnType<typeof createWorld>, ...cmds: string[]) => {
  let r = runLine(w, 'true');
  let world = w;
  for (const c of cmds) {
    r = runLine(world, c);
    world = r.world;
  }
  return { r, world };
};
const id7 = /[0-9a-f]{7}/;

describe('lineDiff', () => {
  it('diffs lines', () => {
    const d = lineDiff('a\nb\n', 'a\nc\n').map((x) => x.op + x.text);
    expect(d).toEqual([' a', '-b', '+c']);
  });
});

describe('git commit', () => {
  it('first commit full output', () => {
    const { r, world } = run(fresh(), 'git add notes.txt', 'git commit -m "Add notes"');
    const id = world.repo!.branches.main!;
    expect(text(r)).toEqual([`[main (root-commit) ${id}] Add notes`, ' 1 file changed, 1 insertion(+)', ' create mode 100644 notes.txt']);
    expect(id).toMatch(id7);
    expect(r.exitCode).toBe(0);
    expect(world.repo!.reflog).toHaveLength(1);
    expect(world.repo!.reflog[0]!.message).toBe('commit (initial): Add notes');
    expect(world.repo!.commits[id]!.tree).toEqual({ 'notes.txt': 'a\n' });
    expect(world.repo!.index).toEqual({ 'notes.txt': 'a\n' });
    expect(r.explain?.kind).toBe('ok');
    expect(r.explain?.text).toContain(`**${id}**`);
  });
  it('second commit, -a, pluralization, deletions', () => {
    let { world } = run(fresh(), 'git add .', 'git commit -m one');
    world = run(world, 'echo b >> notes.txt', 'echo c >> notes.txt', 'echo u > untracked.txt').world;
    const { r, world: w2 } = run(world, 'git commit -am "Update notes"');
    const id = w2.repo!.branches.main!;
    expect(text(r)).toEqual([`[main ${id}] Update notes`, ' 1 file changed, 2 insertions(+)']);
    expect(w2.repo!.index['untracked.txt']).toBeUndefined();
    expect(w2.repo!.reflog[0]!.message).toBe('commit: Update notes');
    const { r: r3 } = run(w2, 'rm notes.txt', 'git add notes.txt', 'git commit -m gone');
    expect(text(r3).slice(1)).toEqual([' 1 file changed, 3 deletions(-)', ' delete mode 100644 notes.txt']);
    const { r: r4 } = run(w2, 'echo a > notes.txt', 'git commit -am same');
    expect(r4.exitCode).toBe(0);
  });
  it('joins repeated -m as paragraphs', () => {
    const { world } = run(fresh(), 'git add .', 'git commit -m Title -m Body');
    expect(world.repo!.commits[world.repo!.branches.main!]!.message).toBe('Title\n\nBody');
  });
  it('nothing to commit, clean', () => {
    const { world } = run(fresh(), 'git add .', 'git commit -m one');
    const { r } = run(world, 'git commit -m two');
    expect(text(r)).toEqual(['On branch main', 'nothing to commit, working tree clean']);
    expect(r.exitCode).toBe(1);
  });
  it('nothing staged with modifications', () => {
    const { world } = run(fresh(), 'git add .', 'git commit -m one', 'echo x >> notes.txt');
    const { r } = run(world, 'git commit -m two');
    expect(text(r)).toEqual([
      'On branch main',
      'Changes not staged for commit:',
      '  (use "git add <file>..." to update what will be committed)',
      '  (use "git restore <file>..." to discard changes in working directory)',
      '\tmodified:   notes.txt',
      '',
      'no changes added to commit (use "git add" and/or "git commit -a")',
    ]);
    expect(r.exitCode).toBe(1);
  });
  it('allow-empty', () => {
    const { world } = run(fresh(), 'git add .', 'git commit -m one');
    const { r } = run(world, 'git commit --allow-empty -m empty');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toHaveLength(1);
  });
  it('missing -m', () => {
    const { r } = run(fresh(), 'git add .', 'git commit');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual(['hint: Waiting for your editor to close the file...']);
    expect(r.world.pending?.file).toBe('.git/COMMIT_EDITMSG');
    expect(r.explain?.kind).toBe('tip');
  });
  it('identity missing', () => {
    const { r, world } = run(fresh({}), 'git add .', 'git commit -m one');
    expect(text(r)).toEqual([
      'Author identity unknown',
      '',
      '*** Please tell me who you are.',
      '',
      'Run',
      '',
      '  git config --global user.email "you@example.com"',
      '  git config --global user.name "Your Name"',
      '',
      "to set your account's default identity.",
      'Omit --global to set the identity only in this repository.',
      '',
      'fatal: no email was given and auto-detection is disabled',
    ]);
    expect(r.exitCode).toBe(128);
    expect(r.explain?.text).toContain('git config --global user.name');
    expect(world.repo!.branches.main).toBeNull();
    const { r: r2 } = run(fresh({ 'user.email': 'a@b.c' }), 'git add .', 'git commit -m one');
    expect(text(r2).slice(-1)).toEqual(['fatal: no name was given and auto-detection is disabled']);
  });
});

describe('git log', () => {
  const two = () => run(fresh(), 'git add .', 'git commit -m "Add notes"', 'echo b >> notes.txt', 'git commit -am "Update notes" -m "More detail"').world;
  it('long format with two commits', () => {
    const w = two();
    const [c2, c1] = w.repo!.reflog.map((e) => e.id);
    const r = runLine(w, 'git log');
    expect(text(r)).toEqual([
      `commit ${c2} (HEAD -> main)`,
      'Author: Sam <sam@example.com>',
      'Date:   Mon Nov 9 09:02:00 2026 +0000',
      '',
      '    Update notes',
      '    ',
      '    More detail',
      '',
      `commit ${c1}`,
      'Author: Sam <sam@example.com>',
      'Date:   Mon Nov 9 09:01:00 2026 +0000',
      '',
      '    Add notes',
    ]);
    expect(r.lines[0]![1]!.tone).toBe('id');
  });
  it('oneline and limits', () => {
    const w = two();
    const [c2, c1] = w.repo!.reflog.map((e) => e.id);
    expect(text(runLine(w, 'git log --oneline'))).toEqual([`${c2} (HEAD -> main) Update notes`, `${c1} Add notes`]);
    expect(text(runLine(w, 'git log --oneline -1'))).toEqual([`${c2} (HEAD -> main) Update notes`]);
    expect(text(runLine(w, 'git log --oneline -n 1'))).toEqual([`${c2} (HEAD -> main) Update notes`]);
  });
  it('unborn repo', () => {
    const r = runLine(fresh(), 'git log');
    expect(text(r)).toEqual(["fatal: your current branch 'main' does not have any commits yet"]);
    expect(r.exitCode).toBe(128);
  });
});

describe('git diff', () => {
  it('unstaged modification', () => {
    const { world } = run(fresh(), 'git add .', 'git commit -m one', 'echo b >> notes.txt', 'echo c >> notes.txt');
    const r = runLine(world, 'git diff');
    expect(text(r)).toEqual([
      'diff --git a/notes.txt b/notes.txt',
      expect.stringMatching(/^index [0-9a-f]{7}\.\.[0-9a-f]{7} 100644$/),
      '--- a/notes.txt',
      '+++ b/notes.txt',
      '@@ -1 +1,3 @@',
      ' a',
      '+b',
      '+c',
    ]);
    expect(r.lines[6]![0]!.tone).toBe('ok');
    expect(text(runLine(world, 'git diff --staged'))).toEqual([]);
  });
  it('staged new file', () => {
    const { world } = run(fresh(), 'echo b >> notes.txt', 'echo c >> notes.txt', 'git add .');
    expect(text(runLine(world, 'git diff'))).toEqual([]);
    for (const flag of ['--staged', '--cached']) {
      expect(text(runLine(world, `git diff ${flag}`))).toEqual([
        'diff --git a/notes.txt b/notes.txt',
        'new file mode 100644',
        expect.stringMatching(/^index 0000000\.\.[0-9a-f]{7}$/),
        '--- /dev/null',
        '+++ b/notes.txt',
        '@@ -0,0 +1,3 @@',
        '+a',
        '+b',
        '+c',
      ]);
    }
  });
  it('deleted file and context limit', () => {
    const body = Array.from({ length: 10 }, (_, i) => `l${i}`).join('\n') + '\n';
    let { world } = run(createWorld({ cwd: 'p', config: ident, repo: { at: 'p' }, files: { 'p/f': body } }), 'git add .', 'git commit -m x');
    const w2 = run(world, 'echo X >> f').world;
    const t = text(runLine(w2, 'git diff'));
    expect(t.slice(4)).toEqual(['@@ -8,3 +8,4 @@', ' l7', ' l8', ' l9', '+X']);
    world = run(world, 'rm f').world;
    const d = text(runLine(world, 'git diff'));
    expect(d[1]).toBe('deleted file mode 100644');
    expect(d[4]).toBe('+++ /dev/null');
    expect(d[5]).toBe('@@ -1,10 +0,0 @@');
  });
});

describe('git commit empty message', () => {
  it.each(['git commit -m ""', 'git commit -m "   "', 'git commit -am ""'])('refuses %s', (cmd) => {
    const w = run(fresh(), 'git add notes.txt').world;
    const r = runLine(w, cmd);
    expect(text(r)).toEqual(['Aborting commit due to empty commit message.']);
    expect(r.lines[0]![0]!.tone).toBe('error');
    expect(r.exitCode).toBe(1);
    expect(r.world.repo!.commits).toEqual({});
  });
});

describe('git add . explain', () => {
  it('says everything in this folder was staged', () => {
    for (const cmd of ['git add .', 'git add -A', 'git add --all']) {
      const r = runLine(fresh(), cmd);
      expect(r.explain?.text).toContain('Staged **everything in this folder**.');
    }
    expect(runLine(fresh(), 'git add notes.txt').explain?.text).toContain('Staged **notes.txt**.');
  });
});
