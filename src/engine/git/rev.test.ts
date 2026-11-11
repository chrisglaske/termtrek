import { buildWorld } from '../setup';
import { resolveRev, badRevision, noUpstream } from './rev';
import { aheadBehind } from './refs';
import type { Repo } from '../types';

const config = { 'user.name': 'Sam', 'user.email': 's@x.com' };
function fixture(): { repo: Repo; ids: string[] } {
  const w = buildWorld({
    config,
    repo: { at: 'p', commits: [
      { message: 'one', files: { a: '1' } },
      { message: 'two', files: { a: '2' } },
      { message: 'three', files: { a: '3' } },
    ] },
    run: [],
  });
  const repo = w.repo!;
  return { repo, ids: Object.values(repo.commits).sort((x, y) => x.time - y.time).map((c) => c.id) };
}

describe('noUpstream', () => {
  it('words the refusal like Git', () => {
    const { repo } = fixture();
    expect(noUpstream(repo, 'HEAD@{u}')).toBe("fatal: no upstream configured for branch 'main'");
    expect(noUpstream(repo, '@{upstream}')).toBe("fatal: no upstream configured for branch 'main'");
    expect(noUpstream(repo, 'HEAD~1')).toBeNull();
  });
});

describe('resolveRev', () => {
  it('handles HEAD, suffixes and branches', () => {
    const { repo, ids } = fixture();
    expect(resolveRev(repo, 'HEAD~2')).toBe(ids[0]);
    expect(resolveRev(repo, 'HEAD^')).toBe(ids[1]);
    expect(resolveRev(repo, 'main~0')).toBe(ids[2]);
    expect(resolveRev(repo, '@')).toBe(ids[2]);
    expect(resolveRev(repo, 'HEAD~10')).toBeNull();
    expect(resolveRev(repo, 'nope')).toBeNull();
  });
  it('resolves unique id prefixes and rejects ambiguous ones', () => {
    const { repo, ids } = fixture();
    expect(resolveRev(repo, ids[1]!.slice(0, 4))).toBe(ids[1]);
    const a = { ...repo.commits[ids[0]!]!, id: 'abcd1111' };
    const b = { ...repo.commits[ids[1]!]!, id: 'abcd2222' };
    const dup = { ...repo, commits: { ...repo.commits, [a.id]: a, [b.id]: b } };
    expect(resolveRev(dup, 'abcd')).toBeNull();
    expect(resolveRev(dup, 'abcd1')).toBe('abcd1111');
  });
  it('resolves reflog entries', () => {
    const { repo } = fixture();
    expect(resolveRev(repo, 'HEAD@{1}')).toBe(repo.reflog[1]!.id);
    expect(resolveRev(repo, '@{0}')).toBe(repo.reflog[0]!.id);
    expect(resolveRev(repo, 'HEAD@{9}')).toBeNull();
  });
  it('follows the second parent of a merge', () => {
    const { repo, ids } = fixture();
    const merge = { ...repo.commits[ids[2]!]!, id: 'ffff0000', parents: [ids[2]!, ids[0]!], time: 9 };
    const r = { ...repo, commits: { ...repo.commits, ffff0000: merge }, branches: { main: 'ffff0000' } };
    expect(resolveRev(r, 'HEAD^2')).toBe(ids[0]);
    expect(resolveRev(r, 'HEAD^1')).toBe(ids[2]);
    expect(resolveRev(r, 'HEAD^3')).toBeNull();
  });
});

describe('badRevision', () => {
  it('prints Git three lines', () => {
    const lines = badRevision('HEAD~10');
    expect(lines).toHaveLength(3);
    expect(lines[0]![0]!.text).toBe("fatal: ambiguous argument 'HEAD~10': unknown revision or path not in the working tree.");
    expect(lines[0]![0]!.tone).toBe('error');
  });
});

describe('resolveRev with remotes', () => {
  function withRemote() {
    const { repo, ids } = fixture();
    return {
      ids,
      repo: {
        ...repo,
        remoteRefs: { 'origin/main': ids[1]!, 'origin/dev': ids[0]! },
        upstream: { main: { remote: 'origin', branch: 'main' } },
        originHead: 'main',
      } as Repo,
    };
  }
  it('origin/main and remotes/origin/main', () => {
    const { repo, ids } = withRemote();
    expect(resolveRev(repo, 'origin/main')).toBe(ids[1]);
    expect(resolveRev(repo, 'remotes/origin/main')).toBe(ids[1]);
    expect(resolveRev(repo, 'refs/remotes/origin/dev')).toBe(ids[0]);
    expect(resolveRev(repo, 'origin/main~1')).toBe(ids[0]);
    expect(resolveRev(repo, 'origin')).toBe(ids[1]);
    expect(resolveRev(repo, 'origin/nope')).toBeNull();
  });
  it('local branch wins over origin/<name>', () => {
    const { repo, ids } = withRemote();
    const r = { ...repo, branches: { ...repo.branches, 'origin/main': ids[2]! } };
    expect(resolveRev(r, 'origin/main')).toBe(ids[2]);
  });
  it('@{u} resolves through upstream and is null without one', () => {
    const { repo, ids } = withRemote();
    expect(resolveRev(repo, '@{u}')).toBe(ids[1]);
    expect(resolveRev(repo, '@{upstream}')).toBe(ids[1]);
    expect(resolveRev(repo, 'main@{u}')).toBe(ids[1]);
    expect(resolveRev({ ...repo, upstream: {} }, '@{u}')).toBeNull();
    expect(resolveRev(repo, 'HEAD@{u}')).toBe(ids[1]);
    expect(resolveRev(repo, 'HEAD@{upstream}')).toBe(ids[1]);
    expect(resolveRev({ ...repo, upstream: {} }, 'HEAD@{u}')).toBeNull();
    expect(resolveRev(repo, 'nope@{u}')).toBeNull();
  });
  it('aheadBehind counts both sides', () => {
    const { repo, ids } = withRemote();
    expect(aheadBehind(repo, ids[2]!, ids[1]!)).toEqual({ ahead: 1, behind: 0 });
    expect(aheadBehind(repo, ids[0]!, ids[2]!)).toEqual({ ahead: 0, behind: 2 });
    expect(aheadBehind(repo, ids[1]!, ids[1]!)).toEqual({ ahead: 0, behind: 0 });
  });
});
