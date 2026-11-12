import type { CommandFn } from '../registry';
import { err, out } from '../shell/fs';
import { activeRepo } from './repoState';

const USAGE = [
  'usage: git remote [-v | --verbose]',
  '   or: git remote add [-t <branch>] [-m <master>] [-f] [--tags | --no-tags] [--mirror=<fetch|push>] <name> <url>',
  '   or: git remote remove <name>',
];
const usageErr = (head?: string) => ({ lines: [...(head ? [err(head)] : []), ...USAGE.map(err)], exitCode: 129 });

export const gitRemote: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  if (!repo) return { lines: [], exitCode: 128 };
  const verbose = args.filter((a) => a === '-v' || a === '--verbose');
  const rest = args.filter((a) => a !== '-v' && a !== '--verbose');
  const [sub, ...a] = rest;
  const names = Object.keys(repo.remotes).sort();

  if (sub === undefined) {
    if (verbose.length === 0) {
      return { lines: names.map(out), explain: names.length ? { kind: 'tip', text: 'These are the names of the servers this repo knows. Add `-v` to see their addresses.' } : undefined, exitCode: 0 };
    }
    return {
      lines: names.flatMap((n) => [out(`${n}\t${repo.remotes[n]} (fetch)`), out(`${n}\t${repo.remotes[n]} (push)`)]),
      explain: names.length ? { kind: 'tip', text: 'A **remote** is a nickname for a server address. **origin** is the usual name for the place you cloned from.' } : undefined,
      exitCode: 0,
    };
  }

  if (sub === 'add') {
    if (a.length !== 2) return usageErr('usage: git remote add [<options>] <name> <url>');
    const [name, url] = a as [string, string];
    if (Object.prototype.hasOwnProperty.call(repo.remotes, name)) return { lines: [err(`error: remote ${name} already exists.`)], exitCode: 3 };
    return {
      world: { ...world, repo: { ...repo, remotes: { ...repo.remotes, [name]: url } } },
      lines: [],
      explain: { kind: 'ok', text: `Saved **${name}** as a nickname for that address. Nothing was contacted yet, Git only wrote the name down.` },
      exitCode: 0,
    };
  }

  if (sub === 'remove' || sub === 'rm') {
    if (a.length !== 1) return usageErr('usage: git remote remove <name>');
    const name = a[0]!;
    if (!Object.prototype.hasOwnProperty.call(repo.remotes, name)) return { lines: [err(`error: No such remote: '${name}'`)], exitCode: 2 };
    const remotes = { ...repo.remotes };
    delete remotes[name];
    const remoteRefs = Object.fromEntries(Object.entries(repo.remoteRefs).filter(([k]) => !k.startsWith(name + '/')));
    const upstream = Object.fromEntries(Object.entries(repo.upstream).filter(([, u]) => u.remote !== name));
    return {
      world: { ...world, repo: { ...repo, remotes, remoteRefs, upstream, originHead: name === 'origin' ? null : repo.originHead } },
      lines: [],
      explain: { kind: 'ok', text: `Forgot the remote **${name}** and its remote-tracking branches. Your own branches and commits are untouched.` },
      exitCode: 0,
    };
  }

  return usageErr(`error: unknown subcommand: \`${sub}'`);
};
