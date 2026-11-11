import type { WorldSetup } from '../../engine/types'
import { AGENDA, AGENDA_V2, IDENTITY, NOTES, NOTES_V2 } from '../sample'

/** Four commits; the last two draft and tidy `agenda.txt`. Shared by the reset and reflog lessons. */
export const AGENDA_HISTORY: WorldSetup = {
  cwd: 'project',
  config: IDENTITY,
  repo: {
    at: 'project',
    commits: [
      { message: 'Add meeting notes', files: { 'notes.txt': NOTES } },
      { message: 'Add the launch date', files: { 'notes.txt': NOTES_V2 } },
      { message: 'Draft the agenda', files: { 'agenda.txt': AGENDA } },
      { message: 'Tidy the agenda', files: { 'agenda.txt': AGENDA_V2 } },
    ],
  },
}
