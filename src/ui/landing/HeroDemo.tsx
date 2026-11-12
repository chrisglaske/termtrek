import { useEffect, useMemo, useState } from 'react'
import { createWorld } from '../../engine/world'
import { runLine } from '../../engine/interpreter'
import { complete } from '../../engine/suggest'
import { activeRepo, getStatus } from '../../engine/git/repoState'
import { branchOf as repoBranch, isAncestor } from '../../engine/git/refs'
import { finishEditor, withoutWaiting } from '../../engine/git/editor'
import { displayPath } from '../../engine/paths'
import type { Explain, OutLine, Repo, World, WorldSetup } from '../../engine/types'
import { Terminal } from '../terminal/Terminal'
import type { TermEntry } from '../terminal/Terminal'
import { RepoGraph, RepoMap, ariaSummary, graphBox } from '../repomap/RepoMap'

const README = '# My project\nA small project for trying out Git.\n'
const NOTES = 'Ideas for the project\n- Pick a name\n'

export const DEMO_SETUP: WorldSetup = {
  cwd: 'my-project',
  files: { 'my-project/notes.txt': NOTES + '- Write the first page\n' },
  config: { 'user.name': 'You', 'user.email': 'you@example.com' },
  repo: { at: 'my-project', commits: [{ message: 'Start project', files: { 'README.md': README, 'notes.txt': NOTES } }] },
}

const INTRO: Explain = {
  kind: 'tip',
  text: "This is a practice repo. **notes.txt** has changes that aren't saved yet. Start with `git status`, or tap a command below.",
}

const OPEN_TIP: Explain = { kind: 'tip', text: 'The editor opens inside lessons. Here, try `git status`.' }
const MESSAGE_TIP: Explain = {
  kind: 'tip',
  text: 'This demo has no editor, so the commit was cancelled. Put the message in the command instead, like `git commit -m "Update notes"`.',
}

function branchOf(world: World): string | null {
  const repo = activeRepo(world)
  return repo ? repoBranch(repo) : null
}

/** Clean tree: walk the learner through a branch, a commit on it, and a merge. */
function branchTour(repo: Repo | null): string[] {
  const names = repo ? Object.keys(repo.branches) : []
  const main = repo?.branches.main
  const other = names.find((n) => n !== 'main')
  const here = repo ? repoBranch(repo) : null
  if (!repo || !main) return ['git log --oneline', 'echo "more" >> notes.txt']
  if (!other) return here === 'main' ? ['git switch -c new-idea', 'git log --oneline'] : ['git log --oneline', 'echo "more" >> notes.txt']
  const tip = repo.branches[other]
  if (here === other) return tip === main ? ['echo "- Try a dark theme" >> notes.txt', 'git status'] : ['git switch main', 'git log --oneline']
  if (here === 'main' && tip) {
    return isAncestor(repo, tip, main) ? ['git log --oneline --all', `git branch -d ${other}`] : [`git merge ${other}`, 'git log --oneline --all']
  }
  return ['git log --oneline', 'git status']
}

/** The next sensible commands for the demo repo, following the mockup's chips(). */
export function demoSuggestions(world: World): string[] {
  const s = getStatus(world)
  if (!s) return ['help']
  const changed = [...s.unstaged.map((c) => c.path), ...s.untracked]
  const first = s.staged[0]
  let c: string[]
  if (changed.length) c = ['git status', 'git diff', `git add ${changed[0]}`]
  else if (first) c = [`git commit -m "${first.kind === 'new' ? 'Add' : 'Update'} ${first.path}"`, 'git status']
  else c = branchTour(activeRepo(world))
  return [...c, 'help']
}

/** The practice repo the hero map plays through: two commits on main, ready to branch. */
export const TOUR_SETUP: WorldSetup = {
  cwd: 'my-project',
  config: { 'user.name': 'You', 'user.email': 'you@example.com' },
  repo: {
    at: 'my-project',
    commits: [
      { message: 'Start project', files: { 'README.md': README, 'notes.txt': NOTES } },
      { message: 'Plan the homepage', files: { 'notes.txt': NOTES + '- Build a homepage\n' } },
    ],
  },
}

/** Each step: an optional quiet file edit, then the Git command the map shows. */
const TOUR: { edit?: string; cmd: string }[] = [
  { cmd: 'git switch -c homepage' },
  { edit: 'echo "## Welcome" >> README.md', cmd: 'git commit -am "Add a welcome line"' },
  { edit: 'echo "See notes.txt for ideas." >> README.md', cmd: 'git commit -am "Link to the notes"' },
  { cmd: 'git switch main' },
  { edit: 'echo "- Pick a font" >> notes.txt', cmd: 'git commit -am "Add a to-do"' },
  { cmd: 'git merge homepage' },
]

export interface TourFrame { world: World; prompt: { cwd: string; branch: string | null }; cmd: string; out: string[] }

const textOf = (lines: OutLine[]): string[] => lines.map((l) => l.map((s) => s.text).join('')).filter((t) => t.trim() !== '')

/** Runs the tour through the real engine. Git's editor for the merge message closes with its default text. */
export function tourFrames(): TourFrame[] {
  let world = createWorld(TOUR_SETUP)
  return TOUR.map(({ edit, cmd }) => {
    if (edit) world = runLine(world, edit).world
    const prompt = { cwd: displayPath(world, world.cwd), branch: branchOf(world) }
    const r = runLine(world, cmd)
    let next = r.world
    let lines = r.lines
    if (next.pending) {
      const done = finishEditor(next, next.pending.text)
      next = done.world
      lines = [...withoutWaiting(lines), ...done.lines]
    }
    world = next
    return { world, prompt, cmd, out: textOf(lines).slice(0, 2) }
  })
}

/** Typing speed, and how long a finished command stays up before the next one. */
export const TYPE_MS = 70
const READ_MS = 2600
const HOLD_MS = 5200

function matches(query: string): boolean {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia(query).matches
}

/** True while the screen is phone-narrow, so the map can tighten its spacing. */
function useNarrow(): boolean {
  const query = '(max-width: 560px)'
  const [narrow, setNarrow] = useState(() => matches(query))
  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const mq = window.matchMedia(query)
    const on = () => setNarrow(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return narrow
}

/** The hero's live repo map: the real engine plays a branch and a merge, one command at a time. */
function HeroMap({ onTry }: { onTry: () => void }): React.JSX.Element {
  const frames = useMemo(tourFrames, [])
  const last = frames.length - 1
  // With reduced motion the map starts on the finished merge and only moves when asked to.
  const [still] = useState(() => matches('(prefers-reduced-motion: reduce)'))
  const [step, setStep] = useState(still ? last : 0)
  const [playing, setPlaying] = useState(!still)
  const narrow = useNarrow()
  const gap = narrow ? 40 : 60
  const box = useMemo(() => graphBox(frames.map((f) => f.world.repo as Repo), gap), [frames, gap])
  const frame = frames[step] as TourFrame
  const repo = frame.world.repo as Repo

  useEffect(() => {
    if (!playing) return
    const t = window.setTimeout(() => setStep((i) => (i >= last ? 0 : i + 1)), step >= last ? HOLD_MS : READ_MS + frame.cmd.length * TYPE_MS)
    return () => window.clearTimeout(t)
  }, [playing, step, last, frame.cmd])

  const label = `Commit graph of a practice repo, redrawn after each command. Last command: ${frame.cmd}. ${ariaSummary(repo)}`

  return (
    <section className="hero-map" aria-labelledby="hero-map-title" style={{ '--type': `${frame.cmd.length * TYPE_MS}ms` } as React.CSSProperties}>
      <div className="hero-map-bar">
        <h2 id="hero-map-title">Your repo</h2>
        <span className="hero-map-live">
          <i aria-hidden="true" />
          updates live
        </span>
        <button type="button" className="hero-map-play" aria-label={playing ? 'Pause the demo' : 'Play the demo'} onClick={() => setPlaying((p) => !p)}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            {playing ? <path d="M2 1h2v8H2zM6 1h2v8H6z" fill="currentColor" /> : <path d="M2 1l7 4-7 4z" fill="currentColor" />}
          </svg>
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
      <div className="hero-map-graph">
        <RepoGraph repo={repo} gap={gap} box={box} label={label} ids={!narrow} />
      </div>
      <div className="hero-map-cmd" aria-hidden="true">
        <div key={step} className="hero-map-line">
          <div>
            <span className="p">{frame.prompt.cwd}</span>
            {frame.prompt.branch && <span className="b"> ({frame.prompt.branch})</span>}
            <span className="d"> $ </span>
            <span className="c" style={{ '--n': frame.cmd.length } as React.CSSProperties}>{frame.cmd}</span>
          </div>
          {frame.out.map((t, i) => (
            <div key={i} className="o">{t}</div>
          ))}
        </div>
        <ol className="hero-map-steps">
          {frames.map((f, i) => (
            <li key={f.cmd} className={i === step ? 'on' : i < step ? 'done' : undefined} />
          ))}
        </ol>
      </div>
      <div className="hero-map-foot">
        <p>The real Git engine, running in your browser.</p>
        <button type="button" className="btn btn-s btn-sm" onClick={onTry}>
          Try it yourself
        </button>
      </div>
    </section>
  )
}

/** The interactive practice terminal, with the full repo map beside it. */
function TryDemo({ onBack }: { onBack: () => void }): React.JSX.Element {
  const [world, setWorld] = useState(() => createWorld(DEMO_SETUP))
  const [entries, setEntries] = useState<TermEntry[]>([])
  const [intro, setIntro] = useState(true)
  const cwd = displayPath(world, world.cwd)

  const onRun = (line: string) => {
    const prompt = { cwd, branch: branchOf(world) }
    const r = runLine(world, line)
    let { world: next, lines, explain } = r
    if (r.open) explain = OPEN_TIP
    // No editor here: close Git's message editor straight away, which cancels the commit.
    if (next.pending) {
      const done = finishEditor(next, null)
      next = done.world
      lines = [...withoutWaiting(lines), ...done.lines]
      explain = MESSAGE_TIP
    }
    setWorld(next)
    if (r.clear) {
      setEntries([])
      setIntro(false)
    } else setEntries((e) => [...e, { prompt, input: line, lines, explain }])
  }

  return (
    <section className="demo" aria-label="Try Git right here">
      <div className="demo-term">
        <div className="demo-bar" aria-hidden="true">
          <i />
          <i />
          <i />
          <span>{cwd}</span>
          <em>Practice repo</em>
          <button type="button" className="demo-back" onClick={onBack}>
            Back to the tour
          </button>
        </div>
        <Terminal
          entries={entries}
          cwdLabel={cwd}
          branch={branchOf(world)}
          onRun={onRun}
          onComplete={(line) => complete(world, line)}
          suggestions={demoSuggestions(world)}
          intro={intro ? INTRO : undefined}
          title={`${cwd} — practice repo`}
          autoFocus
        />
      </div>
      <div className="demo-map">
        <h2>
          Your repo <span>updates live</span>
        </h2>
        <RepoMap world={world} />
      </div>
    </section>
  )
}

/** The landing hero's right side: the live repo map, and the practice terminal one click away. */
export function HeroDemo(): React.JSX.Element {
  const [trying, setTrying] = useState(false)
  return trying ? <TryDemo onBack={() => setTrying(false)} /> : <HeroMap onTry={() => setTrying(true)} />
}
