import type { CommandFn } from '../registry';
import type { OutLine, Upstream } from '../types';
import { err, out } from '../shell/fs';
import { findRemote, repoNotFound } from '../remote/host';
import { addActivity, copyReachable } from '../remote/model';
import { ancestors, isAncestor } from './refs';
import { activeRepo } from './repoState';
import { refRow, unknownRemote } from './fetch';
import { setUpstream, TRACK_LINE } from './tracking';

const has = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);
const muted = (text: string): OutLine => [{ text, tone: 'muted' }];
const blank: OutLine = [{ text: '' }];
const plural = (n: number, word: string): string => `${n} ${word}${n === 1 ? '' : 's'}`;

const NO_DESTINATION = [
  'fatal: No configured push destination.',
  'Either specify the URL from the command-line or configure a remote repository using',
  '',
  '    git remote add <name> <url>',
  '',
  'and then push using the remote name',
  '',
  '    git push <name>',
  '',
  'To push to multiple remotes at once, configure a remote group using',
  '',
  '    git config remotes.<groupname> "<remote1> <remote2>"',
  '',
  'and then push using the group name',
  '',
  '    git push <groupname>',
];

const noUpstream = (branch: string, remote: string): OutLine[] => [
  err(`fatal: The current branch ${branch} has no upstream branch.`),
  err('To push the current branch and set the remote as upstream, use'),
  blank,
  err(`    git push --set-upstream ${remote} ${branch}`),
  blank,
  err('To have this happen automatically for branches without a tracking'),
  err('upstream, see \'push.autoSetupRemote\' in \'git help config\'.'),
  blank,
];

const HINT_FETCH_FIRST = [
  'hint: Updates were rejected because the remote contains work that you do not',
  'hint: have locally. This is usually caused by another repository pushing to',
  'hint: the same ref. If you want to integrate the remote changes, use',
  'hint: \'git pull\' before pushing again.',
  'hint: See the \'Note about fast-forwards\' in \'git push --help\' for details.',
];
const HINT_NON_FF = [
  'hint: Updates were rejected because the tip of your current branch is behind',
  'hint: its remote counterpart. If you want to integrate the remote changes,',
  'hint: use \'git pull\' before pushing again.',
  'hint: See the \'Note about fast-forwards\' in \'git push --help\' for details.',
];

export const gitPush: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  let setUp = false;
  let force = false;
  let lease = false;
  let del = false;
  const pos: string[] = [];
  for (const a of args) {
    if (a === '-u' || a === '--set-upstream') setUp = true;
    else if (a === '-f' || a === '--force') force = true;
    else if (a === '--force-with-lease' || a.startsWith('--force-with-lease=')) lease = true;
    else if (a === '-d' || a === '--delete') del = true;
    else if (a.startsWith('-') && a.length > 1) {
      return { lines: [err(`error: unknown option \`${a.replace(/^-+/, '')}'`), err('usage: git push [<options>] [<repository> [<refspec>...]]')], exitCode: 129 };
    } else pos.push(a);
  }
  if (pos.length > 2) return { lines: [err('error: TermTrek pushes one branch at a time'), err('usage: git push [<options>] [<repository> [<refspec>...]]')], exitCode: 129 };

  const current = repo.head.kind === 'branch' ? repo.head.name : null;
  const currentUp: Upstream | null = current && has(repo.upstream, current) ? repo.upstream[current]! : null;

  // Pick the remote name and branch.
  let remoteName = pos[0];
  let branch = pos[1];
  if (remoteName === undefined) {
    const fallback = currentUp ? currentUp.remote : has(repo.remotes, 'origin') ? 'origin' : undefined;
    if (fallback === undefined) return { lines: NO_DESTINATION.map(err), exitCode: 128 };
    remoteName = fallback;
  }
  if (!has(repo.remotes, remoteName)) {
    if (remoteName.startsWith('https://')) return { lines: repoNotFound(remoteName), exitCode: 128 };
    return { lines: unknownRemote(remoteName), exitCode: 128 };
  }
  const url = repo.remotes[remoteName]!;
  let destBranch: string | undefined;
  if (branch === undefined) {
    if (del) return { lines: [err('fatal: --delete doesn\'t make sense without any refs')], exitCode: 128 };
    if (current === null) return { lines: [err('fatal: You are not currently on a branch.')], exitCode: 128 };
    branch = current;
    if (currentUp && currentUp.remote === remoteName) destBranch = currentUp.branch;
    else if (pos[0] === undefined && !setUp) return { lines: noUpstream(current, remoteName), explain: { kind: 'tip', text: `This branch is not linked to a branch on the server yet. \`git push -u ${remoteName} ${current}\` does the same thing in short, and remembers the link.` }, exitCode: 128 };
  } else if (branch === 'HEAD' && current !== null && !del) {
    branch = current;
  }
  const dest = destBranch ?? branch;

  const server = findRemote(world, url);
  if (!server) return { lines: repoNotFound(url), exitCode: 128 };
  const failed = err(`error: failed to push some refs to '${url}'`);

  if (del) {
    if (!has(server.branches, dest)) return { lines: [err(`error: unable to delete '${dest}': remote ref does not exist`), failed], exitCode: 1 };
    if (dest === server.defaultBranch) {
      return {
        lines: [err(`remote: error: refusing to delete the current branch: refs/heads/${dest}`), out(`To ${url}`), err(` ! [remote rejected] ${dest} (deletion of the current branch prohibited)`), failed],
        explain: { kind: 'warn', text: `The server refuses to delete **${dest}** because it is the branch everyone lands on by default. Delete a topic branch instead.` },
        exitCode: 1,
      };
    }
    const branches = { ...server.branches };
    delete branches[dest];
    const seq = world.seq + 1;
    const nextServer = addActivity({ ...server, branches }, 'you', `You deleted branch **${dest}**`, seq);
    const remoteRefs = { ...repo.remoteRefs };
    delete remoteRefs[`${remoteName}/${dest}`];
    return {
      world: { ...world, seq, remote: nextServer, repo: { ...repo, remoteRefs } },
      lines: [out(`To ${url}`), refRow('-', '[deleted]', dest)],
      explain: { kind: 'ok', text: `Deleted **${dest}** on the server. Your local **${dest}** branch, if you have one, is still there.` },
      exitCode: 0,
    };
  }

  const localTip = has(repo.branches, branch) ? repo.branches[branch] : null;
  if (!localTip) return { lines: [err(`error: src refspec ${branch} does not match any`), failed], exitCode: 1 };
  const serverTip = has(server.branches, dest) ? server.branches[dest]! : null;
  const trackRef = `${remoteName}/${dest}`;
  const upstream: Upstream = { remote: remoteName, branch: dest };

  const finish = (lines: OutLine[], explainText: string, world2 = world, repo2 = repo) => {
    const r = setUp ? setUpstream(repo2, branch!, upstream) : repo2;
    return {
      world: { ...world2, repo: r },
      lines: setUp ? [...lines, out(TRACK_LINE(branch!, upstream))] : lines,
      explain: { kind: 'ok' as const, text: explainText },
      exitCode: 0,
    };
  };

  if (serverTip === localTip) {
    const repo2 = { ...repo, remoteRefs: { ...repo.remoteRefs, [trackRef]: localTip } };
    return finish([out('Everything up-to-date')], 'The server already has everything on this branch, so there was nothing to send.', world, repo2);
  }

  // Rejections leave the server and the repo exactly as they were.
  const reject = (why: string, hints: string[], explain: string): ReturnType<CommandFn> => ({
    lines: [out(`To ${url}`), err(` ! [rejected]        ${branch} -> ${dest} (${why})`), failed, ...hints.map(muted)],
    explain: { kind: 'warn', text: explain },
    exitCode: 1,
  });
  let forced = false;
  if (serverTip !== null) {
    if (force) forced = !isAncestor(repo, serverTip, localTip);
    else if (lease) {
      const seen = has(repo.remoteRefs, trackRef) ? repo.remoteRefs[trackRef] : undefined;
      if (seen !== serverTip) {
        return reject('stale info', [], 'The server moved since you last fetched, so Git would not overwrite it blindly. Run `git fetch`, look at what changed, then push again.');
      }
      forced = !isAncestor(repo, serverTip, localTip);
    } else if (!has(repo.commits, serverTip)) {
      return reject('fetch first', HINT_FETCH_FIRST, 'The server has commits you do not have yet, so it refused your push. Run `git pull` to bring them in and combine them with yours, then push again.');
    } else if (!isAncestor(repo, serverTip, localTip)) {
      return reject('non-fast-forward', HINT_NON_FF, 'Your branch and the server have gone separate ways, so the push was refused to protect the server\'s history. Run `git pull` to combine them, then push again. Only if you rewrote history on purpose, use `git push --force-with-lease`.');
    }
  }

  const fresh = [...ancestors(repo, localTip)].filter((id) => !has(server.commits, id)).length;
  const seq = world.seq + 1;
  const nextServer = addActivity(
    { ...server, commits: copyReachable(repo.commits, server.commits, localTip), branches: { ...server.branches, [dest]: localTip } },
    'you',
    fresh === 0 ? `You pushed **${dest}**` : `You pushed ${plural(fresh, 'commit')} to **${dest}**`,
    seq,
  );
  const repo2 = { ...repo, remoteRefs: { ...repo.remoteRefs, [trackRef]: localTip } };
  const lines: OutLine[] = [];
  if (serverTip === null && dest !== server.defaultBranch) {
    lines.push(muted('remote:'), muted(`remote: Open a pull request for '${dest}' in the Remote tab.`), muted('remote:'));
  }
  lines.push(out(`To ${url}`));
  if (serverTip === null) lines.push(refRow('*', '[new branch]', `${branch} -> ${dest}`));
  else if (forced) lines.push(refRow('+', `${serverTip}...${localTip}`, `${branch} -> ${dest} (forced update)`));
  else lines.push(refRow(' ', `${serverTip}..${localTip}`, `${branch} -> ${dest}`));
  const tail = setUp ? ` Your local **${branch}** now tracks **${remoteName}/${dest}**, so a plain \`git push\` works next time.` : '';
  return finish(
    lines,
    `Sent ${plural(fresh, 'commit')} to **${remoteName}**; **${dest}** on the server now matches your branch.${tail}`,
    { ...world, seq, remote: nextServer },
    repo2,
  );
};
