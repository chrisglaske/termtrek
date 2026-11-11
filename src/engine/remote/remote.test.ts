import type { RemoteSetup } from '../types';
import { createRemote, copyReachable, addActivity } from './model';
import { teammatePush } from './teammate';
import { findRemote, remoteUrl, fromUrl, repoNotFound, HOST } from './host';
import { buildWorld } from '../setup';
import { TEAMMATE } from '../../lessons/sample';

const setup: RemoteSetup = {
  slug: 'team/notes',
  commits: [
    { message: 'Add notes', files: { 'notes.txt': 'one\n' } },
    { message: 'Add readme', files: { 'README.md': '# hi\n' } },
  ],
};

describe('createRemote', () => {
  it('builds main from cumulative commits', () => {
    const { remote, seq } = createRemote(setup, 0);
    expect(remote.url).toBe('https://git.example.com/team/notes.git');
    expect(remote.slug).toBe('team/notes');
    expect(remote.defaultBranch).toBe('main');
    expect(seq).toBe(2);
    const tip = remote.commits[remote.branches['main']!]!;
    expect(tip.message).toBe('Add readme');
    expect(tip.tree).toEqual({ 'notes.txt': 'one\n', 'README.md': '# hi\n' });
    expect(tip.author).toEqual({ name: 'Alex Kim', email: 'alex@example.com' });
    expect(remote.commits[tip.parents[0]!]!.message).toBe('Add notes');
    expect(remote.prs).toEqual([]);
    expect(remote.activity).toEqual([]);
  });
  it('uses the setup author when given', () => {
    const { remote } = createRemote({ ...setup, author: { name: 'Pat', email: 'p@x.com' } }, 0);
    expect(Object.values(remote.commits)[0]!.author.name).toBe('Pat');
  });
  it('empty remote has no branches', () => {
    const { remote, seq } = createRemote({ slug: 'team/empty' }, 3);
    expect(remote.branches).toEqual({});
    expect(remote.commits).toEqual({});
    expect(seq).toBe(3);
  });
});

describe('model helpers', () => {
  it('copyReachable copies a tip and its ancestors only', () => {
    const { remote } = createRemote(setup, 0);
    const tip = remote.branches['main']!;
    const parent = remote.commits[tip]!.parents[0]!;
    expect(Object.keys(copyReachable(remote.commits, {}, parent))).toEqual([parent]);
    expect(Object.keys(copyReachable(remote.commits, {}, tip)).sort()).toEqual([tip, parent].sort());
  });
  it('addActivity appends', () => {
    const { remote } = createRemote(setup, 0);
    expect(addActivity(remote, 'you', 'hi', 9).activity).toEqual([{ seq: 9, who: 'you', text: 'hi' }]);
  });
});

describe('teammatePush', () => {
  const world = () => buildWorld({ remote: setup });
  it('adds a commit on top and logs activity', () => {
    const w0 = world();
    const w1 = teammatePush({ branch: 'main', message: 'Add agenda', files: { 'agenda.txt': 'x\n' }, author: TEAMMATE })(w0);
    const r = w1.remote!;
    const tip = r.commits[r.branches['main']!]!;
    expect(tip.message).toBe('Add agenda');
    expect(tip.parents).toEqual([w0.remote!.branches['main']]);
    expect(tip.tree['agenda.txt']).toBe('x\n');
    expect(tip.tree['notes.txt']).toBe('one\n');
    expect(w1.seq).toBe(w0.seq + 1);
    expect(r.activity.at(-1)).toEqual({ seq: w1.seq, who: 'teammate', text: '**Alex Kim** pushed 1 commit to **main**' });
  });
  it('starts a new branch from the default tip', () => {
    const w0 = world();
    const w1 = teammatePush({ branch: 'feature', message: 'f', files: { f: '1' }, author: TEAMMATE })(w0);
    expect(w1.remote!.commits[w1.remote!.branches['feature']!]!.parents).toEqual([w0.remote!.branches['main']]);
    expect(w1.remote!.branches['main']).toBe(w0.remote!.branches['main']);
  });
  it('with null deletes a file', () => {
    const w1 = teammatePush({ branch: 'main', message: 'rm', files: { 'notes.txt': null }, author: TEAMMATE })(world());
    const tip = w1.remote!.commits[w1.remote!.branches['main']!]!;
    expect(Object.keys(tip.tree)).toEqual(['README.md']);
  });
});

describe('host', () => {
  it('builds and parses urls', () => {
    expect(HOST).toBe('https://git.example.com');
    expect(remoteUrl('team/notes')).toBe('https://git.example.com/team/notes.git');
    expect(fromUrl('https://git.example.com/team/notes.git')).toBe('https://git.example.com/team/notes');
    expect(fromUrl('https://git.example.com/team/notes')).toBe('https://git.example.com/team/notes');
  });
  it('findRemote matches with and without .git', () => {
    const w = buildWorld({ remote: setup });
    for (const u of ['https://git.example.com/team/notes.git', 'https://git.example.com/team/notes', 'https://git.example.com/team/notes/', 'https://git.example.com/team/notes.git/']) {
      expect(findRemote(w, u)).toBe(w.remote);
    }
    expect(findRemote(w, 'https://git.example.com/team/other.git')).toBeNull();
    expect(findRemote(buildWorld({}), 'https://git.example.com/team/notes.git')).toBeNull();
  });
  it('repoNotFound prints the server wording', () => {
    const text = repoNotFound('https://git.example.com/x/y.git').map((l) => l.map((s) => s.text).join(''));
    expect(text).toEqual(['remote: Repository not found.', "fatal: repository 'https://git.example.com/x/y.git/' not found"]);
  });
});
