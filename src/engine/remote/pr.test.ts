import type { RemoteSetup, World } from '../types';
import { buildWorld } from '../setup';
import { teammateComment, teammatePush } from './teammate';
import { TEAMMATE } from '../../lessons/sample';
import { addPrComment, behindBase, deleteRemoteBranch, mergePr, mergeState, openPr, prCommits, prFiles } from './pr';

const setup: RemoteSetup = {
  slug: 'team/notes',
  commits: [{ message: 'Add notes', files: { 'notes.txt': 'one\ntwo\nthree\n' } }],
};
const base = () => buildWorld({ remote: setup, config: { 'user.name': 'Sam Rivera', 'user.email': 'sam@example.com' } });
const push = (branch: string, message: string, files: Record<string, string | null>) =>
  teammatePush({ branch, message, files, author: TEAMMATE });
const input = { head: 'topic', base: 'main', title: 'Add topic', body: 'Body' };
const withTopic = (): World => push('topic', 'Edit notes', { 'notes.txt': 'one\nTWO\nthree\n', 'new.txt': 'n\n' })(base());
const opened = (): World => {
  const r = openPr(withTopic(), input);
  if (!r.ok) throw new Error(r.error);
  return r.world;
};

describe('openPr validations', () => {
  it('no remote', () => {
    const w = buildWorld({});
    expect(openPr(w, input)).toEqual({ ok: false, error: "There's no server for this lesson." });
  });
  it('head not pushed', () => {
    expect(openPr(base(), input)).toEqual({ ok: false, error: "Push **topic** first: the server doesn't have that branch yet." });
  });
  it('same branch', () => {
    expect(openPr(withTopic(), { ...input, head: 'main' })).toEqual({ ok: false, error: 'Pick two different branches.' });
  });
  it('no commits', () => {
    const w = push('topic', 'x', {})(base());
    // topic is one commit ahead of main, so make a branch equal to main instead
    const w2 = { ...w, remote: { ...w.remote!, branches: { ...w.remote!.branches, same: w.remote!.branches['main']! } } };
    expect(openPr(w2, { ...input, head: 'same' })).toEqual({ ok: false, error: "**same** has nothing that **main** doesn't already have." });
  });
  it('already open', () => {
    expect(openPr(opened(), input)).toEqual({ ok: false, error: 'A pull request for **topic** is already open (#1).' });
  });
  it('empty title', () => {
    expect(openPr(withTopic(), { ...input, title: '  ' })).toEqual({ ok: false, error: 'Give the pull request a title.' });
  });
});

describe('openPr', () => {
  it('logs activity and numbers from 1', () => {
    const r = openPr(withTopic(), input);
    expect(r).toMatchObject({ ok: true, number: 1 });
    if (!r.ok) return;
    const pr = r.world.remote!.prs[0]!;
    expect(pr).toMatchObject({ number: 1, title: 'Add topic', head: 'topic', base: 'main', author: 'Sam Rivera', state: 'open', comments: [] });
    expect(r.world.remote!.activity.at(-1)!.text).toBe('You opened pull request **#1**: Add topic');
    expect(r.world.remote!.activity.at(-1)!.who).toBe('you');
    const w2 = push('other', 'o', { 'o.txt': '1' })(r.world);
    const r2 = openPr(w2, { ...input, head: 'other' });
    expect(r2).toMatchObject({ ok: true, number: 2 });
  });
  it('author falls back to You', () => {
    const w = push('topic', 'e', { a: '1' })(buildWorld({ remote: setup }));
    const r = openPr(w, input);
    if (r.ok) expect(r.world.remote!.prs[0]!.author).toBe('You');
    else throw new Error(r.error);
  });
});

describe('prCommits and prFiles', () => {
  it('follow a new push with no PR call', () => {
    const w0 = opened();
    expect(prCommits(w0.remote!, w0.remote!.prs[0]!).map((c) => c.message)).toEqual(['Edit notes']);
    const w1 = push('topic', 'More', { 'extra.txt': 'e\n', 'new.txt': null })(w0);
    const pr = w1.remote!.prs[0]!;
    expect(prCommits(w1.remote!, pr).map((c) => c.message)).toEqual(['Edit notes', 'More']);
    const files = prFiles(w1.remote!, pr);
    expect(files.map((f) => [f.path, f.kind])).toEqual([
      ['extra.txt', 'new'],
      ['notes.txt', 'modified'],
    ]);
    expect(files[1]!.lines.some((l) => l.op === '+' && l.text === 'TWO')).toBe(true);
  });
  it('reports deleted files', () => {
    const w = push('topic', 'rm', { 'notes.txt': null })(base());
    const r = openPr(w, input);
    if (!r.ok) throw new Error(r.error);
    expect(prFiles(r.world.remote!, r.world.remote!.prs[0]!).map((f) => [f.path, f.kind])).toEqual([['notes.txt', 'deleted']]);
  });
});

describe('mergeState and behindBase', () => {
  it('clean, behind counts base commits', () => {
    const w = opened();
    expect(mergeState(w.remote!, w.remote!.prs[0]!)).toBe('clean');
    expect(behindBase(w.remote!, w.remote!.prs[0]!)).toBe(0);
    const w1 = push('main', 'Elsewhere', { 'other.txt': 'o\n' })(w);
    expect(behindBase(w1.remote!, w1.remote!.prs[0]!)).toBe(1);
    expect(mergeState(w1.remote!, w1.remote!.prs[0]!)).toBe('clean');
  });
  it('conflicts', () => {
    const w = push('main', 'Main edit', { 'notes.txt': 'one\nMAIN\nthree\n' })(opened());
    expect(mergeState(w.remote!, w.remote!.prs[0]!)).toBe('conflicts');
  });
});

describe('mergePr', () => {
  it('makes a 2-parent commit on base', () => {
    const w0 = opened();
    const r = mergePr(w0, 1);
    if (!r.ok) throw new Error(r.error);
    const remote = r.world.remote!;
    const pr = remote.prs[0]!;
    const baseTip = w0.remote!.branches['main']!;
    const headTip = w0.remote!.branches['topic']!;
    expect(pr.state).toBe('merged');
    expect(pr.headTip).toBe(headTip);
    expect(pr.mergeCommit).toBe(remote.branches['main']);
    const c = remote.commits[pr.mergeCommit!]!;
    expect(c.parents).toEqual([baseTip, headTip]);
    expect(c.message).toBe('Merge pull request #1 from topic\n\nAdd topic');
    expect(c.author).toEqual({ name: 'Sam Rivera', email: 'sam@example.com' });
    expect(c.tree['notes.txt']).toBe('one\nTWO\nthree\n');
    expect(c.tree['new.txt']).toBe('n\n');
    expect(remote.activity.at(-1)!.text).toBe('You merged **#1** into **main**');
    expect(mergeState(remote, pr)).toBe('merged');
    expect(prCommits(remote, pr).map((x) => x.message)).toEqual(['Edit notes']);
  });
  it('refuses conflicts and merged PRs', () => {
    const w = push('main', 'Main edit', { 'notes.txt': 'one\nMAIN\nthree\n' })(opened());
    const snap = JSON.parse(JSON.stringify(w.remote));
    expect(mergePr(w, 1)).toEqual({ ok: false, error: 'This pull request has conflicts. Update **topic** on your computer, then push.' });
    expect(w.remote).toEqual(snap);
    const merged = mergePr(opened(), 1);
    if (!merged.ok) throw new Error(merged.error);
    const before = JSON.parse(JSON.stringify(merged.world.remote));
    expect(mergePr(merged.world, 1)).toEqual({ ok: false, error: 'This pull request is already merged.' });
    expect(merged.world.remote).toEqual(before);
  });
  it('refuses when the head branch is gone and leaves the server alone', () => {
    const w = opened();
    const gone = { ...w, remote: { ...w.remote!, branches: { main: w.remote!.branches['main']! } } };
    const before = JSON.parse(JSON.stringify(gone.remote));
    expect(mergePr(gone, 1)).toEqual({ ok: false, error: '**topic** is no longer on the server.' });
    expect(gone.remote).toEqual(before);
    expect(() => mergeState(gone.remote!, gone.remote!.prs[0]!)).not.toThrow();
  });
});

describe('addPrComment', () => {
  it('logs approvals and comments', () => {
    const w = addPrComment(opened(), 1, { author: 'Alex Kim', body: 'LGTM', kind: 'approve' });
    expect(w.remote!.prs[0]!.comments).toHaveLength(1);
    expect(w.remote!.prs[0]!.comments[0]!.kind).toBe('approve');
    expect(w.remote!.activity.at(-1)).toMatchObject({ who: 'teammate', text: '**Alex Kim** approved **#1**' });
    const w2 = teammateComment({ pr: 1, body: 'Hmm', kind: 'comment', author: 'Alex Kim' })(w);
    expect(w2.remote!.activity.at(-1)!.text).toBe('**Alex Kim** commented on **#1**');
  });
});

describe('deleteRemoteBranch', () => {
  it('refuses default', () => {
    const w = base();
    const before = JSON.parse(JSON.stringify(w.remote));
    expect(deleteRemoteBranch(w, 'main')).toEqual({ ok: false, error: '**main** is the default branch.' });
    expect(w.remote).toEqual(before);
  });
  it('deletes others', () => {
    const r = deleteRemoteBranch(withTopic(), 'topic');
    if (!r.ok) throw new Error(r.error);
    expect(r.world.remote!.branches['topic']).toBeUndefined();
    expect(r.world.remote!.activity.at(-1)).toMatchObject({ who: 'you', text: 'You deleted branch **topic**' });
  });
});
