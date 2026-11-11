import { merge3, mergeTrees } from './merge3';
import { diffstat } from './git/diffstat';

const L = { ours: 'HEAD', theirs: 'feature' };
const flat = (lines: { text: string }[][]) => lines.map((l) => l.map((s) => s.text).join(''));

describe('merge3', () => {
  it('one side changed', () => {
    expect(merge3('a\nb\nc\n', 'a\nB\nc\n', 'a\nb\nc\n', L)).toEqual({ text: 'a\nB\nc\n', conflicts: 0 });
    expect(merge3('a\nb\nc\n', 'a\nb\nc\n', 'a\nb\nc\nd\n', L)).toEqual({ text: 'a\nb\nc\nd\n', conflicts: 0 });
  });
  it('both changed different lines', () => {
    const r = merge3('1\n2\n3\n4\n5\n', 'ONE\n2\n3\n4\n5\n', '1\n2\n3\n4\nFIVE\n', L);
    expect(r).toEqual({ text: 'ONE\n2\n3\n4\nFIVE\n', conflicts: 0 });
  });
  it('same edit both sides', () => {
    expect(merge3('a\nb\nc\n', 'a\nX\nc\n', 'a\nX\nc\n', L)).toEqual({ text: 'a\nX\nc\n', conflicts: 0 });
  });
  it('same line differently', () => {
    const r = merge3('1\n2\n3\n', '1\nTWO-m\n3\n', '1\nTWO-f\n3\n4\n', L);
    expect(r.conflicts).toBe(1);
    expect(r.text).toBe('1\n<<<<<<< HEAD\nTWO-m\n=======\nTWO-f\n>>>>>>> feature\n3\n4\n');
    const two = merge3('a\nb\nc\nd\ne\n', 'A1\nb\nc\nd\nE1\n', 'A2\nb\nc\nd\nE2\n', L);
    expect(two.conflicts).toBe(2);
  });
  it('trailing newline kept', () => {
    expect(merge3('a\nb\nc\n', 'A\nb\nc\n', 'a\nb\nc\nd\n', L).text).toBe('A\nb\nc\nd\n');
    expect(merge3('1', '1', '2', L).text).toBe('2');
    expect(merge3('1', 'x', '2', L).text).toBe('<<<<<<< HEAD\nx\n=======\n2\n>>>>>>> feature\n');
    expect(merge3('', '', '', L)).toEqual({ text: '', conflicts: 0 });
  });
});

describe('mergeTrees', () => {
  it('takes one-sided changes and reports conflicts by kind', () => {
    const base = { 'keep.txt': 'k\n', 'gone.txt': 'g\n', 'md.txt': 'm\n', 'dm.txt': 'd\n', 'n.txt': '1\n' };
    const ours = { 'keep.txt': 'k\n', 'gone.txt': 'g\n', 'md.txt': 'm2\n', 'n.txt': 'o\n', 'both.txt': 'o\n', 'mine.txt': 'x\n' };
    const theirs = { 'keep.txt': 'K\n', 'dm.txt': 'd2\n', 'n.txt': 't\n', 'both.txt': 't\n' };
    const r = mergeTrees(base, ours, theirs, L);
    expect(r.conflicts).toEqual([
      { path: 'both.txt', kind: 'add/add' },
      { path: 'dm.txt', kind: 'modify/delete', deleted: 'ours' },
      { path: 'md.txt', kind: 'modify/delete', deleted: 'theirs' },
      { path: 'n.txt', kind: 'content' },
    ]);
    expect(r.tree).toEqual({ 'keep.txt': 'K\n', 'md.txt': 'm2\n', 'n.txt': 'o\n', 'both.txt': 'o\n', 'mine.txt': 'x\n' });
    expect(r.work['dm.txt']).toBe('d2\n');
    expect(r.work['md.txt']).toBe('m2\n');
    expect(r.work['gone.txt']).toBeUndefined();
    expect(r.work['n.txt']).toBe('<<<<<<< HEAD\no\n=======\nt\n>>>>>>> feature\n');
  });
});

describe('diffstat', () => {
  it('pads paths and sums changes', () => {
    const lines = flat(diffstat({ 'notes.txt': '1\n' }, { 'notes.txt': '1\n2\n', 'f.txt': 'new\n' }));
    expect(lines).toEqual([
      ' f.txt     | 1 +',
      ' notes.txt | 1 +',
      ' 2 files changed, 2 insertions(+)',
      ' create mode 100644 f.txt',
    ]);
    expect(flat(diffstat({ 'a': 'x\n' }, { 'a': 'y\n' }))).toEqual([' a | 2 +-', ' 1 file changed, 1 insertion(+), 1 deletion(-)']);
    expect(flat(diffstat({ 'a': 'x\n' }, {}))).toEqual([' a | 1 -', ' 1 file changed, 1 deletion(-)', ' delete mode 100644 a']);
    expect(diffstat({ a: '1' }, { a: '1' })).toEqual([]);
  });
  it('scales bars to 80 columns', () => {
    const big = Array.from({ length: 300 }, (_, i) => `${i}`).join('\n') + '\n';
    for (const l of flat(diffstat({}, { 'big.txt': big, 'small.txt': 'x\n' }))) expect(l.length).toBeLessThanOrEqual(80);
    const row = flat(diffstat({}, { 'big.txt': big }))[0]!;
    expect(row).toMatch(/^ big\.txt \| 300 \++$/);
  });
});
