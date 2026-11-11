import { buildWorld } from '../setup';
import { runLine } from '../interpreter';
import { teammatePush } from '../remote/teammate';
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
const ALEX = { name: 'Alex Kim', email: 'alex@example.com' };
const fresh = (r: RemoteSetup | null = remote): World => buildWorld({ config: { 'user.name': 'Sam', 'user.email': 's@x.com' }, remote: r ?? undefined });
const run = (w: World, ...lines: string[]) => lines.reduce((acc, l) => runLine(acc, l).world, w);
const cloned = (): World => run(fresh(), `git clone ${URL}`, 'cd notes');
const commit = (w: World, file: string, msg: string) => run(w, `echo ${msg} > ${file}`, 'git add .', `git commit -m "${msg}"`);
const mate = (w: World, message = 'Alex edit', branch = 'main') =>
  teammatePush({ branch, message, files: { 'alex.txt': message + '\n' }, author: ALEX })(w);
const hex = '[0-9a-f]{7}';

describe('git fetch', () => {
  it('fetch brings new commits and updates origin/main', () => {
    const w = mate(cloned());
    const localTip = w.repo!.branches.main;
    const old = w.repo!.remoteRefs['origin/main']!;
    const tip = w.remote!.branches.main!;
    const r = runLine(w, 'git fetch');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual(['From https://git.example.com/team/notes', `   ${old}..${tip}  main       -> origin/main`]);
    expect(r.world.repo!.remoteRefs['origin/main']).toBe(tip);
    expect(r.world.repo!.commits[tip]).toBeDefined();
    expect(r.world.repo!.branches.main).toBe(localTip);
    expect(r.world.files).toEqual(w.files);
    expect(r.explain!.text).toContain('did not change');
  });
  it('fetch announces new branches and forced updates', () => {
    let w = cloned();
    w = mate(w, 'topic work', 'feature');
    const r = runLine(w, 'git fetch origin');
    expect(text(r)).toEqual(['From https://git.example.com/team/notes', ' * [new branch]      feature    -> origin/feature']);
    const old = r.world.repo!.remoteRefs['origin/main']!;
    const rewound = r.world.repo!.commits[old]!.parents[0]!;
    const forced = { ...r.world, remote: { ...r.world.remote!, branches: { ...r.world.remote!.branches, main: rewound } } };
    const f = runLine(forced, 'git fetch');
    expect(text(f)).toEqual(['From https://git.example.com/team/notes', ` + ${old}...${rewound} main       -> origin/main  (forced update)`]);
  });
  it('fetch with nothing new is silent', () => {
    const w = cloned();
    const r = runLine(w, 'git fetch');
    expect([text(r), r.exitCode]).toEqual([[], 0]);
    expect(r.world.repo).toEqual(w.repo);
  });
  it('fetch --prune deletes gone refs', () => {
    let w = cloned();
    w = run(mate(w, 'x', 'feature'), 'git fetch');
    expect(w.repo!.remoteRefs['origin/feature']).toBeDefined();
    const branches = { ...w.remote!.branches };
    delete branches.feature;
    w = { ...w, remote: { ...w.remote!, branches } };
    const plain = runLine(w, 'git fetch');
    expect(text(plain)).toEqual([]);
    expect(plain.world.repo!.remoteRefs['origin/feature']).toBeDefined();
    const r = runLine(w, 'git fetch --prune');
    expect(text(r)).toEqual(['From https://git.example.com/team/notes', ' - [deleted]         (none)     -> origin/feature']);
    expect(r.world.repo!.remoteRefs['origin/feature']).toBeUndefined();
    expect(runLine(w, 'git fetch -p').world.repo!.remoteRefs).toEqual(r.world.repo!.remoteRefs);
  });
  it('fetch errors', () => {
    const noRemotes = runLine(run(fresh(), 'git init'), 'git fetch');
    expect([text(noRemotes), noRemotes.exitCode]).toEqual([['fatal: No remote repository specified.  Please, specify either a URL or a remote name from which new revisions should be fetched.'], 128]);
    const unknown = runLine(cloned(), 'git fetch upstream');
    expect([text(unknown), unknown.exitCode]).toEqual([
      [
        "fatal: 'upstream' does not appear to be a git repository",
        'fatal: Could not read from remote repository.',
        '',
        'Please make sure you have the correct access rights',
        'and the repository exists.',
      ],
      128,
    ]);
    const dead = runLine(run(cloned(), 'git remote add other https://git.example.com/team/nope.git'), 'git fetch other');
    expect([text(dead), dead.exitCode]).toEqual([['remote: Repository not found.', "fatal: repository 'https://git.example.com/team/nope.git/' not found"], 128]);
    expect(runLine(cloned(), 'git fetch -x').exitCode).toBe(129);
  });
});

describe('git push', () => {
  it('push errors', () => {
    const w = run(cloned(), 'git switch -c topic');
    const r = runLine(w, 'git push');
    expect(text(r)).toEqual([
      'fatal: The current branch topic has no upstream branch.',
      'To push the current branch and set the remote as upstream, use',
      '',
      '    git push --set-upstream origin topic',
      '',
      'To have this happen automatically for branches without a tracking',
      "upstream, see 'push.autoSetupRemote' in 'git help config'.",
      '',
    ]);
    expect(r.exitCode).toBe(128);
    expect(r.explain!.text).toContain('`git push -u origin topic`');
    const unknown = runLine(w, 'git push upstream');
    expect(text(unknown)[0]).toBe("fatal: 'upstream' does not appear to be a git repository");
    expect(unknown.exitCode).toBe(128);
    const none = runLine(run(fresh(), 'git init'), 'git push');
    expect(text(none).slice(0, 2)).toEqual(['fatal: No configured push destination.', 'Either specify the URL from the command-line or configure a remote repository using']);
    expect(text(none)).toContain('    git remote add <name> <url>');
    expect(none.exitCode).toBe(128);
    const missing = runLine(w, 'git push origin nope');
    expect([text(missing), missing.exitCode]).toEqual([["error: src refspec nope does not match any", `error: failed to push some refs to '${URL}'`], 1]);
  });
  it('push -u publishes a new branch', () => {
    const w = commit(run(cloned(), 'git switch -c topic'), 'a.txt', 'Topic work');
    const r = runLine(w, 'git push -u origin topic');
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual([
      'remote:',
      "remote: Open a pull request for 'topic' in the Remote tab.",
      'remote:',
      `To ${URL}`,
      ' * [new branch]      topic -> topic',
      "branch 'topic' set up to track 'origin/topic'.",
    ]);
    const tip = w.repo!.branches.topic!;
    expect(r.world.remote!.branches.topic).toBe(tip);
    expect(r.world.remote!.commits[tip]).toBeDefined();
    expect(r.world.repo!.remoteRefs['origin/topic']).toBe(tip);
    expect(r.world.repo!.upstream.topic).toEqual({ remote: 'origin', branch: 'topic' });
    expect(r.world.remote!.activity.at(-1)).toMatchObject({ who: 'you', text: 'You pushed 1 commit to **topic**' });
    const again = runLine(r.world, 'git push');
    expect(text(again)).toEqual(['Everything up-to-date']);
    expect(again.world.remote).toEqual(r.world.remote);
  });
  it('push to a default-branch name prints no pull request hint', () => {
    const w = commit(cloned(), 'a.txt', 'Two');
    const r = runLine(w, 'git push origin main');
    expect(text(r)[0]).toBe(`To ${URL}`);
    expect(text(r)).toHaveLength(2);
  });
  it('push fast-forward', () => {
    const w = commit(commit(cloned(), 'a.txt', 'One'), 'b.txt', 'Two');
    const old = w.repo!.remoteRefs['origin/main']!;
    const tip = w.repo!.branches.main!;
    const r = runLine(w, 'git push');
    expect(text(r)).toEqual([`To ${URL}`, `   ${old}..${tip}  main -> main`]);
    expect(r.world.remote!.branches.main).toBe(tip);
    expect(r.world.repo!.remoteRefs['origin/main']).toBe(tip);
    expect(r.world.remote!.activity.at(-1)!.text).toBe('You pushed 2 commits to **main**');
    expect(text(runLine(r.world, 'git status')).join('\n')).toContain("up to date with 'origin/main'");
  });
  it('rejected push leaves the remote unchanged', () => {
    // fetch first
    const behind = commit(mate(cloned()), 'a.txt', 'Mine');
    const ff = runLine(behind, 'git push');
    expect(ff.exitCode).toBe(1);
    expect(text(ff).slice(0, 3)).toEqual([`To ${URL}`, ' ! [rejected]        main -> main (fetch first)', `error: failed to push some refs to '${URL}'`]);
    expect(text(ff)[3]).toBe('hint: Updates were rejected because the remote contains work that you do not');
    expect(text(ff)).toHaveLength(8);
    expect(ff.explain!.text).toContain('`git pull`');
    expect(ff.world.remote).toEqual(behind.remote);
    expect(ff.world.repo).toEqual(behind.repo);
    // non-fast-forward
    const fetched = run(behind, 'git fetch');
    const nff = runLine(fetched, 'git push');
    expect(text(nff)[1]).toBe(' ! [rejected]        main -> main (non-fast-forward)');
    expect(text(nff)[3]).toBe('hint: Updates were rejected because the tip of your current branch is behind');
    expect(nff.exitCode).toBe(1);
    expect(nff.world.remote).toEqual(fetched.remote);
    // stale info
    const stale = mate(commit(cloned(), 'a.txt', 'Mine'), 'Alex again');
    const sl = runLine(stale, 'git push --force-with-lease');
    expect(text(sl)).toEqual([`To ${URL}`, ' ! [rejected]        main -> main (stale info)', `error: failed to push some refs to '${URL}'`]);
    expect(sl.exitCode).toBe(1);
    expect(sl.world.remote).toEqual(stale.remote);
    expect(sl.explain!.text).toContain('`git fetch`');
  });
  it('force-with-lease after fetch succeeds', () => {
    const w = run(commit(mate(cloned()), 'a.txt', 'Mine'), 'git fetch');
    const r = runLine(w, 'git push --force-with-lease');
    const old = w.remote!.branches.main!;
    const tip = w.repo!.branches.main!;
    expect(r.exitCode).toBe(0);
    expect(text(r)).toEqual([`To ${URL}`, ` + ${old}...${tip} main -> main (forced update)`]);
    expect(r.world.remote!.branches.main).toBe(tip);
    const f = runLine(w, 'git push -f');
    expect(f.exitCode).toBe(0);
    expect(f.world.remote!.branches.main).toBe(tip);
    const blind = runLine(commit(mate(cloned()), 'a.txt', 'Mine'), 'git push --force');
    expect(blind.exitCode).toBe(0);
  });
  it('push --delete', () => {
    const w = run(commit(run(cloned(), 'git switch -c topic'), 'a.txt', 'T'), 'git push -u origin topic');
    const r = runLine(w, 'git push origin --delete topic');
    expect([text(r), r.exitCode]).toEqual([[`To ${URL}`, ' - [deleted]         topic'], 0]);
    expect(r.world.remote!.branches.topic).toBeUndefined();
    expect(r.world.repo!.remoteRefs['origin/topic']).toBeUndefined();
    expect(r.world.repo!.branches.topic).toBeDefined();
    expect(text(runLine(r.world, 'git status')).join('\n')).toContain('the upstream is gone');
    const main = runLine(w, 'git push origin --delete main');
    expect([text(main), main.exitCode]).toEqual([
      ['remote: error: refusing to delete the current branch: refs/heads/main', `To ${URL}`, ' ! [remote rejected] main (deletion of the current branch prohibited)', `error: failed to push some refs to '${URL}'`],
      1,
    ]);
    expect(main.world.remote).toEqual(w.remote);
    expect(runLine(w, 'git push origin --delete nope').exitCode).toBe(1);
    expect(runLine(w, 'git push --delete').exitCode).toBe(128);
  });
});

describe('push activity', () => {
  it('a new branch at a commit the server has logs no commit count', () => {
    const r = runLine(run(cloned(), 'git switch -c topic'), 'git push -u origin topic');
    expect(r.exitCode).toBe(0);
    expect(r.world.remote!.activity.at(-1)!.text).toBe('You pushed **topic**');
  });
});

describe('status tracking lines', () => {
  const status = (w: World) => text(runLine(w, 'git status'));
  it('status compares against the last fetch', () => {
    const w = mate(cloned());
    expect(status(w).slice(0, 3)).toEqual(['On branch main', "Your branch is up to date with 'origin/main'.", '']);
    expect(status(w)[3]).toBe('nothing to commit, working tree clean');
    const f = run(w, 'git fetch');
    expect(status(f)).toEqual([
      'On branch main',
      "Your branch is behind 'origin/main' by 1 commit, and can be fast-forwarded.",
      '  (use "git pull" to update your local branch)',
      '',
      'nothing to commit, working tree clean',
    ]);
    expect(text(runLine(f, 'git status -sb'))[0]).toBe('## main...origin/main [behind 1]');
  });
  it('status ahead and diverged lines', () => {
    const ahead = commit(commit(cloned(), 'a.txt', 'One'), 'b.txt', 'Two');
    expect(status(ahead).slice(0, 4)).toEqual([
      'On branch main',
      "Your branch is ahead of 'origin/main' by 2 commits.",
      '  (use "git push" to publish your local commits)',
      '',
    ]);
    expect(text(runLine(ahead, 'git status -sb'))[0]).toBe('## main...origin/main [ahead 2]');
    const div = run(commit(mate(cloned()), 'a.txt', 'Mine'), 'git fetch');
    expect(status(div).slice(0, 5)).toEqual([
      'On branch main',
      "Your branch and 'origin/main' have diverged,",
      'and have 1 and 1 different commits each, respectively.',
      '  (use "git pull" if you want to integrate the remote branch with yours)',
      '',
    ]);
    expect(text(runLine(div, 'git status -sb'))[0]).toBe('## main...origin/main [ahead 1, behind 1]');
  });
  it('status with no upstream prints no tracking line', () => {
    const w = run(cloned(), 'git switch -c topic');
    expect(status(w)).toEqual(['On branch topic', 'nothing to commit, working tree clean']);
  });
  it('status upstream gone', () => {
    const w = cloned();
    const gone = { ...w, repo: { ...w.repo!, remoteRefs: {} } };
    expect(status(gone).slice(0, 4)).toEqual([
      'On branch main',
      "Your branch is based on 'origin/main', but the upstream is gone.",
      '  (use "git branch --unset-upstream" to fixup)',
      '',
    ]);
  });
  it('hex ids are 7 chars', () => {
    expect(runLine(commit(cloned(), 'a.txt', 'One'), 'git push').lines.map((l) => l.map((s) => s.text).join('')).join('\n')).toMatch(new RegExp(`${hex}\\.\\.${hex}`));
  });
});
