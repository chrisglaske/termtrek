import { createWorld } from './world';
import { expandGlob } from './glob';

const w = createWorld({ files: { 'a.txt': '', 'b.txt': '', 'c.md': '', '.hidden.txt': '', 'docs/x.md': '', 'docs/y.md': '', 'sub/z.txt': '' }, cwd: '' });

describe('expandGlob', () => {
  it('matches files and folders, sorted, in the typed shape', () => {
    expect(expandGlob(w, '*.txt')).toEqual(['a.txt', 'b.txt']);
    expect(expandGlob(w, '*')).toEqual(['a.txt', 'b.txt', 'c.md', 'docs', 'sub']);
    expect(expandGlob(w, 'docs/*.md')).toEqual(['docs/x.md', 'docs/y.md']);
    expect(expandGlob(w, '?.md')).toEqual(['c.md']);
    expect(expandGlob(w, '[ab].txt')).toEqual(['a.txt', 'b.txt']);
    expect(expandGlob(w, '*/*.txt')).toEqual(['sub/z.txt']);
  });
  it('hides dotfiles unless the pattern starts with a dot', () => {
    expect(expandGlob(w, '*.txt')).not.toContain('.hidden.txt');
    expect(expandGlob(w, '.*.txt')).toEqual(['.hidden.txt']);
  });
  it('works from a subfolder with ../', () => {
    expect(expandGlob({ ...w, cwd: w.home + '/docs' }, '../*.txt')).toEqual(['../a.txt', '../b.txt']);
  });
  it('returns nothing when no match', () => {
    expect(expandGlob(w, '*.py')).toEqual([]);
  });
});
