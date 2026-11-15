import type { CommandFn } from '../registry';
import type { World } from '../types';
import { err } from '../shell/fs';
import { activeRepo } from './repoState';

const has = (obj: object, key: string): boolean => Object.prototype.hasOwnProperty.call(obj, key);

/** A setting as Git sees it: the repository's own value wins over the one set for the whole computer. */
export function getConfig(world: World, key: string): string | undefined {
  const local = activeRepo(world)?.config;
  if (local && has(local, key)) return local[key];
  return has(world.config, key) ? world.config[key] : undefined;
}

export const gitConfig: CommandFn = (world, args) => {
  const repo = activeRepo(world);
  const global = args.includes('--global') || args.includes('--system');
  const local = args.includes('--local');
  const rest = args.filter((a) => !['--global', '--local', '--system'].includes(a));
  const out = (t: string) => [{ text: t }];
  const noRepo = { lines: [err(local ? 'fatal: --local can only be used inside a git repository' : 'fatal: not in a git directory')], exitCode: 128 };
  // Which store a read/write targets: the computer-wide one, or this repository's.
  const scope: 'global' | 'local' | null = global ? 'global' : local ? 'local' : repo ? 'local' : null;
  if (local && !repo) return noRepo;
  const store = (w: World, s: 'global' | 'local'): Record<string, string> => (s === 'global' ? w.config : w.repo!.config);
  const put = (s: 'global' | 'local', config: Record<string, string>): World =>
    s === 'global' ? { ...world, config } : { ...world, repo: { ...world.repo!, config } };

  if (rest[0] === '--list' || rest[0] === '-l') {
    const g = local ? [] : Object.entries(world.config);
    const l = global ? [] : Object.entries(repo?.config ?? {});
    return { lines: [...g, ...l].map(([k, v]) => out(`${k}=${v}`)), exitCode: 0 };
  }
  if (rest[0] === '--unset') {
    const key = rest[1];
    if (!key) return { lines: [err('error: wrong number of arguments, should be 1')], exitCode: 129 };
    if (scope === null) return noRepo;
    const cur = store(world, scope);
    if (!has(cur, key)) return { lines: [], exitCode: 5 };
    const config = { ...cur };
    delete config[key];
    return { world: put(scope, config), lines: [], exitCode: 0 };
  }
  const get = rest[0] === '--get';
  const pos = get ? rest.slice(1) : rest;
  if (pos.some((a) => a.startsWith('-'))) {
    return { lines: [err(`error: unknown option \`${pos.find((a) => a.startsWith('-'))!.replace(/^-+/, '')}'`)], exitCode: 129 };
  }
  const [key, value, extra] = pos;
  if (key === undefined || extra !== undefined) {
    return { lines: [err('usage: git config [<options>]')], exitCode: 129 };
  }
  if (!key.includes('.') || key.startsWith('.') || key.endsWith('.')) {
    return { lines: [err(`error: key does not contain a section: ${key}`)], exitCode: 1 };
  }
  if (value === undefined || get) {
    const v = global ? (has(world.config, key) ? world.config[key] : undefined) : local ? repo!.config[key] : getConfig(world, key);
    return v === undefined ? { lines: [], exitCode: 1 } : { lines: [out(v)], exitCode: 0 };
  }
  if (scope === null) return noRepo;
  const next = put(scope, { ...store(world, scope), [key]: value });
  if (key === 'user.name') {
    return { world: next, lines: [], explain: { kind: 'ok', text: `Saved. Git will sign your commits as **${value}**.` }, exitCode: 0 };
  }
  return { world: next, lines: [], exitCode: 0 };
};
