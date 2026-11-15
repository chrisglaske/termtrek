import { createWorld } from '../world';
import { runLine } from '../interpreter';

const text = (r: ReturnType<typeof runLine>) => r.lines.map((l) => l.map((s) => s.text).join(''));
// Strings below were captured from real git 2.56.0 in .superpowers/.../scratch/rm.
const base = () =>
  createWorld({
    cwd: 'project',
    repo: {
      at: 'project',
      commits: [{ message: 'one', files: { 'a.txt': 'a\n', 'dir/b.txt': 'b\n', 'dir/c.txt': 'c\n', 'x.log': 'l\n', 'y.log': 'l\n' } }],
    },
  });
const run = (w: ReturnType<typeof base>, ...lines: string[]) => {
  let r = runLine(w, lines[0]!);
  for (const l of lines.slice(1)) r = runLine(r.world, l);
  return r;
};

describe('git rm', () => {
  it('removes a clean tracked file from the folder and the index', () => {
    const r = run(base(), 'git rm a.txt');
    expect(text(r)).toEqual(["rm 'a.txt'"]);
    expect(r.exitCode).toBe(0);
    expect(r.world.files['/home/you/project/a.txt']).toBeUndefined();
    expect(r.world.repo!.index['a.txt']).toBeUndefined();
    const st = text(runLine(r.world, 'git status'));
    expect(st).toContain('Changes to be committed:');
    expect(st).toContain('\tdeleted:    a.txt');
  });
  it('--cached keeps the file and leaves it untracked', () => {
    const r = run(base(), 'git rm --cached a.txt');
    expect(text(r)).toEqual(["rm 'a.txt'"]);
    expect(r.world.files['/home/you/project/a.txt']).toBe('a\n');
    expect(r.world.repo!.index['a.txt']).toBeUndefined();
    expect(text(runLine(r.world, 'git status -s'))).toEqual(['D  a.txt', '?? a.txt']);
  });
  it('refuses a folder without -r, even with --cached', () => {
    for (const cmd of ['git rm dir', 'git rm --cached dir']) {
      const r = run(base(), cmd);
      expect(text(r)).toEqual(["fatal: not removing 'dir' recursively without -r"]);
      expect(r.exitCode).toBe(128);
      expect(r.world.files['/home/you/project/dir/b.txt']).toBe('b\n');
    }
  });
  it('-r prints one rm line per file and drops the empty folder', () => {
    const r = run(base(), 'git rm -r dir');
    expect(text(r)).toEqual(["rm 'dir/b.txt'", "rm 'dir/c.txt'"]);
    expect(r.world.dirs).not.toContain('/home/you/project/dir');
    expect(text(run(base(), 'git rm -rf dir/'))).toEqual(["rm 'dir/b.txt'", "rm 'dir/c.txt'"]);
  });
  it('unknown pathspec is fatal with exit 128, and --ignore-unmatch quiets it', () => {
    const r = run(base(), 'git rm nope');
    expect(text(r)).toEqual(["fatal: pathspec 'nope' did not match any files"]);
    expect(r.exitCode).toBe(128);
    expect(run(base(), 'git rm --ignore-unmatch nope').exitCode).toBe(0);
    expect(text(run(base(), 'git rm z.txt a.txt'))).toEqual(["fatal: pathspec 'z.txt' did not match any files"]);
  });
  it('no pathspec', () => {
    const r = run(base(), 'git rm');
    expect(text(r)).toEqual(['fatal: No pathspec was given. Which files should I remove?']);
    expect(r.exitCode).toBe(128);
  });
  it('local modifications are refused, -f forces, --cached allows', () => {
    const w = run(base(), 'echo mod >> a.txt').world;
    const r = runLine(w, 'git rm a.txt');
    expect(text(r)).toEqual([
      'error: the following file has local modifications:',
      '    a.txt',
      '(use --cached to keep the file, or -f to force removal)',
    ]);
    expect(r.exitCode).toBe(1);
    expect(r.world.files['/home/you/project/a.txt']).toContain('mod');
    expect(text(runLine(w, 'git rm -f a.txt'))).toEqual(["rm 'a.txt'"]);
    expect(text(runLine(w, 'git rm --cached a.txt'))).toEqual(["rm 'a.txt'"]);
  });
  it('lists several modified files with the plural wording', () => {
    const w = run(base(), 'echo m >> a.txt', 'echo m >> dir/b.txt').world;
    expect(text(runLine(w, 'git rm a.txt dir/b.txt'))).toEqual([
      'error: the following files have local modifications:',
      '    a.txt',
      '    dir/b.txt',
      '(use --cached to keep the file, or -f to force removal)',
    ]);
  });
  it('staged content is refused', () => {
    const w = run(base(), 'echo m >> a.txt', 'git add a.txt').world;
    const r = runLine(w, 'git rm a.txt');
    expect(text(r)).toEqual([
      'error: the following file has changes staged in the index:',
      '    a.txt',
      '(use --cached to keep the file, or -f to force removal)',
    ]);
    expect(r.exitCode).toBe(1);
    expect(text(runLine(w, 'git rm --cached a.txt'))).toEqual(["rm 'a.txt'"]);
    const nw = run(base(), 'echo n > n.txt', 'git add n.txt').world;
    expect(text(runLine(nw, 'git rm n.txt'))[0]).toBe('error: the following file has changes staged in the index:');
  });
  it('staged content different from both the file and HEAD', () => {
    const w = run(base(), 'echo m >> a.txt', 'git add a.txt', 'echo more >> a.txt').world;
    const r = runLine(w, 'git rm a.txt');
    expect(text(r)).toEqual([
      'error: the following file has staged content different from both the',
      'file and the HEAD:',
      '    a.txt',
      '(use -f to force removal)',
    ]);
    expect(r.exitCode).toBe(1);
    expect(text(runLine(w, 'git rm -f a.txt'))).toEqual(["rm 'a.txt'"]);
  });
  it('-n only previews and -q is silent', () => {
    const r = run(base(), 'git rm -n a.txt');
    expect(text(r)).toEqual(["rm 'a.txt'"]);
    expect(r.world.repo!.index['a.txt']).toBe('a\n');
    expect(text(run(base(), 'git rm -q a.txt'))).toEqual([]);
  });
  it('a file already deleted in the folder can be removed', () => {
    const w = run(base(), 'rm a.txt').world;
    expect(text(runLine(w, 'git rm a.txt'))).toEqual(["rm 'a.txt'"]);
  });
  it('expands globs through the shell', () => {
    expect(text(run(base(), 'git rm *.log'))).toEqual(["rm 'x.log'", "rm 'y.log'"]);
  });
  it('prints repo-relative paths from a subfolder', () => {
    const r = run(base(), 'cd dir', 'git rm ../a.txt');
    expect(text(r)).toEqual(["rm 'a.txt'"]);
  });
  it('unknown option', () => {
    const r = run(base(), 'git rm --bogus a.txt');
    expect(text(r)[0]).toBe("error: unknown option `bogus'");
    expect(r.exitCode).toBe(129);
  });
  it('is listed in git help', () => {
    expect(text(run(base(), 'git help')).some((l) => l.includes('rm        Remove files'))).toBe(true);
  });
});

describe('real Git commands TermTrek lacks', () => {
  it.each(['show', 'tag', 'cherry-pick', 'blame', 'mv', 'clean'])('git %s is honest', (name) => {
    const r = run(base(), `git ${name} v1`);
    expect(text(r)).toEqual([`git: '${name}' is a real Git command, but TermTrek doesn't have it yet.`]);
    expect(r.exitCode).toBe(1);
    expect(r.explain).toEqual({
      kind: 'tip',
      text: 'TermTrek covers the commands the course teaches. Type `git help` to see them.',
    });
  });
  it('a made-up command is still not a git command', () => {
    const r = run(base(), 'git frobnicate');
    expect(text(r)).toEqual(["git: 'frobnicate' is not a git command. See 'git --help'."]);
  });
});
