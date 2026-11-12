import { createWorld } from './world';
import { buildWorld } from './setup';
import { runLine } from './interpreter';
import { complete, didYouMean } from './suggest';

describe('didYouMean', () => {
  it('suggests git for bare subcommands', () => {
    expect(didYouMean('status')).toBe('git status');
  });
  it('corrects git subcommand typos', () => {
    expect(didYouMean('git stats')).toBe('git status');
    expect(didYouMean('git comit -m "x"')).toBe('git commit -m "x"');
  });
  it('corrects shell typos', () => {
    expect(didYouMean('cta notes.txt')).toBe('cat notes.txt');
  });
  it('returns null for unrelated or valid input', () => {
    expect(didYouMean('blorp')).toBeNull();
    expect(didYouMean('git status')).toBeNull();
    expect(didYouMean('ls')).toBeNull();
    expect(didYouMean('')).toBeNull();
  });
  it('attaches a warn explain to not-found results without changing output', () => {
    const w = createWorld();
    const r = runLine(w, 'status');
    expect(r.exitCode).toBe(127);
    expect(r.lines[0]![0]!.text).toBe('bash: status: command not found');
    expect(r.explain?.kind).toBe('warn');
    expect(r.explain?.text).toContain('`git status`');
    expect(r.explain?.text).toContain('Git commands always start with **git**');
    const g = runLine(w, 'git stats');
    expect(g.lines[0]![0]!.text).toBe("git: 'stats' is not a git command. See 'git --help'.");
    expect(g.explain?.text).toContain('`git status`');
    expect(g.explain?.text).toContain('Click it to run it.');
    expect(runLine(w, 'blorp').explain).toBeUndefined();
  });
});

describe('complete', () => {
  const w = createWorld({ files: { 'notes.txt': 'x', 'node_modules/a.js': '', 'docs/readme.md': '' } });
  it('completes command names and git subcommands', () => {
    expect(complete(w, 'git stat')).toEqual({ line: 'git status', options: [] });
    expect(complete(w, 'pw').line).toBe('pwd');
  });
  it('completes paths, dirs with trailing slash', () => {
    expect(complete(w, 'cat no')).toEqual({ line: 'cat no', options: ['node_modules/', 'notes.txt'] });
    expect(complete(w, 'git add not').line).toBe('git add notes.txt');
    expect(complete(w, 'cd do').line).toBe('cd docs/');
    expect(complete(w, 'cat docs/re').line).toBe('cat docs/readme.md');
  });
  it('extends by common prefix when several match', () => {
    expect(complete(w, 'cat nod').line).toBe('cat node_modules/');
    const r = complete(createWorld({ files: { 'abc1': '', 'abc2': '' } }), 'cat a');
    expect(r).toEqual({ line: 'cat abc', options: ['abc1', 'abc2'] });
  });
  it('returns the line unchanged when nothing matches', () => {
    expect(complete(w, 'cat zzz')).toEqual({ line: 'cat zzz', options: [] });
  });
});

describe('complete branch names', () => {
  const repoWorld = () =>
    runLine(
      buildWorld({ cwd: 'p', config: { 'user.name': 'Sam', 'user.email': 's@x.com' }, repo: { at: 'p' }, files: { 'p/feat.txt': 'x' }, run: ['git add .', 'git commit -m c1'] }),
      'git branch feature',
    ).world;
  it('completes branch names after switch, checkout, merge and branch -d', () => {
    const w = repoWorld();
    expect(complete(w, 'git switch fe').line).toBe('git switch feature');
    expect(complete(w, 'git merge fe').line).toBe('git merge feature');
    expect(complete(w, 'git branch -d fe').line).toBe('git branch -d feature');
    expect(complete(w, 'git checkout fe').options).toEqual(['feature', 'feat.txt']);
  });
});
