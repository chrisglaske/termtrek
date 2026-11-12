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
