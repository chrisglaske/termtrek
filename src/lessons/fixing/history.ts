import type { WorldSetup } from '../../engine/types'
import { AGENDA, AGENDA_V2, IDENTITY, NOTES, NOTES_V2 } from '../sample'

/** Four commits; the last two draft and tidy `agenda.txt`. Shared by the reset and reflog lessons. */
export const AGENDA_HISTORY: WorldSetup = {
  cwd: 'project',
  config: IDENTITY,
  repo: {
    at: 'project',
    commits: [
      { message: 'docs: add meeting notes', files: { 'notes.txt': NOTES } },
      { message: 'docs: add the launch date', files: { 'notes.txt': NOTES_V2 } },
      { message: 'docs: draft the agenda', files: { 'agenda.txt': AGENDA } },
      { message: 'docs: tidy the agenda', files: { 'agenda.txt': AGENDA_V2 } },
    ],
  },
}
