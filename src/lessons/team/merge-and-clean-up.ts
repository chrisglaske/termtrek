import type { Lesson } from '../schema'
import { branchExists, contains, inSync, mergedPrTip, prFor, serverTip } from '../checks'
import { TEAMMATE } from '../sample'
import { teammateComment } from '../../engine/remote/teammate'
import { PR_OPEN } from './setups'

export const mergeAndCleanUp: Lesson = {
  id: 'merge-and-clean-up',
  section: 'team',
  title: 'Merge and clean up',
  level: 'Intermediate',
  minutes: 7,
  assumes: 'You can open a pull request and push to it.',
  setup: PR_OPEN,
  steps: [
    {
      id: 'merge',
      title: 'Merge the pull request',
      learn:
        'Your reviewer approved the pull request. Open it in the **Remote** tab and merge it. There are three ways:\n- **Create a merge commit** keeps every commit and adds one merge commit, as in the branching lessons.\n- **Squash** folds all the commits into one.\n- **Rebase** replays your commits on top of **main** with no merge commit.\n\nTeams pick one and stick with it. Choose **Create a merge commit** here.',
      task: 'Merge the pull request with Create a merge commit.',
      hints: ['Use the **Remote** tab, not the terminal.', 'Open pull request #1 and click **Create a merge commit**.'],
      solution: [],
      solve: [{ type: 'pr-merge', number: 1 }],
      event: { apply: teammateComment({ pr: 1, kind: 'approve', author: TEAMMATE.name, body: 'Thanks, ship it!' }), note: `**${TEAMMATE.name}** approved your pull request.` },
      check: (c) => prFor(c.world, 'homepage')?.state === 'merged',
      success: '**Merged on the server.** **main** on the server has a new merge commit. Your computer does not know yet.',
    },
    {
      id: 'pull',
      title: 'Update your computer',
      learn: 'The merge happened on the server, so your **main** is behind. Go to it with `git switch main`, then bring the merge in with `git pull`.',
      task: 'Switch to main and pull.',
      hints: ['Switch first, then pull.', 'Type `git switch main`, then `git pull`.'],
      solution: ['git switch main', 'git pull'],
      check: (c) => {
        const tip = mergedPrTip(c.world, 1)
        return inSync(c.world, 'main') && !!tip && contains(c.world, 'main', tip)
      },
      success: '**main has your work.** The merge commit is in your history, and **main** matches the server.',
    },
    {
      id: 'clean-up',
      title: 'Delete the branch',
      learn:
        'A merged branch has done its job. Delete your copy with `git branch -d homepage`, which refuses if the branch has work that is not merged. Then delete the server copy with `git push origin --delete homepage`.\n\nThe **Remote** tab has a **Delete branch** button for the server copy too.',
      task: 'Delete homepage on your computer and on the server.',
      hints: ['Two deletes: one local, one on the server.', 'Type `git branch -d homepage`, then `git push origin --delete homepage`.'],
      solution: ['git branch -d homepage', 'git push origin --delete homepage'],
      check: (c) => !branchExists(c.world, 'homepage') && serverTip(c.world, 'homepage') === null,
      success: '**Tidy.** The work lives on in **main**, and there is no leftover branch to confuse anyone.',
    },
  ],
}
