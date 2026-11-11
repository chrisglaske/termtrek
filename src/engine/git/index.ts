import type { CommandFn } from '../registry';
import { err, out } from '../shell/fs';
import { gitAdd } from './add';
import { gitCommit } from './commit';
import { gitConfig } from './config';
import { gitDiff } from './diff';
import { gitInit } from './init';
import { gitLog } from './log';
import { gitStatus } from './status';
import { activeRepo } from './repoState';

interface Sub { run: CommandFn; needsRepo: boolean }

const subs: Record<string, Sub> = {
  init: { run: gitInit, needsRepo: false },
  config: { run: gitConfig, needsRepo: false },
  status: { run: gitStatus, needsRepo: true },
  add: { run: gitAdd, needsRepo: true },
  commit: { run: gitCommit, needsRepo: true },
  log: { run: gitLog, needsRepo: true },
  diff: { run: gitDiff, needsRepo: true },
};

/** Single source of truth for known subcommands (used by did-you-mean and Tab). */
export const gitSubcommands = (): string[] => Object.keys(subs);

const USAGE = [
  'usage: git [-v | --version] [-h | --help] <command> [<args>]',
  '',
  'Commands available here:',
  '   init      Create an empty Git repository',
  '   config    Get and set options',
  '   status    Show the working tree status',
  '   add       Add file contents to the index',
  '   commit    Record changes to the repository',
  '   log       Show commit logs',
  '   diff      Show changes between commits, index and working tree',
];

export const git: CommandFn = (world, args, io) => {
  const [name, ...rest] = args;
  if (name === undefined || name === '--help' || name === '-h' || name === 'help') {
    return { lines: USAGE.map(out), exitCode: name === undefined ? 1 : 0 };
  }
  if (name === '--version' || name === '-v' || name === 'version') return { lines: [out('git version 2.47.0')], exitCode: 0 };
  const sub = Object.prototype.hasOwnProperty.call(subs, name) ? subs[name] : undefined;
  if (!sub) return { lines: [err(`git: '${name}' is not a git command. See 'git --help'.`)], exitCode: 1 };
  if (sub.needsRepo && !activeRepo(world)) {
    return { lines: [err('fatal: not a git repository (or any of the parent directories): .git')], exitCode: 128 };
  }
  return sub.run(world, rest, io);
};
