import type { Commit, World, WorldSetup } from './types';
import { shortId } from './hash';

const HOME = '/home/you';

function join(base: string, rel: string): string {
  const parts = rel.split('/').filter((s) => s !== '' && s !== '.');
  return parts.length ? `${base}/${parts.join('/')}` : base;
}

/** Add `abs` and every parent below home (excluding / and /home). */
function addWithParents(set: Set<string>, abs: string): void {
  let cur = abs;
  while (cur.startsWith(HOME) && cur.length >= HOME.length) {
    set.add(cur);
    if (cur === HOME) break;
    cur = cur.slice(0, cur.lastIndexOf('/'));
  }
}

export function createWorld(setup: WorldSetup = {}): World {
  const files: Record<string, string> = {};
  const dirSet = new Set<string>([HOME]);
  const config = { ...(setup.config ?? {}) };
  let seq = 0;

  for (const rel of setup.dirs ?? []) addWithParents(dirSet, join(HOME, rel));

  let repo: World['repo'] = null;
  if (setup.repo) {
    const root = join(HOME, setup.repo.at);
    const branch = setup.repo.branch ?? 'main';
    addWithParents(dirSet, root);
    const writeFile = (relPath: string, content: string) => {
      const abs = join(root, relPath);
      files[abs] = content;
      addWithParents(dirSet, abs.slice(0, abs.lastIndexOf('/')));
    };
    const commits: Record<string, Commit> = {};
    const reflog: { id: string; message: string }[] = [];
    let tree: Record<string, string> = {};
    let parent: string | null = null;
    for (const c of setup.repo.commits ?? []) {
      tree = { ...tree, ...c.files };
      for (const [p, content] of Object.entries(c.files)) writeFile(p, content);
      seq += 1;
      const parents = parent ? [parent] : [];
      const id = shortId(parents.join(',') + JSON.stringify(tree) + c.message + seq);
      commits[id] = {
        id,
        parents,
        tree: { ...tree },
        message: c.message,
        author: { name: config['user.name'] ?? 'TermTrek', email: config['user.email'] ?? 'you@example.com' },
        time: seq,
      };
      reflog.unshift({ id, message: `commit${parent ? '' : ' (initial)'}: ${c.message}` });
      parent = id;
    }
    const index = { ...tree };
    for (const [p, content] of Object.entries(setup.repo.staged ?? {})) {
      index[p] = content;
      writeFile(p, content);
    }
    repo = {
      root,
      commits,
      branches: { [branch]: parent },
      head: { kind: 'branch', name: branch },
      index,
      reflog,
      stash: [],
      op: null,
      remotes: {},
      remoteRefs: {},
      upstream: {},
      originHead: null,
    };
  }

  // Setup files go last, so they can stand for unstaged edits on top of the commits.
  for (const [rel, content] of Object.entries(setup.files ?? {})) {
    const abs = join(HOME, rel);
    files[abs] = content;
    addWithParents(dirSet, abs.slice(0, abs.lastIndexOf('/')));
  }

  const cwd = join(HOME, setup.cwd ?? '');
  addWithParents(dirSet, cwd);

  return { home: HOME, cwd, files, dirs: [...dirSet].sort(), repo, config, seq };
}
