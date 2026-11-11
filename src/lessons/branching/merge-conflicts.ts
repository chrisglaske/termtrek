import type { Lesson } from '../schema'
import { hasMarkers, mergeInProgress, onBranch, parentCount, ranGit, workFile } from '../checks'
import { NOTES } from '../sample'
import { LAUNCH_CONFLICT, mergeFromMain } from './setups'

const MARKERS = '**<<<<<<<**, **=======** and **>>>>>>>**'

export const mergeConflicts: Lesson = {
  id: 'merge-conflicts',
  section: 'branching',
  title: 'Resolve a merge conflict',
  level: 'Intermediate',
  minutes: 8,
  assumes: 'You can merge a branch and make a merge commit.',
  setup: LAUNCH_CONFLICT,
  steps: [
    {
      id: 'merge',
      title: 'Run into a conflict',
      learn:
        "Sometimes both branches change **the same line**. On **main**, `notes.txt` says \"We launch on Friday.\" On **launch-date**, someone changed that line to \"We launch on Thursday.\"\n\nGit can't know which one is right, so it stops and asks you. That's a **merge conflict**. It sounds scary, but it's just Git asking a question.\n\nRun `git merge launch-date` from **main** and read what Git says.",
      task: 'Merge launch-date into main.',
      hints: ['Stay on main and merge the other branch.', 'Type `git merge launch-date` and press Enter.'],
      solution: ['git merge launch-date'],
      check: (c) => mergeInProgress(c.world) && !!c.world.repo?.op?.conflicts.includes('notes.txt'),
      nudge: mergeFromMain('launch-date'),
      success:
        '**A conflict, as expected.** The merge is paused halfway. `git status` lists `notes.txt` under **Unmerged paths**: that\'s the file to fix.',
    },
    {
      id: 'resolve',
      title: 'Choose what to keep',
      learn:
        "Open the file in the editor tab with `code notes.txt`. `code` is the same command that opens a file in VS Code or Cursor on your own computer.\n\nGit wrote both versions into the file, between conflict markers:\n- **<<<<<<< HEAD** starts your side, what **main** has.\n- **=======** separates the two sides.\n- **>>>>>>> launch-date** ends the other branch's side.\n\nThe team agreed on Thursday. Click **Keep incoming** above the conflict to keep the **launch-date** side. **Keep current** keeps yours, and **Keep both** keeps both lines. You can also edit the text by hand: keep the line you want and delete the three marker lines. Then click **Save**.\n\nChanged your mind about the whole merge? `git merge --abort` puts everything back to how it was before.",
      task: 'Open `notes.txt`, keep the Thursday line, remove the markers and save.',
      hints: [
        'Open the file with `code`, then use the buttons above the conflict.',
        'Type `code notes.txt`, click **Keep incoming**, then click **Save**.',
      ],
      solution: ['code notes.txt'],
      solve: [
        { type: 'run', line: 'code notes.txt' },
        { type: 'save-file', path: '/home/you/project/notes.txt', text: NOTES + 'We launch on Thursday.\n' },
      ],
      check: (c) => {
        const text = workFile(c.world, 'notes.txt') ?? ''
        return mergeInProgress(c.world) && !hasMarkers(text) && text.includes('Thursday')
      },
      nudge: (c) => {
        const text = workFile(c.world, 'notes.txt') ?? ''
        const markers = hasMarkers(text)
        if (!mergeInProgress(c.world) && parentCount(c.world) === 2 && !markers && !text.includes('Thursday')) {
          return {
            kind: 'warn',
            text: 'That merge commit dropped the Thursday line: the team agreed on Thursday. Open the lesson menu (**…** at the top right) and choose **Reset this lesson** to try again.',
          }
        }
        if (!mergeInProgress(c.world) && parentCount(c.world) === 2 && markers) {
          return {
            kind: 'warn',
            text: `That merge commit still has the conflict markers (${MARKERS}) in \`notes.txt\`. Git doesn't check for them. Open the lesson menu (**…** at the top right) and choose **Reset this lesson** to try again.`,
          }
        }
        if (!mergeInProgress(c.world)) {
          return { kind: 'tip', text: 'The merge was cancelled. Run `git merge launch-date` again to get back to the conflict.' }
        }
        if (markers && (ranGit(c, 'add') || ranGit(c, 'commit'))) {
          return {
            kind: 'warn',
            text: `\`notes.txt\` still has the conflict markers (${MARKERS}). Git won't stop you from saving them, so fix the file first: open it with \`code notes.txt\`, choose what to keep and save.`,
          }
        }
        if (!markers && !text.includes('Thursday') && (ranGit(c, 'add') || ranGit(c, 'commit'))) {
          return {
            kind: 'tip',
            text: 'The team agreed on Thursday, so `notes.txt` should keep the "We launch on Thursday." line. Open it with `code notes.txt` and click **Keep incoming**, then **Save**.',
          }
        }
        return null
      },
      success: '**Conflict fixed in the file.** One line, Thursday, and no markers. Now tell Git it\'s fixed.',
    },
    {
      id: 'mark',
      title: 'Mark it fixed',
      learn:
        "Git is waiting for you to say the file is fixed. You do that by staging it: `git add notes.txt`. Run `git status` afterwards: it says **All conflicts fixed but you are still merging**.",
      task: 'Stage the fixed `notes.txt`.',
      hints: ['Staging is how you tell Git a conflict is fixed.', 'Type `git add notes.txt` and press Enter.'],
      solution: ['git add notes.txt'],
      check: (c) => mergeInProgress(c.world) && c.world.repo?.op?.conflicts.length === 0,
      success: '**Marked as fixed.** One step left: finish the merge with a commit.',
    },
    {
      id: 'commit',
      title: 'Finish the merge',
      learn:
        "Run `git commit` to make the merge commit. Git suggests the message \"Merge branch 'launch-date'\" in the editor tab: click **Save and close**.\n\n`git commit --no-edit` keeps the suggested message without opening the editor.",
      task: 'Commit to finish the merge.',
      hints: ['Use `git commit` and keep the suggested message.', 'Type `git commit`, then click **Save and close**.'],
      solution: ['git commit'],
      solve: [
        { type: 'run', line: 'git commit' },
        { type: 'editor-done' },
      ],
      check: (c) => onBranch(c.world, 'main') && parentCount(c.world) === 2 && !mergeInProgress(c.world),
      success:
        "**Merged.** In **Your repo**, the two lines join at a merge commit, and `notes.txt` says Thursday. Conflicts are a normal part of working together: read the markers, choose, stage, commit.",
    },
  ],
}
