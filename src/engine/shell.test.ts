import { createWorld } from './world';
import { runLine } from './interpreter';
import { registry } from './registry';
import type { RunResult, World } from './types';

const text = (r: RunResult) => r.lines.map((l) => l.map((s) => s.text).join(''));
const run = (lines: string[], w: World = createWorld()) => {
  let last!: RunResult;
  let world = w;
  for (const l of lines) {
    last = runLine(world, l);
    world = last.world;
  }
  return last;
};

describe('shell', () => {
  it('mkdir -p && cd && pwd', () => {
    expect(text(run(['mkdir -p a/b && cd a/b && pwd']))).toEqual(['/home/you/a/b']);
  });
  it('echo redirects', () => {
    const r = run(['echo hi > n.txt', 'echo there >> n.txt', 'cat n.txt']);
    expect(text(r)).toEqual(['hi', 'there']);
  });
  it('ls lists dirs then files alphabetically', () => {
    const w = createWorld({ files: { 'b.txt': '', 'a.txt': '', 'zdir/x': '', 'adir/y': '' } });
    expect(text(runLine(w, 'ls'))).toEqual(['adir', 'zdir', 'a.txt', 'b.txt']);
  });
  it('ls hides dotfiles; ls -a in a repo shows .git', () => {
    const w = createWorld({ repo: { at: '' }, files: { '.env': 'x', 'a.txt': '' } });
    expect(text(runLine(w, 'ls'))).toEqual(['a.txt']);
    expect(text(runLine(w, 'ls -a'))).toEqual(['.git', '.env', 'a.txt']);
    const w2 = createWorld({ repo: { at: 'p' }, dirs: ['q'] });
    expect(text(runLine(w2, 'ls -a'))).toEqual(['p', 'q']);
    expect(text(runLine(w2, 'ls -a p'))).toEqual(['.git']);
  });
  it('cd errors', () => {
    const r = runLine(createWorld(), 'cd nope');
    expect(text(r)).toEqual(['bash: cd: nope: No such file or directory']);
    expect(r.lines[0]![0]!.tone).toBe('error');
    expect(r.exitCode).toBe(1);
  });
  it('cd with no arg goes home', () => {
    const w = createWorld({ cwd: 'a', dirs: ['a'] });
    expect(runLine(w, 'cd').world.cwd).toBe('/home/you');
  });
  it('rm needs -r for dirs', () => {
    const w = createWorld({ dirs: ['dir'] });
    const r = runLine(w, 'rm dir');
    expect(text(r)).toEqual(["rm: cannot remove 'dir': Is a directory"]);
    expect(r.exitCode).toBe(1);
    const r2 = runLine(w, 'rm -r dir');
    expect(r2.world.dirs).not.toContain('/home/you/dir');
  });
  it('rm -rf / is refused', () => {
    const w = createWorld({ files: { 'a.txt': 'x' } });
    const r = runLine(w, 'rm -rf /');
    expect(text(r)).toEqual(["rm: it is dangerous to operate recursively on '/'"]);
    expect(r.world).toEqual(w);
  });
  it('rm removes files and the repo when its root goes', () => {
    const w = createWorld({ files: { 'p/a.txt': 'x' }, repo: { at: 'p' } });
    expect(runLine(w, 'rm p/a.txt').world.files['/home/you/p/a.txt']).toBeUndefined();
    expect(runLine(w, 'rm -r p').world.repo).toBeNull();
  });
  it('clear', () => {
    expect(runLine(createWorld(), 'clear').clear).toBe(true);
  });
  it('help lists commands as pills', () => {
    const r = runLine(createWorld(), 'help');
    expect(r.explain?.kind).toBe('tip');
    for (const c of ['pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'echo', 'rm', 'clear', 'help']) {
      expect(r.explain?.text).toContain('`' + c + '`');
    }
  });
  it('touch, cat errors', () => {
    const r = run(['touch a.txt', 'cat a.txt', 'cat nope']);
    expect(text(r)).toEqual(['cat: nope: No such file or directory']);
    expect(r.exitCode).toBe(1);
  });
  it('unknown command', () => {
    const r = runLine(createWorld(), 'frobnicate');
    expect(text(r)).toEqual(['bash: frobnicate: command not found']);
    expect(r.exitCode).toBe(127);
  });
  it('&& stops after failure', () => {
    const r = runLine(createWorld(), 'cd nope && echo no');
    expect(text(r)).toEqual(['bash: cd: nope: No such file or directory']);
    expect(r.exitCode).toBe(1);
  });
  it('does not mutate the input world', () => {
    const w = createWorld();
    const snap = JSON.stringify(w);
    runLine(w, 'mkdir a && touch a/b && echo x > c && rm c');
    expect(JSON.stringify(w)).toBe(snap);
  });
  it('registry is a plain record (git is a one-line addition)', () => {
    expect(typeof registry.pwd).toBe('function');
  });
  it('empty line and quotes', () => {
    expect(text(runLine(createWorld(), ''))).toEqual([]);
    expect(text(runLine(createWorld(), 'echo "a\\"b"'))).toEqual(['a"b']);
    const r = runLine(createWorld(), 'echo "oops');
    expect(r.exitCode).toBe(2);
    expect(text(r)[0]).toMatch(/^bash: unexpected EOF/);
  });
});

describe('syntax errors', () => {
  const err = (line: string) => {
    const r = runLine(createWorld(), line);
    return [text(r)[0], r.exitCode];
  };
  const tok = (t: string) => [`bash: syntax error near unexpected token \`${t}'`, 2];
  it('reports bad operator sequences', () => {
    expect(err('echo a && && echo b')).toEqual(tok('&&'));
    expect(err('&& echo a')).toEqual(tok('&&'));
    expect(err('echo a &&')).toEqual(tok('newline'));
    expect(err('echo a >')).toEqual(tok('newline'));
    expect(err('echo a > && echo')).toEqual(tok('&&'));
    expect(err('echo a >>> f')).toEqual(tok('>'));
    expect(err('echo a > > f')).toEqual(tok('>'));
  });
  it('runs nothing when the line is malformed', () => {
    const w = createWorld();
    expect(runLine(w, 'touch a && && touch b').world).toEqual(w);
  });
});

describe('semicolons and pipes', () => {
  it('runs both commands separated by ;', () => {
    expect(text(run(['mkdir a; ls']))).toEqual(['a']);
    expect(text(run(['mkdir a ;ls']))).toEqual(['a']);
    expect(text(run(['pwd;pwd']))).toEqual(['/home/you', '/home/you']);
  });
  it('runs the next command after ; even when the first failed', () => {
    const r = run(['cat nope; pwd']);
    expect(text(r)).toEqual(['cat: nope: No such file or directory', '/home/you']);
    expect(r.exitCode).toBe(0);
  });
  it('&& still stops at the first failure, but a later ; runs', () => {
    expect(text(run(['cat nope && pwd']))).toEqual(['cat: nope: No such file or directory']);
    expect(text(run(['cat nope && pwd; echo hi']))).toEqual(['cat: nope: No such file or directory', 'hi']);
  });
  it('keeps ; literal inside quotes', () => {
    expect(text(run(['echo "a;b"']))).toEqual(['a;b']);
    expect(text(run(["echo 'a;b'"]))).toEqual(['a;b']);
  });
  it('allows a trailing ; and rejects a leading or doubled one', () => {
    expect(text(run(['pwd;']))).toEqual(['/home/you']);
    expect(text(run([';pwd']))).toEqual(["bash: syntax error near unexpected token `;'"]);
    expect(run(['pwd;;pwd']).exitCode).toBe(2);
  });
  it('explains that pipes are not supported', () => {
    for (const line of ['ls | grep a', 'ls || pwd', 'ls |']) {
      const r = run([line]);
      expect(text(r)).toEqual(["termtrek: pipes (|) aren't supported here"]);
      expect(r.exitCode).toBe(1);
    }
  });
});

describe('code and editor aliases', () => {
  const world = createWorld({ files: { 'notes.txt': 'hi\n' }, dirs: ['docs'] });
  it('code notes.txt sets open', () => {
    const r = run(['code notes.txt'], world);
    expect(r.open).toBe('/home/you/notes.txt');
    expect(r.lines).toEqual([]);
    expect(r.explain?.text).toBe('Opened **notes.txt** in the editor tab. Save with Ctrl+S (⌘S on Mac).');
  });
  it('code opens a missing file', () => {
    expect(run(['code new.txt'], world).open).toBe('/home/you/new.txt');
  });
  it('vim notes.txt adds the alias tip', () => {
    const r = run(['vim notes.txt'], world);
    expect(r.open).toBe('/home/you/notes.txt');
    expect(r.explain?.text).toContain('Here `nano`, `vim` and `open` open the same editor; on your computer, `code` opens VS Code.');
  });
  it('code on a directory', () => {
    const r = run(['code docs'], world);
    expect(text(r)).toEqual(['code: docs: Is a directory']);
    expect(r.exitCode).toBe(1);
    expect(r.open).toBeUndefined();
  });
  it('code with no args', () => {
    const r = run(['code'], world);
    expect(text(r)).toEqual(['code: name a file to open, like `code notes.txt`']);
    expect(r.exitCode).toBe(1);
  });
  it('code outside home', () => {
    expect(text(run(['code /etc/hosts'], world))).toEqual(['code: /etc/hosts: Permission denied']);
  });
});
