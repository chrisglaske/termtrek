import type { CommandFn } from '../registry';
import { out } from './fs';

export const pwd: CommandFn = (world) => ({ lines: [out(world.cwd)], exitCode: 0 });
