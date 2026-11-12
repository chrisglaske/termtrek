import { buildWorld } from '../setup';
import { runLine } from '../interpreter';
import { complete } from '../suggest';
import type { RemoteSetup, World } from '../types';

type R = ReturnType<typeof runLine>;
const text = (r: R) => r.lines.map((l) => l.map((s) => s.text).join(''));
const URL = 'https://git.example.com/team/notes.git';
const remote: RemoteSetup = {
  slug: 'team/notes',
  commits: [
    { message: 'Add notes', files: { 'notes.txt': 'one\n' } },
    { message: 'Add readme', files: { 'README.md': '# hi\n' } },
  ],
};
const fresh = (r: RemoteSetup | null = remote): World => buildWorld({ config: { 'user.name': 'Sam', 'user.email': 's@x.com' }, remote: r ?? undefined });
const run = (w: World, ...lines: string[]) => lines.reduce((acc, l) => runLine(acc, l).world, w);
const cloned = (): World => run(fresh(), `git clone ${URL}`, 'cd notes');

describe('git clone', () => {
  it('clone copies history and sets up origin', () => {
    const w = fresh();
    const r = runLine(w, `git clone ${URL}`);
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual(["Cloning into 'notes'..."]);
    expect(r.world.cwd).toBe(w.cwd);
    expect(r.explain!.text).toContain('`cd notes`');
    const repo = r.world.repo!;
    const tip = w.remote!.branches['main']!;
    expect(repo.root).toBe('/home/you/notes');
    expect(repo.branches).toEqual({ main: tip });
    expect(repo.remoteRefs).toEqual({ 'origin/main': tip });
    expect(repo.originHead).toBe('main');
    expect(repo.remotes).toEqual({ origin: URL });
    expect(repo.upstream).toEqual({ main: { remote: 'origin', branch: 'main' } });
    expect(Object.keys(repo.commits)).toHaveLength(2);
    expect(repo.reflog).toEqual([{ id: tip, message: `clone: from ${URL}` }]);
    expect(repo.index).toEqual({ 'notes.txt': 'one\n', 'README.md': '# hi\n' });
    expect(r.world.files['/home/you/notes/notes.txt']).toBe('one\n');
    expect(r.world.files['/home/you/notes/README.md']).toBe('# hi\n');
    expect(text(runLine(run(r.world, 'cd notes'), 'git status')).join('\n')).toContain('nothing to commit');
  });
  it('clone accepts a directory name and a URL without .git', () => {
    const r = runLine(fresh(), 'git clone https://git.example.com/team/notes mine');
    expect(text(r)).toEqual(["Cloning into 'mine'..."]);
    expect(r.world.repo!.root).toBe('/home/you/mine');
  });
  it('clone of an empty repo warns', () => {
    const r = runLine(fresh({ slug: 'team/empty' }), 'git clone https://git.example.com/team/empty.git');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual(["Cloning into 'empty'...", 'warning: You appear to have cloned an empty repository.']);
    const repo = r.world.repo!;
    expect(repo.branches).toEqual({ main: null });
    expect(repo.upstream).toEqual({});
    expect(repo.remotes.origin).toBe('https://git.example.com/team/empty.git');
    expect(repo.originHead).toBeNull();
  });
  it('clone errors', () => {
    const w = fresh();
    const taken = run(w, 'mkdir notes', 'echo x > notes/f');
    const exists = runLine(taken, `git clone ${URL}`);
    expect([text(exists), exists.exitCode]).toEqual([["fatal: destination path 'notes' already exists and is not an empty directory."], 128]);
    const emptyDir = runLine(run(w, 'mkdir notes'), `git clone ${URL}`);
    expect(emptyDir.exitCode).toBe(0);
    const unknown = runLine(w, 'git clone https://git.example.com/team/nope.git');
    expect([text(unknown), unknown.exitCode]).toEqual([['remote: Repository not found.', "fatal: repository 'https://git.example.com/team/nope.git/' not found"], 128]);
    const plain = runLine(w, 'git clone nonexist');
    expect([text(plain), plain.exitCode]).toEqual([["fatal: repository 'nonexist' does not exist"], 128]);
    const none = runLine(w, 'git clone');
    expect(text(none)[0]).toBe('fatal: You must specify a repository to clone.');
    expect(text(none)).toContain('usage: git clone [<options>] [--] <repo> [<dir>]');
    expect(none.exitCode).toBe(129);
    expect(runLine(w, 'git clone -x').exitCode).toBe(129);
    expect(runLine(fresh(null), `git clone ${URL}`).exitCode).toBe(128);
  });
  it('clone refused while a repo exists', () => {
    const w = run(fresh(), 'mkdir other', 'cd other', 'git init');
    const r = runLine(run(w, 'cd ..'), `git clone ${URL}`);
    expect(text(r)).toEqual(['fatal: TermTrek supports one Git repository at a time']);
    expect(r.exitCode).toBe(128);
    expect(runLine(w, `git clone ${URL}`).exitCode).toBe(128);
  });
});

describe('git remote', () => {
  it('remote -v, add and remove', () => {
    const w = cloned();
    expect(text(runLine(w, 'git remote'))).toEqual(['origin']);
    expect(text(runLine(w, 'git remote -v'))).toEqual([`origin\t${URL} (fetch)`, `origin\t${URL} (push)`]);
    const dup = runLine(w, 'git remote add origin x');
    expect([text(dup), dup.exitCode]).toEqual([['error: remote origin already exists.'], 3]);
    const add = runLine(w, 'git remote add backup ../other.git');
    expect([text(add), add.exitCode]).toEqual([[], 0]);
    expect(text(runLine(add.world, 'git remote'))).toEqual(['backup', 'origin']);
    expect(text(runLine(add.world, 'git remote -v'))[0]).toBe('backup\t../other.git (fetch)');
    const none = runLine(w, 'git remote remove nope');
    expect([text(none), none.exitCode]).toEqual([["error: No such remote: 'nope'"], 2]);
    const bad = runLine(w, 'git remote foo');
    expect(text(bad)[0]).toBe("error: unknown subcommand: `foo'");
    expect(bad.exitCode).toBe(129);
    const ren = runLine(w, 'git remote rename origin x');
    expect(text(ren)[0]).toBe("error: unknown subcommand: `rename'");
    expect(ren.exitCode).toBe(129);
    expect(ren.world.repo).toBe(w.repo);
    const rm = runLine(w, 'git remote rm origin');
    expect(rm.exitCode).toBe(0);
    const repo = rm.world.repo!;
    expect(repo.remotes).toEqual({});
    expect(repo.remoteRefs).toEqual({});
    expect(repo.upstream).toEqual({});
    expect(text(runLine(rm.world, 'git remote -v'))).toEqual([]);
  });
});

describe('tracking display', () => {
  it('branch -r, -a and -vv', () => {
    const w = cloned();
    const tip = w.repo!.branches.main!;
    expect(text(runLine(w, 'git branch -r'))).toEqual(['  origin/HEAD -> origin/main', '  origin/main']);
    expect(text(runLine(w, 'git branch -a'))).toEqual(['* main', '  remotes/origin/HEAD -> origin/main', '  remotes/origin/main']);
    expect(text(runLine(w, 'git branch -vv'))).toEqual([`* main ${tip} [origin/main] Add readme`]);
    expect(text(runLine(w, 'git branch -v'))).toEqual([`* main ${tip} Add readme`]);
    const ahead = run(w, 'echo 2 > a.txt', 'git add .', 'git commit -m "Local"', 'git branch longer-name');
    const rows = text(runLine(ahead, 'git branch -vv'));
    expect(rows[0]).toMatch(/^ {2}longer-name [0-9a-f]{7} Local$/);
    expect(rows[1]).toMatch(/^\* main {7} [0-9a-f]{7} \[origin\/main: ahead 1\] Local$/);
    const behind = { ...w, repo: { ...w.repo!, branches: { main: w.repo!.commits[tip]!.parents[0]! } } };
    expect(text(runLine(behind, 'git branch -vv'))[0]).toMatch(/\[origin\/main: behind 1\] Add notes$/);
    const both = run(behind, 'echo 2 > a.txt', 'git add .', 'git commit -m "Local"');
    expect(text(runLine(both, 'git branch -vv'))[0]).toMatch(/\[origin\/main: ahead 1, behind 1\] Local$/);
    const gone = { ...w, repo: { ...w.repo!, remoteRefs: {} } };
    expect(text(runLine(gone, 'git branch -vv'))[0]).toBe(`* main ${tip} [origin/main: gone] Add readme`);
  });
  it('branch -u sets upstream', () => {
    const w = run(cloned(), 'git branch topic');
    const r = runLine(w, 'git branch --set-upstream-to=origin/main topic');
    expect(text(r)).toEqual(["branch 'topic' set up to track 'origin/main'."]);
    expect(r.world.repo!.upstream.topic).toEqual({ remote: 'origin', branch: 'main' });
    const u = runLine(w, 'git branch -u origin/main');
    expect(text(u)).toEqual(["branch 'main' set up to track 'origin/main'."]);
    expect(runLine(w, 'git branch -u origin/main topic').world.repo!.upstream.topic!.branch).toBe('main');
    const bad = runLine(w, 'git branch -u nope');
    expect([text(bad), bad.exitCode]).toEqual([["fatal: the requested upstream branch 'nope' does not exist"], 128]);
    const del = runLine(r.world, 'git branch -d topic');
    expect(del.world.repo!.upstream.topic).toBeUndefined();
    expect(text(runLine(r.world, 'git branch -vv')).join('\n')).toContain('[origin/main]');
  });
  it('branch -m keeps the upstream on the renamed branch', () => {
    const w = cloned();
    const r = runLine(w, 'git branch -m trunk');
    expect(r.world.repo!.upstream).toEqual({ trunk: { remote: 'origin', branch: 'main' } });
    const again = run(r.world, 'git branch main');
    expect(again.repo!.upstream.main).toBeUndefined();
    expect(text(runLine(r.world, 'git branch -vv'))[0]).toContain('[origin/main]');
  });
  it('log decorates origin refs', () => {
    const w = cloned();
    const tip = w.repo!.branches.main!;
    expect(text(runLine(w, 'git log --oneline'))[0]).toBe(`${tip} (HEAD -> main, origin/main, origin/HEAD) Add readme`);
    const next = run(w, 'echo 2 > a.txt', 'git add .', 'git commit -m "Local"');
    const rows = text(runLine(next, 'git log --oneline'));
    expect(rows[0]).toMatch(/^[0-9a-f]{7} \(HEAD -> main\) Local$/);
    expect(rows[1]).toBe(`${tip} (origin/main, origin/HEAD) Add readme`);
  });
});

describe('switch to a remote branch', () => {
  const withFeature = (): World => {
    const w = cloned();
    const tip = w.repo!.branches.main!;
    return { ...w, repo: { ...w.repo!, remoteRefs: { ...w.repo!.remoteRefs, 'origin/feature': tip } } };
  };
  it('switch creates a tracking branch from origin', () => {
    const w = withFeature();
    const r = runLine(w, 'git switch feature');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual(["branch 'feature' set up to track 'origin/feature'.", "Switched to a new branch 'feature'"]);
    expect(r.world.repo!.branches.feature).toBe(w.repo!.branches.main);
    expect(r.world.repo!.upstream.feature).toEqual({ remote: 'origin', branch: 'feature' });
    expect(r.world.repo!.head).toEqual({ kind: 'branch', name: 'feature' });
    const c = runLine(w, 'git checkout feature');
    expect(text(c)).toEqual(["branch 'feature' set up to track 'origin/feature'.", "Switched to a new branch 'feature'"]);
    expect(c.world.repo!.upstream.feature).toBeDefined();
    expect(runLine(w, 'git switch nothing').exitCode).toBe(128);
  });
  it('tab completes remote branch names', () => {
    expect(complete(withFeature(), 'git switch fe').line).toBe('git switch feature');
    expect(complete(withFeature(), 'git merge origin/f').line).toBe('git merge origin/feature');
  });
});
