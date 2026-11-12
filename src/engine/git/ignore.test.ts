import { isIgnored } from './ignore';

describe('isIgnored', () => {
  it('matches directories, globs, anchors and negation', () => {
    expect(isIgnored(['node_modules/'], 'node_modules/x.js')).toBe(true);
    expect(isIgnored(['*.log', '!keep.log'], 'keep.log')).toBe(false);
    expect(isIgnored(['*.log', '!keep.log'], 'a/b.log')).toBe(true);
    expect(isIgnored(['/build'], 'src/build')).toBe(false);
    expect(isIgnored(['/build'], 'build')).toBe(true);
    expect(isIgnored(['**/tmp'], 'a/b/tmp')).toBe(true);
    expect(isIgnored(['docs/**/*.md'], 'docs/a/b.md')).toBe(true);
  });
  it('skips blanks and comments', () => {
    expect(isIgnored(['', '# note', '   '], 'note')).toBe(false);
    expect(isIgnored(['dist/'], 'dist')).toBe(false); // a file named dist is not a dir
  });
});
