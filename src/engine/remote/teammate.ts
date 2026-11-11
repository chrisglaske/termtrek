import type { PrComment, World } from '../types';
import { shortId } from '../hash';
import { addActivity } from './model';
import { addPrComment } from './pr';

export interface TeammatePush {
  branch: string;
  message: string;
  files: Record<string, string | null>;
  author: { name: string; email: string };
}

/** A teammate pushes one commit to the server. `null` deletes a file. */
export function teammatePush(opts: TeammatePush): (w: World) => World {
  return (world) => {
    const remote = world.remote;
    if (!remote) return world;
    const seq = world.seq + 1;
    const has = Object.prototype.hasOwnProperty.call(remote.branches, opts.branch);
    const parent = (has ? remote.branches[opts.branch] : remote.branches[remote.defaultBranch]) ?? null;
    const tree: Record<string, string> = { ...(parent ? remote.commits[parent]?.tree : {}) };
    for (const [path, content] of Object.entries(opts.files)) {
      if (content === null) delete tree[path];
      else tree[path] = content;
    }
    const parents = parent ? [parent] : [];
    const id = shortId(`remote,${parents.join(',')}${JSON.stringify(tree)}${opts.message}${seq}`);
    const commit = { id, parents, tree, message: opts.message, author: { ...opts.author }, time: seq };
    const next = addActivity(
      { ...remote, commits: { ...remote.commits, [id]: commit }, branches: { ...remote.branches, [opts.branch]: id } },
      'teammate',
      `**${opts.author.name}** pushed 1 commit to **${opts.branch}**`,
      seq,
    );
    return { ...world, remote: next, seq };
  };
}

/** A teammate comments on, approves, or asks for changes on a pull request. */
export function teammateComment(opts: { pr: number; body: string; kind: PrComment['kind']; author: string }): (w: World) => World {
  return (world) => addPrComment(world, opts.pr, { author: opts.author, body: opts.body, kind: opts.kind });
}
