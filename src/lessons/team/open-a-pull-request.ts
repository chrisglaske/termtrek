import type { Lesson } from '../schema'
import { prFor, ranGit, serverTip } from '../checks'
import { WELCOME } from '../branching/setups'
import { TEAMMATE } from '../sample'
import { teammateComment } from '../../engine/remote/teammate'
import { ALEX_ASKS_FOR_A_WELCOME, HOMEPAGE_PUSHED } from './setups'

const homepageFile = (c: { world: Parameters<typeof serverTip>[0] }): string | undefined => {
  const tip = serverTip(c.world, 'homepage')
  return tip ? c.world.remote?.commits[tip]?.tree['home.html'] : undefined
}

export const openAPullRequest: Lesson = {
  id: 'open-a-pull-request',
  section: 'team',
  title: 'Ask for a review: pull requests',
  level: 'Intermediate',
  minutes: 8,
  assumes: 'You can push a branch to a server.',
  setup: HOMEPAGE_PUSHED,
  steps: [
    {
      id: 'open',
      title: 'Open a pull request',
      learn:
        'Your **homepage** branch is on the server, but **main** does not have it, and it should not until a teammate has looked at it. A **pull request** (PR) is a request to merge your branch into another one. It shows your changes as a diff, and teammates read them, comment, and approve.\n\nPull requests are a feature of the server, not of Git, so you make this one with clicks:\n1. Open the **Remote** tab.\n2. Click **New pull request**.\n3. Compare **homepage** with **main**.\n4. Type the title `Add a home page`.\n5. Click **Create pull request**.',
      task: 'Open a pull request for homepage with the title "Add a home page".',
      hints: [
        'Use the **Remote** tab, not the terminal.',
        'Open **Remote**, click **New pull request**, choose **homepage**, type the title `Add a home page`, then click **Create pull request**.',
      ],
      solution: [],
      solve: [{ type: 'pr-open', head: 'homepage', base: 'main', title: 'Add a home page', body: '' }],
      check: (c) => prFor(c.world, 'homepage')?.state === 'open',
      success: '**Pull request #1 is open.** Your teammates can read the changes in it now. Nothing has been merged yet.',
    },
    {
      id: 'respond',
      title: 'Respond to the review',
      learn:
        'A reviewer can approve a pull request or ask for changes. Open the pull request in the **Remote** tab to read what they wrote.\n\nTo answer a request for changes, change your branch the usual way: edit, commit, and push. The pull request follows its branch, so it updates by itself when you push. There is no need to open a new one.\n\nAdd the welcome line to `home.html` with `echo "<p>Notes from our weekly meetings.</p>" >> home.html`, then commit it with `git commit -am "Add a welcome line"` and push it with `git push`.',
      task: 'Add the welcome line to home.html, commit it and push it.',
      hints: [
        'Append the line, commit with `-am`, then push.',
        'Type `echo "<p>Notes from our weekly meetings.</p>" >> home.html`, then `git commit -am "Add a welcome line"`, then `git push`.',
      ],
      solution: ['echo "<p>Notes from our weekly meetings.</p>" >> home.html', 'git commit -am "Add a welcome line"', 'git push'],
      event: { apply: teammateComment(ALEX_ASKS_FOR_A_WELCOME), note: `**${TEAMMATE.name}** reviewed your pull request.` },
      check: (c) => homepageFile(c)?.includes(WELCOME) ?? false,
      nudge: (c) =>
        ranGit(c, 'commit') && !ranGit(c, 'push')
          ? { kind: 'tip', text: 'Now push it: the pull request only shows what is on the server, and your commit is still only on your computer.' }
          : ranGit(c, 'push') && !homepageFile(c)?.includes(WELCOME)
            ? { kind: 'tip', text: 'The server\'s `home.html` does not have the welcome line yet. Add it with `echo "<p>Notes from our weekly meetings.</p>" >> home.html`, then commit with `git commit -am "Add a welcome line"` and push again with `git push`.' }
            : null,
      success: '**The pull request updated by itself.** Open it in the **Remote** tab: the welcome line is part of it now.',
    },
  ],
}
