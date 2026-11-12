import type { Commit, PrComment, PullRequest, Remote, World } from '../types';
import type { DiffLine } from '../diffLines';
import { lineDiff } from '../diffLines';
import { mergeTrees } from '../merge3';
import { shortId } from '../hash';
import { addActivity } from './model';

type Commits = Record<string, Commit>;

function reachable(commits: Commits, tip: string): Set<string> {
  const seen = new Set<string>();
  const stack = [tip];
  while (stack.length) {
    const id = stack.pop()!;
    const c = commits[id];
    if (seen.has(id) || !c) continue;
    seen.add(id);
    stack.push(...c.parents);
  }
  return seen;
}

function commonBase(commits: Commits, a: string, b: string): string | null {
  const other = reachable(commits, b);
  let best: string | null = null;
  for (const id of reachable(commits, a)) {
    if (!other.has(id)) continue;
    if (best === null || commits[id]!.time > commits[best]!.time || (commits[id]!.time === commits[best]!.time && id < best)) best = id;
  }
  return best;
}

/** The two tips a PR compares. A merged PR compares head against what base was before the merge. */
function tips(remote: Remote, pr: PullRequest): { baseTip: string | null; headTip: string | null } {
  if (pr.state === 'merged') {
    const merge = pr.mergeCommit ? remote.commits[pr.mergeCommit] : undefined;
    return { baseTip: merge?.parents[0] ?? null, headTip: pr.headTip ?? null };
  }
  return { baseTip: remote.branches[pr.base] ?? null, headTip: remote.branches[pr.head] ?? null };
}

/** The commits on head that aren't on base, oldest first. */
export function prCommits(remote: Remote, pr: PullRequest): Commit[] {
  const { baseTip, headTip } = tips(remote, pr);
  if (!headTip) return [];
  const onBase = baseTip ? reachable(remote.commits, baseTip) : new Set<string>();
  return [...reachable(remote.commits, headTip)]
    .filter((id) => !onBase.has(id))
    .map((id) => remote.commits[id]!)
    .sort((a, b) => a.time - b.time || (a.id < b.id ? -1 : 1));
}

const treeAt = (remote: Remote, id: string | null): Record<string, string> => (id ? (remote.commits[id]?.tree ?? {}) : {});

export function prFiles(remote: Remote, pr: PullRequest): { path: string; kind: 'new' | 'modified' | 'deleted'; lines: DiffLine[] }[] {
  const { baseTip, headTip } = tips(remote, pr);
  const mb = baseTip && headTip ? commonBase(remote.commits, baseTip, headTip) : null;
  const before = treeAt(remote, mb);
  const after = treeAt(remote, headTip);
  const out: { path: string; kind: 'new' | 'modified' | 'deleted'; lines: DiffLine[] }[] = [];
  for (const path of [...new Set([...Object.keys(before), ...Object.keys(after)])].sort()) {
    const a = before[path];
    const b = after[path];
    if (a === b) continue;
    out.push({ path, kind: a === undefined ? 'new' : b === undefined ? 'deleted' : 'modified', lines: lineDiff(a ?? '', b ?? '') });
  }
  return out;
}

export function mergeState(remote: Remote, pr: PullRequest): 'clean' | 'conflicts' | 'merged' {
  if (pr.state === 'merged') return 'merged';
  const { baseTip, headTip } = tips(remote, pr);
  if (!baseTip || !headTip) return 'clean';
  const mb = commonBase(remote.commits, baseTip, headTip);
  const r = mergeTrees(treeAt(remote, mb), treeAt(remote, baseTip), treeAt(remote, headTip), { ours: pr.base, theirs: pr.head });
  return r.conflicts.length ? 'conflicts' : 'clean';
}

/** Commits on base since the merge base. */
export function behindBase(remote: Remote, pr: PullRequest): number {
  const { baseTip, headTip } = tips(remote, pr);
  if (!baseTip || !headTip) return 0;
  const mb = commonBase(remote.commits, baseTip, headTip);
  const onMb = mb ? reachable(remote.commits, mb) : new Set<string>();
  return [...reachable(remote.commits, baseTip)].filter((id) => !onMb.has(id)).length;
}

const learner = (world: World) => world.config['user.name'] || 'You';

export function openPr(
  world: World,
  input: { head: string; base: string; title: string; body: string },
): { ok: true; world: World; number: number } | { ok: false; error: string } {
  const remote = world.remote;
  if (!remote) return { ok: false, error: "There's no server for this lesson." };
  const has = (b: string) => Object.prototype.hasOwnProperty.call(remote.branches, b);
  if (!has(input.head)) return { ok: false, error: `Push **${input.head}** first: the server doesn't have that branch yet.` };
  if (input.head === input.base) return { ok: false, error: 'Pick two different branches.' };
  if (!has(input.base)) return { ok: false, error: `Push **${input.base}** first: the server doesn't have that branch yet.` };
  const draft: PullRequest = { number: 0, title: input.title.trim(), body: input.body, head: input.head, base: input.base, author: learner(world), state: 'open', comments: [], openedAt: world.seq };
  if (prCommits(remote, draft).length === 0) return { ok: false, error: `**${input.head}** has nothing that **${input.base}** doesn't already have.` };
  const existing = remote.prs.find((p) => p.state === 'open' && p.head === input.head);
  if (existing) return { ok: false, error: `A pull request for **${input.head}** is already open (#${existing.number}).` };
  if (!draft.title) return { ok: false, error: 'Give the pull request a title.' };
  const number = remote.prs.reduce((m, p) => Math.max(m, p.number), 0) + 1;
  const seq = world.seq + 1;
  const pr = { ...draft, number, openedAt: seq };
  const next = addActivity({ ...remote, prs: [...remote.prs, pr] }, 'you', `You opened pull request **#${number}**: ${pr.title}`, seq);
  return { ok: true, world: { ...world, remote: next, seq }, number };
}

const VERBS: Record<PrComment['kind'], string> = { approve: 'approved', changes: 'requested changes on', comment: 'commented on' };

export function addPrComment(world: World, number: number, c: Omit<PrComment, 'at'>): World {
  const remote = world.remote;
  if (!remote || !remote.prs.some((p) => p.number === number)) return world;
  const seq = world.seq + 1;
  const prs = remote.prs.map((p) => (p.number === number ? { ...p, comments: [...p.comments, { ...c, at: seq }] } : p));
  const who = c.author === learner(world) ? 'you' : 'teammate';
  const next = addActivity({ ...remote, prs }, who, `**${c.author}** ${VERBS[c.kind]} **#${number}**`, seq);
  return { ...world, remote: next, seq };
}

export function mergePr(world: World, number: number): { ok: true; world: World } | { ok: false; error: string } {
  const remote = world.remote;
  const pr = remote?.prs.find((p) => p.number === number);
  if (!remote || !pr) return { ok: false, error: `There is no pull request #${number}.` };
  if (pr.state === 'merged') return { ok: false, error: 'This pull request is already merged.' };
  if (!Object.prototype.hasOwnProperty.call(remote.branches, pr.head)) return { ok: false, error: `**${pr.head}** is no longer on the server.` };
  if (mergeState(remote, pr) !== 'clean') return { ok: false, error: `This pull request has conflicts. Update **${pr.head}** on your computer, then push.` };
  const baseTip = remote.branches[pr.base]!;
  const headTip = remote.branches[pr.head]!;
  const mb = commonBase(remote.commits, baseTip, headTip);
  const tree = mergeTrees(treeAt(remote, mb), treeAt(remote, baseTip), treeAt(remote, headTip), { ours: pr.base, theirs: pr.head }).tree;
  const seq = world.seq + 1;
  const message = `Merge pull request #${number} from ${pr.head}\n\n${pr.title}`;
  const parents = [baseTip, headTip];
  const id = shortId(`remote,${parents.join(',')}${JSON.stringify(tree)}${message}${seq}`);
  const author = { name: learner(world), email: world.config['user.email'] || 'you@example.com' };
  const commit: Commit = { id, parents, tree, message, author, time: seq };
  const prs = remote.prs.map((p) => (p.number === number ? { ...p, state: 'merged' as const, mergeCommit: id, headTip } : p));
  const next = addActivity(
    { ...remote, commits: { ...remote.commits, [id]: commit }, branches: { ...remote.branches, [pr.base]: id }, prs },
    'you',
    `You merged **#${number}** into **${pr.base}**`,
    seq,
  );
  return { ok: true, world: { ...world, remote: next, seq } };
}

export function deleteRemoteBranch(world: World, name: string): { ok: true; world: World } | { ok: false; error: string } {
  const remote = world.remote;
  if (!remote) return { ok: false, error: "There's no server for this lesson." };
  if (name === remote.defaultBranch) return { ok: false, error: `**${name}** is the default branch.` };
  if (!Object.prototype.hasOwnProperty.call(remote.branches, name)) return { ok: false, error: `There is no branch **${name}** on the server.` };
  const branches = { ...remote.branches };
  delete branches[name];
  const seq = world.seq + 1;
  const next = addActivity({ ...remote, branches }, 'you', `You deleted branch **${name}**`, seq);
  return { ok: true, world: { ...world, remote: next, seq } };
}
