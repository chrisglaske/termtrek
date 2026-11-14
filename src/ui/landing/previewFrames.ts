import { createWorld } from '../../engine/world'
import { runLine } from '../../engine/interpreter'
import { activeRepo } from '../../engine/git/repoState'
import { branchOf } from '../../engine/git/refs'
import { displayPath } from '../../engine/paths'
import type { World } from '../../engine/types'
import type { DoPage } from '../../lessons/schema'
import { firstCommit } from '../../lessons/foundations/first-commit'
import type { TermEntry } from '../terminal/Terminal'

/** The four parts of a lesson the landing preview walks through (0-based). */
export type PreviewStep = 0 | 1 | 2 | 3

export interface PreviewFrame {
  /** The world the picture is drawn from. */
  world: World
  /** The world the picture sees first, so a change made on this step gets its caption (and nothing else does). */
  from: World
  /** Commands already run on this step, as the terminal shows them. */
  entries: TermEntry[]
  /** What gets typed into the terminal on this step ('' when nothing is). */
  typed: string
  /** The command passed: the file is staged and the success line shows. */
  staged: boolean
  /** A slip was made: the engine's did-you-mean card shows. */
  hint: boolean
}

/** The real first-commit page the preview is drawn from: "Choose the file". */
export const STAGE_PAGE = firstCommit.pages!.find((p): p is DoPage => p.kind === 'do' && p.id === 'stage')!
export const STAGE_COMMAND = STAGE_PAGE.command.map((p) => p.text).join(' ')
const SLIP = 'status'

function ran(world: World, line: string): { world: World; entry: TermEntry } {
  const repo = activeRepo(world)
  const prompt = { cwd: displayPath(world, world.cwd), branch: repo ? branchOf(repo) : null }
  const r = runLine(world, line)
  // The page says the success itself, as the real lesson does.
  const explain = r.explain?.kind === 'ok' ? undefined : r.explain
  return { world: r.world, entry: { prompt, input: line, lines: r.lines, explain } }
}

/** One frame per step, played through the real engine from the lesson's own setup. */
export function previewFrames(): PreviewFrame[] {
  const start = createWorld(firstCommit.setup)
  const add = ran(start, STAGE_COMMAND)
  // The slip follows the staging, so the file stays in Staged while the card shows.
  const slip = ran(add.world, SLIP)
  return [
    { world: start, from: start, entries: [], typed: '', staged: false, hint: false },
    { world: start, from: start, entries: [], typed: STAGE_COMMAND, staged: false, hint: false },
    { world: add.world, from: start, entries: [add.entry], typed: '', staged: true, hint: false },
    { world: slip.world, from: add.world, entries: [slip.entry], typed: SLIP, staged: false, hint: true },
  ]
}
