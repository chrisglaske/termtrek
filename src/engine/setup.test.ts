import { buildWorld } from './setup';
import { createWorld } from './world';

describe('buildWorld', () => {
  it('runs scripted lines', () => {
    const w = buildWorld({ config: { 'user.name': 'Sam', 'user.email': 's@x.com' }, repo: { at: 'p', commits: [] }, cwd: 'p', run: ['echo hi > a.txt', 'git add a.txt', 'git commit -m "Add a"'] });
    expect(Object.values(w.repo!.commits).map((c) => c.message)).toEqual(['Add a']);
  });
  it('throws on a failing line', () => {
    expect(() => buildWorld({ run: ['git nope'] })).toThrow('setup line failed: git nope');
  });
  it('plain setup equals createWorld with stash and op', () => {
    const s = { repo: { at: 'p', commits: [{ message: 'm', files: { a: '1' } }] } };
    expect(buildWorld(s)).toEqual(createWorld(s));
    expect(buildWorld(s).repo).toMatchObject({ stash: [], op: null });
  });
});

describe('buildWorld run functions', () => {
  it('setup run accepts functions in order', () => {
    const w = buildWorld({
      config: { 'user.name': 'Sam', 'user.email': 's@x.com' },
      cwd: 'p',
      repo: { at: 'p', commits: [] },
      run: ['echo a > a.txt', (x) => ({ ...x, files: { ...x.files, '/home/you/p/b.txt': 'b' } }), 'ls > out.txt'],
    });
    expect(w.files['/home/you/p/out.txt']).toContain('b.txt');
  });
  it('creates world.remote before run', () => {
    const w = buildWorld({ remote: { slug: 'team/notes' }, run: [(x) => ({ ...x, config: { ...x.config, saw: String(!!x.remote) } })] });
    expect(w.config['saw']).toBe('true');
  });
  it('fresh repos have empty remote state', () => {
    const w = buildWorld({ repo: { at: 'p', commits: [] } });
    expect(w.repo).toMatchObject({ remotes: {}, remoteRefs: {}, upstream: {}, originHead: null });
  });
});
