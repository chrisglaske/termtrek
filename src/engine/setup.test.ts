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
