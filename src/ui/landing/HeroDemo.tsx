import { useState } from 'react'
import { createWorld } from '../../engine/world'
import { runLine } from '../../engine/interpreter'
import { complete } from '../../engine/suggest'
import { activeRepo, getStatus } from '../../engine/git/repoState'
import { branchOf as repoBranch, isAncestor } from '../../engine/git/refs'
import { finishEditor, withoutWaiting } from '../../engine/git/editor'
import { displayPath } from '../../engine/paths'
import type { Explain, Repo, World, WorldSetup } from '../../engine/types'
import { Terminal } from '../terminal/Terminal'
import type { TermEntry } from '../terminal/Terminal'
import { RepoMap } from '../repomap/RepoMap'

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

export function HeroDemo(): React.JSX.Element {
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
