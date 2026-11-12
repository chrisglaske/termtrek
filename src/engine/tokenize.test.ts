import { tokenize } from './tokenize';

const words = (line: string) => {
  const r = tokenize(line);
  if (!r.ok) throw new Error(r.error);
  return r.tokens;
};

describe('tokenize', () => {
  it('splits words and double quotes', () => {
    expect(words('git commit -m "Add notes"').map((t) => t.value)).toEqual(['git', 'commit', '-m', 'Add notes']);
  });
  it('handles single quotes and >>', () => {
    expect(words("echo 'hi there' >> a.txt")).toEqual([
      { kind: 'word', value: 'echo' },
      { kind: 'word', value: 'hi there' },
      { kind: 'op', value: '>>' },
      { kind: 'word', value: 'a.txt' },
    ]);
  });
  it('recognizes && and >', () => {
    expect(words('git add . && git commit -m x')).toContainEqual({ kind: 'op', value: '&&' });
    expect(words('echo a>b')).toContainEqual({ kind: 'op', value: '>' });
  });
  it('reports unterminated quotes', () => {
    expect(tokenize('echo "unterminated')).toEqual({ ok: false, error: 'unexpected EOF while looking for matching `"\'' });
    expect(tokenize("echo 'x")).toEqual({ ok: false, error: "unexpected EOF while looking for matching `''" });
  });
  it('handles empty input and empty quotes', () => {
    expect(words('   ')).toEqual([]);
    expect(words('echo ""')).toEqual([{ kind: 'word', value: 'echo' }, { kind: 'word', value: '' }]);
  });
});

describe('tokenize escapes', () => {
  it('honors \\" and \\\\ inside double quotes', () => {
    expect(words('echo "a\\"b"')).toEqual([{ kind: 'word', value: 'echo' }, { kind: 'word', value: 'a"b' }]);
    expect(words('echo "a\\\\b"')[1]).toEqual({ kind: 'word', value: 'a\\b' });
    expect(words('echo "a\\nb"')[1]).toEqual({ kind: 'word', value: 'a\\nb' });
  });
  it('treats an escaped closing quote as unterminated', () => {
    expect(tokenize('echo "a\\"').ok).toBe(false);
  });
  it('keeps single quotes literal', () => {
    expect(words("echo 'a\\b'")[1]).toEqual({ kind: 'word', value: 'a\\b' });
  });
  it('backslash escapes the next character outside quotes', () => {
    expect(words('echo a\\ b')).toEqual([{ kind: 'word', value: 'echo' }, { kind: 'word', value: 'a b' }]);
    expect(words('echo \\>')[1]).toEqual({ kind: 'word', value: '>' });
    expect(words('echo \\"x')[1]).toEqual({ kind: 'word', value: '"x' });
  });
});
