import type { CommandFn } from '../registry';
import { err, out } from '../shell/fs';
import { gitAdd } from './add';
import { gitBranch } from './branch';
import { gitClone } from './clone';
import { gitCommit } from './commit';
import { gitConfig } from './config';
import { gitDiff } from './diff';
import { gitFetch } from './fetch';
import { gitInit } from './init';
import { gitLog } from './log';
import { gitMerge } from './merge';
import { gitPull } from './pull';
import { gitPush } from './push';
import { gitRebase } from './rebase';
import { gitReflog } from './reflog';
import { gitRemote } from './remote';
import { gitReset } from './reset';
import { gitRestore } from './restore';
import { gitRevert } from './revert';
import { gitStash } from './stash';
import { gitStatus } from './status';
import { gitCheckout, gitSwitch } from './switch';
import { activeRepo } from './repoState';

interface Sub { run: CommandFn; needsRepo: boolean }

const subs: Record<string, Sub> = {
  init: { run: gitInit, needsRepo: false },
  clone: { run: gitClone, needsRepo: false },
  config: { run: gitConfig, needsRepo: false },
  status: { run: gitStatus, needsRepo: true },
  add: { run: gitAdd, needsRepo: true },
  commit: { run: gitCommit, needsRepo: true },
  log: { run: gitLog, needsRepo: true },
  diff: { run: gitDiff, needsRepo: true },
  restore: { run: gitRestore, needsRepo: true },
  reset: { run: gitReset, needsRepo: true },
  reflog: { run: gitReflog, needsRepo: true },
  branch: { run: gitBranch, needsRepo: true },
  switch: { run: gitSwitch, needsRepo: true },
  checkout: { run: gitCheckout, needsRepo: true },
  merge: { run: gitMerge, needsRepo: true },
  rebase: { run: gitRebase, needsRepo: true },
  revert: { run: gitRevert, needsRepo: true },
  stash: { run: gitStash, needsRepo: true },
  remote: { run: gitRemote, needsRepo: true },
  fetch: { run: gitFetch, needsRepo: true },
  pull: { run: gitPull, needsRepo: true },
  push: { run: gitPush, needsRepo: true },
};

/** Single source of truth for known subcommands (used by did-you-mean and Tab). */
export const gitSubcommands = (): string[] => Object.keys(subs);

const USAGE = [
  'usage: git [-v | --version] [-h | --help] <command> [<args>]',
  '',
  'Commands available here:',
  '   init      Create an empty Git repository',
  '   clone     Clone a repository into a new directory',
  '   config    Get and set options',
  '   status    Show the working tree status',
  '   add       Add file contents to the index',
  '   commit    Record changes to the repository',
  '   log       Show commit logs',
  '   diff      Show changes between commits, index and working tree',
  '   restore   Restore working tree files',
  '   reset     Reset current HEAD to the specified state',
  '   reflog    Manage reflog information',
  '   branch    List, create, or delete branches',
  '   switch    Switch branches',
  '   checkout  Switch branches or restore working tree files',
  '   merge     Join two or more development histories together',
  '   rebase    Reapply commits on top of another base tip',
  '   revert    Revert some existing commits',
  '   stash     Stash the changes in a dirty working directory away',
  '   remote    Manage set of tracked repositories',
  '   fetch     Download objects and refs from another repository',
  '   pull      Fetch from and integrate with another repository',
  '   push      Update remote refs along with associated objects',
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
