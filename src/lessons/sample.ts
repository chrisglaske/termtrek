// The small sample project the lessons start from.

export const IDENTITY = { 'user.name': 'Sam Rivera', 'user.email': 'sam@example.com' }

/** The teammate who pushes to the shared server. */
export const TEAMMATE = { name: 'Alex Kim', email: 'alex@example.com' }

export const NOTES = 'Team meeting, Monday\nPick a name for the new site.\nSam drafts the home page.\n'

export const NOTES_V2 = NOTES + 'We launch on Friday.\n'

/** `NOTES_V2` with a line pasted in by mistake. */
export const NOTES_JUNK = NOTES_V2 + 'asdf asdf (pasted by mistake)\n'

export const README = '# Team notes\nShared notes from our weekly meetings.\n'

export const README_V2 = README + 'Add a new file for each meeting, named by its date.\n'

export const AGENDA = 'Launch day agenda\n1. Check the home page\n2. Send the announcement\n'

export const AGENDA_V2 = 'Launch day agenda\n1. Check the home page on a phone\n2. Send the announcement\n3. Thank the team\n'

export const DRAFT = 'Ideas for the next meeting (not ready yet)\n- a team photo\n'
