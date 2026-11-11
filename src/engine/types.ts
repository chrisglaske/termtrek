export type Tone = 'out' | 'muted' | 'error' | 'ok' | 'warn' | 'id';
export interface Span { text: string; tone?: Tone }
export type OutLine = Span[];
export interface Explain { kind: 'ok' | 'tip' | 'warn'; text: string } // `cmd` = pill, **x** = bold
export interface Commit { id: string; parents: string[]; tree: Record<string, string>; message: string; author: { name: string; email: string }; time: number }
export type Head = { kind: 'branch'; name: string } | { kind: 'detached'; id: string };
export interface ReflogEntry { id: string; message: string } // e.g. "commit (initial): Add notes"
export interface Repo { root: string; commits: Record<string, Commit>; branches: Record<string, string | null>; head: Head; index: Record<string, string>; reflog: ReflogEntry[] }
export interface World { home: string; cwd: string; files: Record<string, string>; dirs: string[]; repo: Repo | null; config: Record<string, string>; seq: number }
export interface RunResult { world: World; lines: OutLine[]; explain?: Explain; clear?: boolean; exitCode: number }
export interface WorldSetup {
  cwd?: string; // relative to home; default ''
  files?: Record<string, string>; // relative to home
  dirs?: string[]; // relative to home
  config?: Record<string, string>; // e.g. {'user.name': 'Sam'}
  repo?: { at: string; branch?: string; commits?: { message: string; files: Record<string, string> }[]; staged?: Record<string, string> };
}
