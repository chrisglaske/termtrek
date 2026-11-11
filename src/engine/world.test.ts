import { createWorld } from './world';
import { shortId } from './hash';
import { resolvePath, displayPath } from './paths';

describe('createWorld', () => {
  it('defaults to home cwd with no repo', () => {
    const w = createWorld();
    expect(w.home).toBe('/home/you');
    expect(w.cwd).toBe('/home/you');
    expect(w.repo).toBeNull();
    expect(w.dirs).toContain('/home/you');
  });

  it('builds a repo from setup', () => {
    const w = createWorld({
      repo: { at: 'project', commits: [{ message: 'Start project', files: { 'README.md': '# Hi\n' } }] },
    });
    const repo = w.repo!;
    expect(repo.root).toBe('/home/you/project');
    const ids = Object.keys(repo.commits);
    expect(ids).toHaveLength(1);
    expect(repo.branches['main']).toBe(ids[0]);
    expect(repo.head).toEqual({ kind: 'branch', name: 'main' });
    expect(repo.index).toEqual(repo.commits[ids[0]!]!.tree);
    expect(w.files['/home/you/project/README.md']).toBe('# Hi\n');
    expect(w.dirs).toContain('/home/you/project');
    expect(w.dirs).not.toContain('/home/you/project/.git');
    expect(w.dirs).not.toContain('/');
    expect(w.dirs).not.toContain('/home');
  });

  it('is deterministic and JSON-serializable', () => {
    const s = { repo: { at: 'p', commits: [{ message: 'm', files: { 'a': '1' } }] } };
    const a = createWorld(s);
    expect(createWorld(s)).toEqual(a);
    expect(structuredClone(a)).toEqual(a);
  });

  it('handles staged files, cwd, nested dirs and config', () => {
    const w = createWorld({
      cwd: 'p/src',
      files: { 'p/src/a.txt': 'x' },
      dirs: ['empty'],
      config: { 'user.name': 'Sam' },
      repo: { at: 'p', commits: [{ message: 'one', files: { 'a': '1' } }], staged: { 'b': '2' } },
    });
    expect(w.cwd).toBe('/home/you/p/src');
    expect(w.dirs).toEqual([...w.dirs].sort());
    expect(w.dirs).toContain('/home/you/empty');
    expect(w.dirs).toContain('/home/you/p/src');
    expect(w.repo!.index['b']).toBe('2');
    expect(w.files['/home/you/p/b']).toBe('2');
    const c = Object.values(w.repo!.commits)[0]!;
    expect(c.author.name).toBe('Sam');
    expect(w.repo!.reflog[0]!.message).toBe('commit (initial): one');
  });

  it('lets setup files overwrite committed content, as an unstaged edit', () => {
    const w = createWorld({
      files: { 'p/a': '1\n2\n' },
      repo: { at: 'p', commits: [{ message: 'one', files: { 'a': '1\n' } }] },
    });
    expect(w.files['/home/you/p/a']).toBe('1\n2\n');
    expect(w.repo!.index['a']).toBe('1\n');
  });
});

describe('shortId', () => {
  it('is 7 hex chars and deterministic', () => {
    expect(shortId('a')).toBe(shortId('a'));
    expect(shortId('a')).toMatch(/^[0-9a-f]{7}$/);
    expect(shortId('a')).not.toBe(shortId('b'));
  });
});

describe('paths', () => {
  it('resolves ~ and ..', () => {
    expect(resolvePath(createWorld(), '~/a/../b')).toBe('/home/you/b');
  });
  it('resolves relative to cwd', () => {
    const w = createWorld({ cwd: 'project' });
    expect(resolvePath(w, './x')).toBe('/home/you/project/x');
    expect(resolvePath(w, '/')).toBe('/');
    expect(resolvePath(w, '../../..')).toBe('/');
  });
  it('displays with ~', () => {
    const w = createWorld();
    expect(displayPath(w, '/home/you/x')).toBe('~/x');
    expect(displayPath(w, '/home/you')).toBe('~');
    expect(displayPath(w, '/etc')).toBe('/etc');
  });
});
