import { buildWorld } from '../setup';
import { runLine } from '../interpreter';
import { teammatePush } from '../remote/teammate';
import type { RemoteSetup, World } from '../types';

type R = ReturnType<typeof runLine>;
const text = (r: R) => r.lines.map((l) => l.map((s) => s.text).join(''));
const URL = 'https://git.example.com/team/notes.git';
const remote: RemoteSetup = {
  slug: 'team/notes',
  commits: [
    { message: 'Add notes', files: { 'notes.txt': 'one\n' } },
    { message: 'Add readme', files: { 'README.md': '# hi\n' } },
  ],
};
const ALEX = { name: 'Alex Kim', email: 'alex@example.com' };
const run = (w: World, ...lines: string[]) => lines.reduce((acc, l) => runLine(acc, l).world, w);
const base = (): World => buildWorld({ config: { 'user.name': 'Sam', 'user.email': 's@x.com' }, remote });
const fetched = (): World => {
  const w = run(base(), `git clone ${URL}`, 'cd notes');
  return run(teammatePush({ branch: 'main', message: 'alex edit', files: { 'alex.txt': 'hi\n' }, author: ALEX })(w), 'git fetch');
};

describe('git log with revisions, ranges and paths', () => {
  it('origin/main starts at the fetched commit with decorations', () => {
    const w = fetched();
    const tip = w.repo!.remoteRefs['origin/main']!;
    const t = text(runLine(w, 'git log origin/main --oneline'));
    expect(t).toHaveLength(3);
    expect(t[0]).toBe(`${tip} (origin/main, origin/HEAD) alex edit`);
    expect(t[1]).toContain('(HEAD -> main)');
  });
  it('main..origin/main lists only what pull would bring in', () => {
    const w = fetched();
    const tip = w.repo!.remoteRefs['origin/main']!;
    expect(text(runLine(w, 'git log main..origin/main --oneline'))).toEqual([`${tip} (origin/main, origin/HEAD) alex edit`]);
  });
  it('HEAD~1 starts at the parent', () => {
    const w = fetched();
    const t = text(runLine(w, 'git log --oneline HEAD~1'));
    expect(t).toHaveLength(1);
    expect(t[0]).toMatch(/^[0-9a-f]{7} Add notes$/);
  });
  it('an unknown revision exits 128 with the three lines', () => {
    const r = runLine(fetched(), 'git log --oneline nope');
    expect(r.exitCode).toBe(128);
    expect(text(r)).toEqual([
      "fatal: ambiguous argument 'nope': unknown revision or path not in the working tree.",
      "Use '--' to separate paths from revisions, like this:",
      "'git <command> [<revision>...] -- [<file>...]'",
    ]);
  });
  it('paths keep only commits that changed them', () => {
    const w = run(fetched(), 'echo more >> notes.txt', 'git commit -am "Edit notes"');
    const t = text(runLine(w, 'git log --oneline -- notes.txt'));
    expect(t.map((l) => l.slice(l.indexOf(' ') + 1))).toEqual(['(HEAD -> main) Edit notes', 'Add notes']);
    expect(text(runLine(w, 'git log --oneline notes.txt'))).toEqual(t);
    expect(text(runLine(w, 'git log --oneline -- alex.txt'))).toHaveLength(0);
  });
  it('--all includes the fetched commit', () => {
    const t = text(runLine(fetched(), 'git log --all --oneline'));
    expect(t).toHaveLength(3);
    expect(t[0]).toContain('alex edit');
  });
});

describe('git diff with revisions', () => {
  const two = (): World => run(base(), `git clone ${URL}`, 'cd notes', 'echo world >> notes.txt', 'git add notes.txt', 'echo third >> notes.txt');
  it('git diff HEAD shows staged and unstaged together', () => {
    const t = text(runLine(two(), 'git diff HEAD'));
    expect(t).toContain('+world');
    expect(t).toContain('+third');
  });
  it('commit-to-commit, branch and range forms', () => {
    const w = run(two(), 'git commit -am two');
    const expected = ['diff --git a/notes.txt b/notes.txt'];
    for (const cmd of ['git diff HEAD~1 HEAD', 'git diff HEAD~1..HEAD', 'git diff HEAD~1..']) {
      const t = text(runLine(w, cmd));
      expect(t[0]).toBe(expected[0]);
      expect(t).toContain('+world');
      expect(t).toContain('+third');
    }
    const f = run(w, 'git switch -c feature', 'echo feat >> notes.txt', 'git commit -am f');
    for (const cmd of ['git diff main', 'git diff main..feature', 'git diff main feature']) {
      const t = text(runLine(f, cmd));
      expect(t).toContain('+feat');
    }
    expect(text(runLine(f, 'git diff feature main'))).toContain('-feat');
  });
  it('unknown revision exits 128; path form still works', () => {
    const w = two();
    const r = runLine(w, 'git diff nope');
    expect(r.exitCode).toBe(128);
    expect(text(r)[0]).toBe("fatal: ambiguous argument 'nope': unknown revision or path not in the working tree.");
    expect(text(runLine(w, 'git diff notes.txt'))).toContain('+third');
    expect(text(runLine(w, 'git diff nope.txt')).length).toBe(3);
  });
  it('--staged with a revision compares the index with it', () => {
    const w = run(two(), 'git commit -am two', 'echo more >> notes.txt', 'git add notes.txt');
    const t = text(runLine(w, 'git diff --staged HEAD~1'));
    expect(t).toContain('+world');
    expect(t).toContain('+third');
    expect(t).toContain('+more');
    expect(text(runLine(w, 'git diff --staged'))).not.toContain('+world');
  });
});
