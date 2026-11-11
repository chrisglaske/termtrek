import type { CommandFn } from '../registry';
import { out } from './fs';

export const echo: CommandFn = (_world, args) => ({ lines: [out(args.join(' '))], exitCode: 0 });
