import { createWorld } from '../world';
import { runLine } from '../interpreter';

const text = (r: ReturnType<typeof runLine>) => r.lines.map((l) => l.map((s) => s.text).join(''));

describe('git init', () => {
  it('creates an unborn repo', () => {
    const r = runLine(createWorld({ dirs: ['project'], cwd: 'project' }), 'git init');
    expect(text(r)).toEqual(['Initialized empty Git repository in /home/you/project/.git/']);
    expect(r.world.repo!.head).toEqual({ kind: 'branch', name: 'main' });
    expect(r.world.repo!.branches['main']).toBeNull();
    expect(r.explain?.kind).toBe('tip');
  });
  it('reinit keeps commits', () => {
    const w = createWorld({ cwd: 'project', repo: { at: 'project', commits: [{ message: 'm', files: { a: '1' } }] } });
    const r = runLine(w, 'git init');
    expect(text(r)).toEqual(['Reinitialized existing Git repository in /home/you/project/.git/']);
    expect(r.world.repo!.commits).toEqual(w.repo!.commits);
  });
  it('supports a directory argument and -b', () => {
    const r = runLine(createWorld(), 'git init -b trunk app');
    expect(r.world.repo!.root).toBe('/home/you/app');
    expect(r.world.repo!.head).toEqual({ kind: 'branch', name: 'trunk' });
    expect(r.world.dirs).toContain('/home/you/app');
  });
});

describe('git config', () => {
  it('sets, gets and lists', () => {
    let r = runLine(createWorld(), 'git config --global user.name "Sam Lee"');
    expect(r.world.config['user.name']).toBe('Sam Lee');
    expect(r.explain).toEqual({ kind: 'ok', text: 'Saved. Git will sign your commits as **Sam Lee**.' });
    r = runLine(r.world, 'git config user.name');
    expect(text(r)).toEqual(['Sam Lee']);
    r = runLine(r.world, 'git config --list');
    expect(text(r)).toEqual(['user.name=Sam Lee']);
    expect(runLine(r.world, 'git config user.email').exitCode).toBe(1);
  });
});

describe('git dispatcher', () => {
  it('handles version, unknown and no repo', () => {
    expect(text(runLine(createWorld(), 'git --version'))).toEqual(['git version 2.47.0']);
    const u = runLine(createWorld(), 'git frobnicate');
    expect(text(u)).toEqual(["git: 'frobnicate' is not a git command. See 'git --help'."]);
    expect(u.exitCode).toBe(1);
    const s = runLine(createWorld(), 'git status');
    expect(text(s)).toEqual(['fatal: not a git repository (or any of the parent directories): .git']);
    expect(s.exitCode).toBe(128);
    expect(runLine(createWorld(), 'git').exitCode).toBe(1);
  });
  it('is not a repo once you cd out of it', () => {
    const w = createWorld({ repo: { at: 'p' }, cwd: '' });
    expect(runLine(w, 'git status').exitCode).toBe(128);
  });
});

describe('config scopes (A7)', () => {
  it('a local --unset leaves the global name and exits 5', () => {
    const w = createWorld({ cwd: 'project', repo: { at: 'project' } });
    const g = runLine(w, 'git config --global user.name "Sam"').world;
    const r = runLine(g, 'git config --unset user.name');
    expect(r.exitCode).toBe(5);
    expect(text(runLine(r.world, 'git config user.name'))).toEqual(['Sam']);
  });
  it('local values win and --global unsets the global one', () => {
    const w = createWorld({ cwd: 'project', repo: { at: 'project' } });
    let x = runLine(w, 'git config --global user.name "Sam"').world;
    x = runLine(x, 'git config user.name "Lee"').world;
    expect(text(runLine(x, 'git config user.name'))).toEqual(['Lee']);
    expect(text(runLine(x, 'git config --global user.name'))).toEqual(['Sam']);
    expect(runLine(x, 'git config --local --unset user.name').exitCode).toBe(0);
    expect(runLine(runLine(x, 'git config --global --unset user.name').world, 'git config user.name').exitCode).toBe(0);
  });
  it('a plain write outside a repo is fatal', () => {
    const r = runLine(createWorld(), 'git config user.name Sam');
    expect([text(r), r.exitCode]).toEqual([['fatal: not in a git directory'], 128]);
  });
});

describe('git init in a subfolder (A9)', () => {
  it('refuses with the one-repository message and no Reinitialized line', () => {
    const w = createWorld({ cwd: 'project', repo: { at: 'project' }, dirs: ['project/inner'] });
    const r = runLine(w, 'git init inner');
    expect([text(r), r.exitCode]).toEqual([['fatal: TermTrek supports one Git repository at a time.'], 128]);
    expect(text(runLine(runLine(w, 'cd inner').world, 'git init'))).toEqual(['fatal: TermTrek supports one Git repository at a time.']);
  });
});
