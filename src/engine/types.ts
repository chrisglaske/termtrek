export type Tone = 'out' | 'muted' | 'error' | 'ok' | 'warn' | 'id';
export interface Span { text: string; tone?: Tone }
export type OutLine = Span[];
export interface Explain { kind: 'ok' | 'tip' | 'warn'; text: string } // `cmd` = pill, **x** = bold
export interface Commit { id: string; parents: string[]; tree: Record<string, string>; message: string; author: { name: string; email: string }; time: number }
export type Head = { kind: 'branch'; name: string } | { kind: 'detached'; id: string };
export interface ReflogEntry { id: string; message: string } // e.g. "commit (initial): Add notes"
export interface StashEntry { id: string; base: string; branch: string | null; message: string; index: Record<string, string>; work: Record<string, string> }
export interface RepoOp { kind: 'merge' | 'revert'; theirs: string; theirsLabel: string; message: string; conflicts: string[] }
export interface CommitEdit { amend: boolean; all: boolean }
export interface EditorSession { file: string; text: string; action: CommitEdit; merge?: boolean } // file e.g. '.git/COMMIT_EDITMSG'
export interface Repo { root: string; commits: Record<string, Commit>; branches: Record<string, string | null>; head: Head; index: Record<string, string>; reflog: ReflogEntry[]; stash: StashEntry[]; op: RepoOp | null }
export interface World { home: string; cwd: string; files: Record<string, string>; dirs: string[]; repo: Repo | null; config: Record<string, string>; seq: number; pending?: EditorSession }
export interface RunResult { world: World; lines: OutLine[]; explain?: Explain; clear?: boolean; open?: string; exitCode: number }
export interface WorldSetup {
  cwd?: string; // relative to home; default ''
  files?: Record<string, string>; // relative to home
  dirs?: string[]; // relative to home
  config?: Record<string, string>; // e.g. {'user.name': 'Sam'}
  run?: string[]; // lines run through runLine after the static setup
  repo?: { at: string; branch?: string; commits?: { message: string; files: Record<string, string> }[]; staged?: Record<string, string> };
}
