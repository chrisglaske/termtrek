export type Tone = 'out' | 'muted' | 'error' | 'ok' | 'warn' | 'id';
export interface Span { text: string; tone?: Tone }
export type OutLine = Span[];
export interface Explain { kind: 'ok' | 'tip' | 'warn'; text: string } // `cmd` = pill, **x** = bold
export interface Commit { id: string; parents: string[]; tree: Record<string, string>; message: string; author: { name: string; email: string }; time: number }
export type Head = { kind: 'branch'; name: string } | { kind: 'detached'; id: string };
export interface ReflogEntry { id: string; message: string } // e.g. "commit (initial): Add notes"
export interface StashEntry { id: string; base: string; branch: string | null; message: string; index: Record<string, string>; work: Record<string, string> }
export interface RebaseState { branch: string; onto: string; ontoLabel: string; orig: string; todo: string[]; current: string | null; stoppedAt: string | null }
export interface RepoOp { kind: 'merge' | 'revert' | 'rebase'; theirs: string; theirsLabel: string; message: string; conflicts: string[]; rebase?: RebaseState }
export interface CommitEdit { amend: boolean; all: boolean }
export interface EditorSession { file: string; text: string; action: CommitEdit; merge?: boolean; rebase?: boolean } // file e.g. '.git/COMMIT_EDITMSG'
export interface Upstream { remote: string; branch: string }
export interface PrComment { author: string; body: string; kind: 'comment' | 'approve' | 'changes'; at: number }
export interface PullRequest { number: number; title: string; body: string; head: string; base: string; author: string; state: 'open' | 'merged'; comments: PrComment[]; openedAt: number; mergeCommit?: string; headTip?: string }
export interface Activity { seq: number; who: 'you' | 'teammate'; text: string } // text: **bold** and `cmd` allowed
export interface Remote { url: string; slug: string; commits: Record<string, Commit>; branches: Record<string, string>; defaultBranch: string; prs: PullRequest[]; activity: Activity[] }
export interface RemoteSetup { slug: string; commits?: { message: string; files: Record<string, string> }[]; author?: { name: string; email: string } }
export interface Repo { root: string; commits: Record<string, Commit>; branches: Record<string, string | null>; head: Head; index: Record<string, string>; reflog: ReflogEntry[]; stash: StashEntry[]; op: RepoOp | null; remotes: Record<string, string>; remoteRefs: Record<string, string>; upstream: Record<string, Upstream>; originHead: string | null }
export interface World { home: string; cwd: string; files: Record<string, string>; dirs: string[]; repo: Repo | null; config: Record<string, string>; seq: number; pending?: EditorSession; remote?: Remote }
export interface RunResult { world: World; lines: OutLine[]; explain?: Explain; clear?: boolean; open?: string; exitCode: number }
export interface WorldSetup {
  cwd?: string; // relative to home; default ''
  files?: Record<string, string>; // relative to home
  dirs?: string[]; // relative to home
  config?: Record<string, string>; // e.g. {'user.name': 'Sam'}
  run?: (string | ((w: World) => World))[]; // strings go through runLine, functions edit the world; applied in order after the static setup
  remote?: RemoteSetup; // the simulated server, built before `run`
  repo?: { at: string; branch?: string; commits?: { message: string; files: Record<string, string> }[]; staged?: Record<string, string> };
}
