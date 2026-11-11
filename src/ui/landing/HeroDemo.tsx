import { useState } from 'react'
import { createWorld } from '../../engine/world'
import { runLine } from '../../engine/interpreter'
import { complete } from '../../engine/suggest'
import { activeRepo, getStatus } from '../../engine/git/repoState'
import { displayPath } from '../../engine/paths'
import type { Explain, World, WorldSetup } from '../../engine/types'
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

function branchOf(world: World): string | null {
  const repo = activeRepo(world)
  return repo && repo.head.kind === 'branch' ? repo.head.name : null
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
  else c = ['git log --oneline', 'echo "more" >> notes.txt']
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
    setWorld(r.world)
    if (r.clear) {
      setEntries([])
      setIntro(false)
    } else setEntries((e) => [...e, { prompt, input: line, lines: r.lines, explain: r.explain }])
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
