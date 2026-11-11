import type { CommandFn } from '../registry';

export const clear: CommandFn = () => ({ lines: [], clear: true, exitCode: 0 });
