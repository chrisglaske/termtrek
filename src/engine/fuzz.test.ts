import { createWorld } from './world';
import { runLine } from './interpreter';

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
}

describe('fuzz', () => {
  it('fuzz: never throws', () => {
    const rand = rng(42);
    const pick = <T,>(a: T[]): T => a[Math.floor(rand() * a.length)]!;
    const pieces = ['pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'echo', 'rm', 'clear', 'help', 'git', 'git init', 'git status', 'git add', 'git config', 'git add .', 'git commit -m', 'git commit -am', 'git log', 'git log --oneline', 'git diff', 'git diff --staged', 'git config user.name', 'status',
      '-a', '-p', '-r', '-rf', '/', '..', '~', 'a', 'b/c', '"', "'", '&&', ';', '|', '||', '>', '>>', '\\', '🙂', ' ', '  ', '\t'];
    const lines: string[] = ['', 'a'.repeat(5000), '&&'.repeat(2500), '"'.repeat(5001)];
    while (lines.length < 500) {
      const n = Math.floor(rand() * 8);
      lines.push(Array.from({ length: n }, () => pick(pieces)).join(rand() < 0.7 ? ' ' : ''));
    }
    const worlds = [
      createWorld(),
      createWorld({ cwd: 'p', repo: { at: 'p', commits: [{ message: 'm', files: { 'a.txt': '1' } }] }, files: { 'p/.gitignore': 'a\n' } }),
    ];
    for (const line of lines) {
      for (const w of worlds) {
        expect(() => runLine(w, line)).not.toThrow();
        const r = runLine(w, line);
        expect(typeof r.exitCode).toBe('number');
        for (const l of r.lines) expect(l.map((s) => s.text).join('')).not.toContain('internal error');
      }
    }
  });
});
