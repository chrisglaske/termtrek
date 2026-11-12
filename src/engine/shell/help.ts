import type { CommandFn } from '../registry';
import { out } from './fs';

/** Built from a name list so adding a command to the registry updates `help` automatically. */
export function makeHelp(names: () => string[]): CommandFn {
  return () => {
    const list = names()
      .filter((n) => n !== 'help')
      .concat('help')
      .map((n) => '`' + n + '`')
      .join(', ');
    return {
      lines: [out('Commands available here: ' + names().sort().join(', '))],
      explain: { kind: 'tip', text: `You can use ${list} in this terminal.` },
      exitCode: 0,
    };
  };
}
