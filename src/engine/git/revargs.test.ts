import { createWorld } from '../world';
import { runLine } from '../interpreter';
import { parseRevArgs } from './revargs';

const ident = { 'user.name': 'Sam', 'user.email': 'sam@example.com' };
const setup = () => {
  let w = createWorld({ cwd: 'project', config: ident, repo: { at: 'project' }, files: { 'project/a.txt': 'a\n', 'project/dir/b.txt': 'b\n' } });
  for (const c of ['git add .', 'git commit -m one', 'echo w >> a.txt', 'git commit -am two']) w = runLine(w, c).world;
  return w;
};

describe('parseRevArgs', () => {
  it('splits revisions, ranges and paths', () => {
    const w = setup();
    const r = parseRevArgs(w, w.repo!, ['HEAD~1..HEAD', 'main', 'a.txt', 'dir']);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.revs.map((x) => x.kind)).toEqual(['range', 'one']);
      expect(r.paths).toEqual(['a.txt', 'dir']);
    }
  });
  it('treats everything after -- as paths and an empty range side as HEAD', () => {
    const w = setup();
    const r = parseRevArgs(w, w.repo!, ['HEAD~1..', '--', 'gone.txt']);
    expect(r.ok && r.paths).toEqual(['gone.txt']);
    expect(r.ok && r.revs[0]!.kind).toBe('range');
  });
  it('refuses an unknown word and a path outside the repo', () => {
    const w = setup();
    const bad = parseRevArgs(w, w.repo!, ['nope']);
    expect(!bad.ok && bad.lines[0]![0]!.text).toBe("fatal: ambiguous argument 'nope': unknown revision or path not in the working tree.");
    const out = parseRevArgs(w, w.repo!, ['--', '/etc']);
    expect(!out.ok && out.lines[0]![0]!.text).toBe(`fatal: /etc: '/etc' is outside repository at '${w.repo!.root}'`);
  });
  it('calls a missing word outside the repo ambiguous, and an existing one outside the repo', () => {
    let w = createWorld({ cwd: 'project', config: ident, repo: { at: 'project' }, files: { 'project/a.txt': 'a\n', 'other.txt': 'o\n' } });
    for (const c of ['git add .', 'git commit -m one']) w = runLine(w, c).world;
    const ambiguous = parseRevArgs(w, w.repo!, ['../nope']);
    expect(!ambiguous.ok && ambiguous.lines[0]![0]!.text).toBe("fatal: ambiguous argument '../nope': unknown revision or path not in the working tree.");
    const out = parseRevArgs(w, w.repo!, ['../other.txt']);
    expect(!out.ok && out.lines[0]![0]!.text).toBe(`fatal: ../other.txt: '../other.txt' is outside repository at '${w.repo!.root}'`);
  });
});
