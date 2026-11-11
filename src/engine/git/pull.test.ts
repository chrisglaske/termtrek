import { buildWorld } from '../setup';
import { runLine } from '../interpreter';
import { finishEditor } from './editor';
import { teammatePush } from '../remote/teammate';
import type { RemoteSetup, RunResult, World } from '../types';

const text = (r: RunResult) => r.lines.map((l) => l.map((s) => s.text).join(''));
const URL = 'https://git.example.com/team/notes.git';
const remote: RemoteSetup = {
  slug: 'team/notes',
  commits: [
    { message: 'Add notes', files: { 'notes.txt': 'one\n' } },
    { message: 'Add readme', files: { 'README.md': '# hi\n' } },
  ],
};
const ALEX = { name: 'Alex Kim', email: 'alex@example.com' };
const run = (w: World, ...lines: string[]) => lines.reduce((acc, l) => runLine(acc, l).world, w);
const cloned = (): World => run(buildWorld({ config: { 'user.name': 'Sam', 'user.email': 's@x.com' }, remote }), `git clone ${URL}`, 'cd notes');
const mate = (w: World, message = 'Alex edit', files: Record<string, string> = { 'alex.txt': 'hi\n' }): World => teammatePush({ branch: 'main', message, files, author: ALEX })(w);
const local = (w: World, file: string, content: string, msg: string) => run(w, `echo ${content} > ${file}`, 'git add .', `git commit -m "${msg}"`);
const diverged = (): World => local(mate(cloned()), 'mine.txt', 'mine', 'My edit');
const conflicted = (): World => local(mate(cloned(), 'Alex notes', { 'notes.txt': 'alex\n' }), 'notes.txt', 'mine', 'My notes');
const DIVERGENT = [
  'hint: You have divergent branches and need to specify how to reconcile them.',
  'hint: You can do so by running one of the following commands sometime before',
  'hint: your next pull:',
  'hint:',
  'hint:   git config pull.rebase false  # merge',
  'hint:   git config pull.rebase true   # rebase',
  'hint:   git config pull.ff only       # fast-forward only',
  'hint:',
  'hint: You can replace "git config" with "git config --global" to set a default',
  'hint: preference for all repositories. You can also pass --rebase, --no-rebase,',
  'hint: or --ff-only on the command line to override the configured default per',
  'hint: invocation.',
  'fatal: Need to specify how to reconcile divergent branches.',
];

describe('git pull', () => {
  it('pull fast-forwards', () => {
    const w = mate(cloned());
    const old = w.repo!.branches.main!;
    const tip = w.remote!.branches.main!;
    const r = runLine(w, 'git pull');
    expect(r.exitCode).toBe(0);
    expect(text(r).slice(0, 3)).toEqual(['From https://git.example.com/team/notes', `   ${old}..${tip}  main       -> origin/main`, `Updating ${old}..${tip}`]);
    expect(text(r)).toContain('Fast-forward');
    expect(r.world.repo!.branches.main).toBe(tip);
    expect(r.world.files['/home/you/notes/alex.txt']).toBe('hi\n');
  });
  it('pull already up to date', () => {
    const w = cloned();
    const r = runLine(w, 'git pull');
    expect([text(r), r.exitCode]).toEqual([['Already up to date.'], 0]);
    expect(r.world.repo).toEqual(w.repo);
  });
  it('pull divergent needs a choice', () => {
    const w = diverged();
    const old = w.repo!.remoteRefs['origin/main']!;
    const tip = w.remote!.branches.main!;
    const r = runLine(w, 'git pull');
    expect(r.exitCode).toBe(128);
    expect(text(r)).toEqual(['From https://git.example.com/team/notes', `   ${old}..${tip}  main       -> origin/main`, ...DIVERGENT]);
    expect(r.world.repo!.remoteRefs['origin/main']).toBe(tip);
    expect(r.world.repo!.branches.main).toBe(w.repo!.branches.main);
    expect(r.world.files).toEqual(w.files);
    expect(r.explain!.text).toContain('git pull --rebase');
    expect(r.explain!.text).toContain('git pull --no-rebase');
  });
  it('pull --no-rebase makes a merge', () => {
    const w = diverged();
    const mine = w.repo!.branches.main!;
    const r = runLine(w, 'git pull --no-rebase');
    expect(r.exitCode).toBe(0);
    expect(r.world.pending).toBeDefined();
    expect(r.world.pending!.text).toContain("Merge branch 'main' of https://git.example.com/team/notes");
    const saved = finishEditor(r.world, r.world.pending!.text);
    const repo = saved.world.repo!;
    const merge = repo.commits[repo.branches.main!]!;
    expect(merge.parents).toHaveLength(2);
    expect(merge.parents[0]).toBe(mine);
    expect(merge.parents[1]).toBe(w.remote!.branches.main);
    expect(merge.message.split('\n')[0]).toBe("Merge branch 'main' of https://git.example.com/team/notes");
  });
  it('pull --rebase replays local commits', () => {
    const w = diverged();
    const tip = w.remote!.branches.main!;
    const r = runLine(w, 'git pull --rebase');
    expect(r.exitCode).toBe(0);
    expect(text(r).at(-1)).toBe('Successfully rebased and updated refs/heads/main.');
    const repo = r.world.repo!;
    const c = repo.commits[repo.branches.main!]!;
    expect(c.message).toBe('My edit');
    expect(c.parents).toEqual([tip]);
    expect(repo.op).toBeNull();
    expect(repo.head).toEqual({ kind: 'branch', name: 'main' });
  });
  it('pull.rebase config is honored', () => {
    const rebased = runLine(run(diverged(), 'git config pull.rebase true'), 'git pull');
    expect(text(rebased).at(-1)).toBe('Successfully rebased and updated refs/heads/main.');
    const merged = runLine(run(diverged(), 'git config pull.rebase false'), 'git pull');
    expect(merged.exitCode).toBe(0);
    expect(merged.world.pending).toBeDefined();
    const ff = runLine(run(diverged(), 'git config pull.ff only'), 'git pull');
    expect(text(ff).at(-1)).toBe('fatal: Not possible to fast-forward, aborting.');
    // a flag beats the config
    expect(runLine(run(diverged(), 'git config pull.rebase true'), 'git pull --no-rebase').world.pending).toBeDefined();
  });
  it('pull --ff-only refuses', () => {
    const w = diverged();
    const r = runLine(w, 'git pull --ff-only');
    expect(r.exitCode).toBe(128);
    expect(text(r).slice(2)).toEqual([
      "hint: Diverging branches can't be fast-forwarded, you need to either:",
      'hint:',
      'hint: \tgit merge --no-ff',
      'hint:',
      'hint: or:',
      'hint:',
      'hint: \tgit rebase',
      'fatal: Not possible to fast-forward, aborting.',
    ]);
    expect(r.world.repo!.branches.main).toBe(w.repo!.branches.main);
    // but a plain fast-forward is fine
    expect(runLine(mate(cloned()), 'git pull --ff-only').exitCode).toBe(0);
  });
  it('pull --ff-only --no-ff lets the last flag win', () => {
    const w = cloned();
    expect(runLine(mate(w), 'git pull --ff-only --no-ff --no-edit').exitCode).toBe(0);
  });
  it('pull --no-ff creates a merge commit even when fast-forward is possible', () => {
    const w = mate(cloned());
    const mine = w.repo!.branches.main!;
    const r = runLine(w, 'git pull --no-ff');
    expect(r.exitCode).toBe(0);
    expect(r.world.pending).toBeDefined();
    const saved = finishEditor(r.world, r.world.pending!.text);
    const repo = saved.world.repo!;
    const merge = repo.commits[repo.branches.main!]!;
    expect(merge.parents).toEqual([mine, w.remote!.branches.main]);
    expect(text(saved)).toContain("Merge made by the 'ort' strategy.");
  });
  it('pull --ff still fast-forwards', () => {
    const w = mate(cloned());
    const r = runLine(w, 'git pull --ff');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toContain('Fast-forward');
  });
  it('pull -q prints no From or Updating lines', () => {
    for (const flag of ['-q', '--quiet']) {
      const w = mate(cloned());
      const r = runLine(w, `git pull ${flag}`);
      expect([text(r), r.exitCode]).toEqual([[], 0]);
      expect(r.world.repo!.branches.main).toBe(w.remote!.branches.main);
    }
  });
  it('pull -v is accepted', () => {
    for (const flag of ['-v', '--verbose']) {
      const r = runLine(mate(cloned()), `git pull ${flag}`);
      expect(r.exitCode).toBe(0);
      expect(text(r)).toContain('Fast-forward');
    }
  });
  it('pull without upstream', () => {
    const w = run(cloned(), 'git switch -c topic');
    const r = runLine(w, 'git pull');
    expect(r.exitCode).toBe(1);
    expect(text(r)).toEqual([
      'There is no tracking information for the current branch.',
      'Please specify which branch you want to merge with.',
      'See git-pull(1) for details.',
      '',
      '    git pull <remote> <branch>',
      '',
      'If you wish to set tracking information for this branch you can do so with:',
      '',
      '    git branch --set-upstream-to=origin/<branch> topic',
      '',
    ]);
    expect(text(runLine(w, 'git pull origin'))).toEqual([
      "You asked to pull from the remote 'origin', but did not specify",
      'a branch. Because this is not the default configured remote',
      'for your current branch, you must specify a branch on the command line.',
    ]);
    const named = runLine(mate(w), 'git pull origin main');
    expect(named.exitCode).toBe(0);
    expect(runLine(w, 'git pull origin nope').exitCode).toBe(128);
    expect(text(runLine(w, 'git pull origin nope')).at(-1)).toBe("fatal: couldn't find remote ref nope");
    expect(text(runLine(w, 'git pull nope main'))[0]).toBe("fatal: 'nope' does not appear to be a git repository");
    expect(runLine(createNoRepo(), 'git pull').exitCode).toBe(128);
  });
  it('pull refuses a dirty tree for --rebase', () => {
    const w = run(diverged(), 'echo more >> notes.txt');
    const r = runLine(w, 'git pull --rebase');
    expect(r.exitCode).toBe(128);
    expect(text(r).slice(-2)).toEqual(['error: cannot pull with rebase: You have unstaged changes.', 'error: Please commit or stash them.']);
    const staged = run(diverged(), 'echo more >> notes.txt', 'git add notes.txt');
    expect(text(runLine(staged, 'git pull --rebase')).slice(-2)[0]).toBe('error: cannot pull with rebase: Your index contains uncommitted changes.');
  });
  it('pull refused during a merge', () => {
    const merging = runLine(conflicted(), 'git pull --no-rebase').world;
    expect(merging.repo!.op?.kind).toBe('merge');
    const r = runLine(merging, 'git pull');
    expect(r.exitCode).toBe(128);
    expect(text(r)).toEqual([
      'error: Pulling is not possible because you have unmerged files.',
      "hint: Fix them up in the work tree, and then use 'git add/rm <file>'",
      'hint: as appropriate to mark resolution and make a commit.',
      'fatal: Exiting because of an unresolved conflict.',
    ]);
    const resolved = run(merging, 'echo fixed > notes.txt', 'git add notes.txt');
    expect(text(runLine(resolved, 'git pull'))).toEqual([
      'error: You have not concluded your merge (MERGE_HEAD exists).',
      'hint: Please, commit your changes before merging.',
      'fatal: Exiting because of unfinished merge.',
    ]);
  });
  it('pull refused during a rebase', () => {
    const stopped = runLine(conflicted(), 'git pull --rebase').world;
    expect(stopped.repo!.op?.kind).toBe('rebase');
    expect(stopped.repo!.op!.conflicts).toEqual(['notes.txt']);
    const r = runLine(stopped, 'git pull');
    expect(r.exitCode).toBe(128);
    expect(text(r)[0]).toBe('error: Pulling is not possible because you have unmerged files.');
    expect(r.world.repo).toEqual(stopped.repo);
    const fixed = run(stopped, 'echo fixed > notes.txt', 'git add notes.txt');
    const r2 = runLine(fixed, 'git pull');
    expect(r2.exitCode).toBe(1);
    expect(text(r2)[0]).toBe('You are not currently on a branch.');
  });
  it('pull refused during a revert', () => {
    const w = local(cloned(), 'a.txt', 'a', 'Add a');
    const reverting = runLine(run(w, 'echo b > a.txt', 'git commit -am "Edit a"', 'echo c > a.txt', 'git commit -am "Edit a again"'), 'git revert HEAD~1').world;
    expect(reverting.repo!.op?.kind).toBe('revert');
    expect(text(runLine(reverting, 'git pull'))[0]).toBe('error: Pulling is not possible because you have unmerged files.');
    const r = runLine(run(reverting, 'echo fixed > a.txt', 'git add a.txt'), 'git pull');
    expect(r.exitCode).toBe(128);
    expect(text(r)[0]).toContain('while a revert is in progress');
  });
});

function createNoRepo(): World {
  return buildWorld({ config: { 'user.name': 'Sam', 'user.email': 's@x.com' } });
}
