import type { Lesson } from '../schema'
import { inRepo, ranGit } from '../checks'
import { IDENTITY } from '../sample'
import { NOTES_URL, SERVER } from './setups'

export const cloneARepo: Lesson = {
  id: 'clone-a-repo',
  section: 'team',
  title: 'Copy a project from the server',
  level: 'Beginner',
  minutes: 5,
  assumes: 'You can make commits and read the history.',
  setup: { config: IDENTITY, remote: SERVER },
  steps: [
    {
      id: 'clone',
      title: 'Clone the project',
      learn:
        `So far your repo lived only on your computer. Teams keep a shared copy on a server. Git calls a copy of your repo on another computer a **remote**. Open the **Remote** tab to see the one on the server: its branches and commits.\n\nTo get your own copy, run \`git clone ${NOTES_URL}\`.\n- \`clone\` downloads the whole repo, history included.\n- The address says where it lives. Git makes a folder named \`notes\` for it.`,
      task: 'Clone the notes project from the server.',
      hints: ['Use `git clone` followed by the address.', `Type \`git clone ${NOTES_URL}\` and press Enter.`],
      solution: [`git clone ${NOTES_URL}`],
      check: (c) => !!c.world.repo?.root.endsWith('/notes'),
      success: '**You have a copy.** The folder `notes` holds the files and every commit, and **Your repo** shows them.',
    },
    {
      id: 'look',
      title: 'Look around',
      learn:
        'Move into the new folder with `cd notes`, then run `git log --oneline` to see the history you downloaded.\n\nYou may see a label called `origin/main`. It is your repo\'s memory of where **main** is on the server, as of the last time you talked to it.',
      task: 'Go into `notes` and read the history.',
      hints: ['Move in first, then list the commits.', 'Type `cd notes`, then `git log --oneline`.'],
      solution: ['cd notes', 'git log --oneline'],
      check: (c) => ranGit(c, 'log') && inRepo(c.world, 'notes'),
      success: '**The whole history came along.** `origin/main` and **main** point at the same commit, so you and the server match.',
    },
    {
      id: 'remote-v',
      title: 'Find the address again',
      learn:
        'Git remembers where you cloned from. Run `git remote -v` to see it.\n\n`origin` is a nickname for the address. Git picks that name when you clone, so you never retype the long address.',
      task: 'Show the remotes this repo knows about.',
      hints: ['It starts with `git remote`.', 'Type `git remote -v` and press Enter.'],
      solution: ['git remote -v'],
      check: (c) => ranGit(c, 'remote'),
      success: '**origin is the server.** It is listed twice, once for fetching (downloading) and once for pushing (uploading).',
    },
  ],
}
