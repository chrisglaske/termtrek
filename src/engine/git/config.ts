import type { CommandFn } from '../registry';
import { err } from '../shell/fs';

export const gitConfig: CommandFn = (world, args) => {
  const rest = args.filter((a) => !['--global', '--local', '--system'].includes(a));
  const out = (t: string) => [{ text: t }];
  if (rest[0] === '--list' || rest[0] === '-l') {
    return { lines: Object.entries(world.config).map(([k, v]) => out(`${k}=${v}`)), exitCode: 0 };
  }
  if (rest[0] === '--unset') {
    const key = rest[1];
    if (!key) return { lines: [err('error: wrong number of arguments, should be 1')], exitCode: 129 };
    if (!(key in world.config)) return { lines: [], exitCode: 5 };
    const config = { ...world.config };
    delete config[key];
    return { world: { ...world, config }, lines: [], exitCode: 0 };
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
    const v = Object.prototype.hasOwnProperty.call(world.config, key) ? world.config[key] : undefined;
    return v === undefined ? { lines: [], exitCode: 1 } : { lines: [out(v)], exitCode: 0 };
  }
  const next = { ...world, config: { ...world.config, [key]: value } };
  if (key === 'user.name') {
    return { world: next, lines: [], explain: { kind: 'ok', text: `Saved. Git will sign your commits as **${value}**.` }, exitCode: 0 };
  }
  return { world: next, lines: [], exitCode: 0 };
};
