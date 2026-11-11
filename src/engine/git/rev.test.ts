import { buildWorld } from '../setup';
import { resolveRev, badRevision } from './rev';
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
