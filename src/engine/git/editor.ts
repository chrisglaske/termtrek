import type { CommitEdit, OutLine, RunResult, World } from '../types';
import { err } from '../shell/fs';
import { makeCommit, baseTree, commitIndex } from './commit';
import { concludeMerge } from './merge';
import { branchOf } from './refs';
import { activeRepo, headCommitId } from './repoState';
import { LABEL, relFromCwd } from './status';
import { continueWithMessage, rebaseStatusLines } from './rebase';

/** What Git prints while it waits for the commit-message editor. */
export const EDITOR_WAITING = 'hint: Waiting for your editor to close the file...';

/** Real Git erases the waiting hint once the editor closes, so the log leaves it out. */
export function withoutWaiting(lines: OutLine[]): OutLine[] {
  return lines.filter((l) => !(l.length === 1 && l[0]!.text === EDITOR_WAITING));
}

/** Git's comment block under the message, listing what will be committed. */
export function messageTemplate(world: World, first: string, edit: CommitEdit = { amend: false, all: false }): string {
  const repo = activeRepo(world);
  const lines = [
    first,
    '# Please enter the commit message for your changes. Lines starting',
    "# with '#' will be ignored, and an empty message aborts the commit.",
    '#',
  ];
  if (repo) {
    const branch = branchOf(repo);
    if (repo.op?.kind === 'rebase') lines.push(...rebaseStatusLines(repo, false).map((l) => `# ${l}`), '#');
    else lines.push(branch ? `# On branch ${branch}` : `# HEAD detached at ${headCommitId(repo) ?? ''}`);
    const base = baseTree(world, edit);
    const index = commitIndex(world, edit);
    const cwdRel = world.cwd === repo.root ? '' : world.cwd.slice(repo.root.length + 1);
    const paths = [...new Set([...Object.keys(base), ...Object.keys(index)])].sort();
    const changed = paths.filter((p) => base[p] !== index[p]);
    if (changed.length) {
      lines.push('# Changes to be committed:');
      for (const p of changed) {
        const kind = !(p in base) ? 'new' : !(p in index) ? 'deleted' : 'modified';
        lines.push(`#\t${LABEL[kind]}${relFromCwd(cwdRel, p)}`);
      }
      lines.push('#');
    }
  }
  return lines.join('\n') + '\n';
}

/** Git's comment block for the message of a merge started by `git merge`. */
export function mergeTemplate(first: string): string {
  return [
    first,
    '',
    '# Please enter a commit message to explain why this merge is necessary,',
    '# especially if it merges an updated upstream into a topic branch.',
    '#',
    "# Lines starting with '#' will be ignored, and an empty message aborts",
    '# the commit.',
    '',
  ].join('\n');
}

/** Close the commit-message editor: `null` means closed without saving. */
export function finishEditor(world: World, text: string | null): RunResult {
  const session = world.pending;
  const cleared: World = { ...world };
  delete cleared.pending;
  const message = text === null
    ? ''
    : text.split('\n').filter((l) => !l.startsWith('#')).map((l) => l.trimEnd()).join('\n').trim();
  if (message === '') {
    const op = activeRepo(world)?.op ?? null;
    if (session?.rebase) {
      return { world: cleared, lines: [err('Aborting commit due to empty commit message.'), err('error: could not commit staged changes.')], exitCode: 1 };
    }
    if (!op || op.kind === 'rebase') return { world: cleared, lines: [err('Aborting commit due to empty commit message.')], exitCode: 1 };
    if (op.kind === 'merge') {
      return { world: cleared, lines: [[{ text: "Not committing merge; use 'git commit' to complete the merge." }]], exitCode: 1 };
    }
    return {
      world: cleared,
      lines: [[{ text: 'Revert not committed. Finish with `git revert --continue`, or cancel with `git revert --abort`.', tone: 'muted' }]],
      exitCode: 1,
    };
  }
  if (session?.merge && activeRepo(cleared)?.op?.kind === 'merge') return concludeMerge(cleared, message);
  if (session?.rebase && activeRepo(cleared)?.op?.kind === 'rebase') return continueWithMessage(cleared, message, session.action);
  return makeCommit(cleared, message, session?.action ?? { amend: false, all: false });
}
