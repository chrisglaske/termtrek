import type { CommandFn } from '../registry';
import { resolvePath } from '../paths';
import { err, insideHome, isDir, parentOf } from './fs';

const ALIAS_NOTE = ' Here `nano`, `vim` and `open` open the same editor; on your computer, `code` opens VS Code.';

/** `code <file>` opens the file in the editor tab. The aliases share one implementation. */
export const makeCode = (alias: boolean): CommandFn => (world, args) => {
  const arg = args.find((a) => !(a.length > 1 && a.startsWith('-')));
  if (arg === undefined) return { lines: [err('code: name a file to open, like `code notes.txt`')], exitCode: 1 };
  const abs = resolvePath(world, arg);
  if (isDir(world, abs)) return { lines: [err(`code: ${arg}: Is a directory`)], exitCode: 1 };
  if (!insideHome(world, abs)) return { lines: [err(`code: ${arg}: Permission denied`)], exitCode: 1 };
  if (!isDir(world, parentOf(abs))) return { lines: [err(`code: ${arg}: No such file or directory`)], exitCode: 1 };
  return {
    lines: [],
    open: abs,
    explain: { kind: 'tip', text: `Opened **${arg}** in the editor tab. Save with Ctrl+S (⌘S on Mac).${alias ? ALIAS_NOTE : ''}` },
    exitCode: 0,
  };
};
