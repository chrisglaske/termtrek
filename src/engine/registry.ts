import type { RunResult, World } from './types';
import { git } from './git';
import { cat } from './shell/cat';
import { cd } from './shell/cd';
import { clear } from './shell/clear';
import { echo } from './shell/echo';
import { makeHelp } from './shell/help';
import { ls } from './shell/ls';
import { mkdir } from './shell/mkdir';
import { pwd } from './shell/pwd';
import { rm } from './shell/rm';
import { touch } from './shell/touch';

export type CommandFn = (
  world: World,
  args: string[],
  io: { stdin?: string },
) => Omit<RunResult, 'world'> & { world?: World };

export const registry: Record<string, CommandFn> = {
  pwd,
  ls,
  cd,
  mkdir,
  touch,
  cat,
  echo,
  rm,
  clear,
  help: makeHelp(() => Object.keys(registry)),
  git,
};
