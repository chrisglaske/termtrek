import { createWorld } from '../world';
import { runLine } from '../interpreter';
import { getStatus } from './repoState';

const text = (r: ReturnType<typeof runLine>) => r.lines.map((l) => l.map((s) => s.text).join(''));
const toneOf = (r: ReturnType<typeof runLine>, t: string) => r.lines.find((l) => l.some((s) => s.text.includes(t)))![0]!.tone;
const fresh = () => createWorld({ cwd: 'project', repo: { at: 'project' }, files: { 'project/notes.txt': 'hi\n' } });
const committed = () =>
  createWorld({ cwd: 'project', repo: { at: 'project', commits: [{ message: 'Start', files: { 'README.md': '# Hi\n' } }] } });

describe('git status', () => {
  it('fresh repo with untracked file', () => {
    const r = runLine(fresh(), 'git status');
    const t = text(r);
    expect(t).toContain('On branch main');
    expect(t).toContain('No commits yet');
    expect(t).toContain('Untracked files:');
    expect(t).toContain('\tnotes.txt');
    expect(toneOf(r, 'notes.txt')).toBe('error');
    expect(t).toContain('  (use "git add <file>..." to include in what will be committed)');
    expect(t).toContain('nothing added to commit but untracked files present (use "git add" to track)');
    expect(r.explain?.kind).toBe('tip');
  });
  it('staged, unstaged, clean and short formats', () => {
    let w = runLine(fresh(), 'git add notes.txt').world;
    let r = runLine(w, 'git status');
    expect(text(r)).toContain('Changes to be committed:');
    expect(text(r)).toContain('\tnew file:   notes.txt');
    expect(toneOf(r, 'new file:')).toBe('ok');
    expect(text(runLine(w, 'git status -s'))).toEqual(['A  notes.txt']);
    expect(text(runLine(committed(), 'git status')).slice(-1)).toEqual(['nothing to commit, working tree clean']);
    w = runLine(committed(), 'echo more >> README.md').world;
    w = runLine(w, 'touch notes.txt').world;
    r = runLine(w, 'git status -s');
    expect(text(r)).toEqual([' M README.md', '?? notes.txt']);
    expect(text(runLine(w, 'git status'))).toContain('no changes added to commit (use "git add" and/or "git commit -a")');
  });
  it('collapses untracked dirs and shows paths relative to cwd', () => {
    let w = runLine(committed(), 'mkdir src').world;
    w = runLine(w, 'touch src/a.js').world;
    expect(text(runLine(w, 'git status -s'))).toEqual(['?? src/']);
    w = runLine(w, 'cd src').world;
    expect(text(runLine(w, 'git status -s'))).toEqual(['?? ./']);
  });
  it('hides ignored files but shows .gitignore', () => {
    let w = runLine(fresh(), 'echo SECRET > .env').world;
    w = runLine(w, 'echo .env > .gitignore').world;
    const t = text(runLine(w, 'git status'));
    expect(t).toContain('\t.gitignore');
    expect(t.join('\n')).not.toContain('.env');
  });
});

describe('git add', () => {
  it.each(['git add .', 'git add -A', 'git add notes.txt', 'git add --all'])('%s stages the file', (cmd) => {
    const r = runLine(fresh(), cmd);
    expect(r.exitCode).toBe(0);
    expect(r.world.repo!.index['notes.txt']).toBe('hi\n');
    expect(r.explain?.kind).toBe('ok');
  });
  it('rejects missing pathspecs', () => {
    const r = runLine(fresh(), 'git add missing.txt');
    expect(text(r)).toEqual(["fatal: pathspec 'missing.txt' did not match any files"]);
    expect(r.exitCode).toBe(128);
  });
  it('stages deletions', () => {
    let w = runLine(committed(), 'rm README.md').world;
    expect(text(runLine(w, 'git status'))).toContain('\tdeleted:    README.md');
    w = runLine(w, 'git add -A').world;
    expect(getStatus(w)!.staged).toEqual([{ path: 'README.md', kind: 'deleted' }]);
  });
  it('skips ignored files for dirs and refuses them by name', () => {
    let w = runLine(fresh(), 'echo x > .env').world;
    w = runLine(w, 'echo .env > .gitignore').world;
    const r = runLine(w, 'git add .');
    expect(Object.keys(r.world.repo!.index).sort()).toEqual(['.gitignore', 'notes.txt']);
    const named = runLine(w, 'git add .env');
    expect(text(named)[0]).toBe('The following paths are ignored by one of your .gitignore files:');
    expect(named.exitCode).toBe(1);
    expect(runLine(w, 'git add -f .env').world.repo!.index['.env']).toBe('x\n');
  });
  it('add of a directory and from a subdirectory', () => {
    let w = runLine(fresh(), 'mkdir src').world;
    w = runLine(w, 'echo 1 > src/a.js').world;
    expect(Object.keys(runLine(w, 'git add src').world.repo!.index)).toEqual(['src/a.js']);
    w = runLine(w, 'cd src').world;
    expect(Object.keys(runLine(w, 'git add .').world.repo!.index)).toEqual(['src/a.js']);
    expect(Object.keys(runLine(w, 'git add -A').world.repo!.index).sort()).toEqual(['notes.txt', 'src/a.js']);
  });
});

describe('git status full output', () => {
  const T = '\t';
  it('fresh empty repo', () => {
    expect(text(runLine(createWorld({ cwd: 'p', repo: { at: 'p' } }), 'git status'))).toEqual([
      'On branch main', '', 'No commits yet', '', 'nothing to commit (create/copy files and use "git add" to track)',
    ]);
  });
  it('untracked only', () => {
    expect(text(runLine(fresh(), 'git status'))).toEqual([
      'On branch main', '', 'No commits yet', '', 'Untracked files:',
      '  (use "git add <file>..." to include in what will be committed)', T + 'notes.txt', '',
      'nothing added to commit but untracked files present (use "git add" to track)',
    ]);
  });
  it('staged only in an unborn repo', () => {
    const w = runLine(fresh(), 'git add notes.txt').world;
    expect(text(runLine(w, 'git status'))).toEqual([
      'On branch main', '', 'No commits yet', '', 'Changes to be committed:',
      '  (use "git rm --cached <file>..." to unstage)', T + 'new file:   notes.txt', '',
    ]);
  });
  it('clean tree', () => {
    expect(text(runLine(committed(), 'git status'))).toEqual(['On branch main', 'nothing to commit, working tree clean']);
  });
  it('modified unstaged', () => {
    const w = runLine(committed(), 'echo x >> README.md').world;
    expect(text(runLine(w, 'git status'))).toEqual([
      'On branch main', 'Changes not staged for commit:',
      '  (use "git add <file>..." to update what will be committed)',
      '  (use "git restore <file>..." to discard changes in working directory)',
      T + 'modified:   README.md', '',
      'no changes added to commit (use "git add" and/or "git commit -a")',
    ]);
  });
  it('modified staged', () => {
    let w = runLine(committed(), 'echo x >> README.md').world;
    w = runLine(w, 'git add README.md').world;
    expect(text(runLine(w, 'git status'))).toEqual([
      'On branch main', 'Changes to be committed:', '  (use "git restore --staged <file>..." to unstage)',
      T + 'modified:   README.md', '',
    ]);
  });
  it('subdirectory shows ../ paths', () => {
    let w = createWorld({ cwd: 'p/a/b', repo: { at: 'p' }, files: { 'p/notes.txt': 'n', 'p/a/x.txt': 'x' } });
    w = runLine(w, 'git add ../../notes.txt').world;
    w = { ...w, cwd: '/home/you/p/a/b' };
    expect(text(runLine(w, 'git status'))).toEqual([
      'On branch main', '', 'No commits yet', '', 'Changes to be committed:',
      '  (use "git rm --cached <file>..." to unstage)', T + 'new file:   ../../notes.txt', '',
      'Untracked files:', '  (use "git add <file>..." to include in what will be committed)', T + '../', '',
    ]);
  });
});
