import type { Lesson } from '../schema'
import { prFor, ranGit, serverTip, treeFile, workFile } from '../checks'
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
      id: 'add-line',
      title: 'Add the welcome line',
      learn:
        'A reviewer can approve a pull request or ask for changes. To answer a request for changes, change your branch the usual way: edit, commit, and push. The pull request follows its branch, so it updates by itself.\n\nAdd the welcome line with `echo "<p>Notes from our weekly meetings.</p>" >> home.html`.',
      task: 'Add the welcome line to `home.html`.',
      hints: ['Append the line with `>>`.', 'Type `echo "<p>Notes from our weekly meetings.</p>" >> home.html` and press Enter.'],
      solution: ['echo "<p>Notes from our weekly meetings.</p>" >> home.html'],
      event: { apply: teammateComment(ALEX_ASKS_FOR_A_WELCOME), note: `**${TEAMMATE.name}** reviewed your pull request.` },
      check: (c) => workFile(c.world, 'home.html')?.includes(WELCOME) ?? false,
      nudge: (c) =>
        workFile(c.world, 'home.html') !== workFile(c.start, 'home.html')
          ? { kind: 'tip', text: 'That line is not quite the one Alex asked for. Add it again with `echo "<p>Notes from our weekly meetings.</p>" >> home.html`.' }
          : null,
      success: '**The welcome line is in the file.** Only on your computer so far.',
    },
    {
      id: 'commit',
      title: 'Commit it',
      learn: 'Save the change with `git commit -am "Add a welcome line"`.',
      task: 'Commit the welcome line.',
      hints: ['Commit with `-am` and a message.', 'Type `git commit -am "Add a welcome line"` and press Enter.'],
      solution: ['git commit -am "Add a welcome line"'],
      check: (c) => treeFile(c.world, 'HEAD', 'home.html')?.includes(WELCOME) ?? false,
      success: '**Committed.** The pull request only shows what is on the server, so it does not have it yet.',
    },
    {
      id: 'push',
      title: 'Push it',
      learn: 'Send it with `git push`. The pull request follows the **homepage** branch on the server, so it picks up the new commit by itself. There is no need to open a new one.',
      task: 'Push the welcome line.',
      hints: ['A plain push works: the branch already has an upstream.', 'Type `git push` and press Enter.'],
      solution: ['git push'],
      check: (c) => homepageFile(c)?.includes(WELCOME) ?? false,
      nudge: (c) =>
        ranGit(c, 'push') && !homepageFile(c)?.includes(WELCOME)
          ? { kind: 'tip', text: 'The server\'s `home.html` does not have the welcome line yet. Commit it with `git commit -am "Add a welcome line"`, then push again with `git push`.' }
          : null,
      success: '**The pull request updated by itself.** Open it in the **Remote** tab: the welcome line is part of it now.',
    },
  ],  pages: [
    {
      kind: 'read',
      id: 'review',
      kicker: 'The setup',
      title: 'Your branch is on the server',
      body: 'Your **homepage** branch is on the server, but **main** does not have it yet. On a team, someone looks at your work before it goes into main.',
      visual: { kind: 'server', branch: 'homepage' },
    },
    {
      kind: 'read',
      id: 'pr',
      kicker: 'The idea',
      title: 'A pull request asks for a review',
      body: 'A **pull request** asks to merge your branch into another one. Teammates read the changes, comment, and approve.\n\nPull requests live on the server\'s website, not in Git, so you open one with clicks.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'open',
      kicker: 'Try it',
      title: 'Open a pull request',
      body: 'You are asking to merge **homepage** into **main**. The title is filled in for you. Click **Create pull request**.',
      visual: { kind: 'none' },
      step: 0,
      command: [],
      on: 'server',
      view: 'new',
      done: '**Pull request #1 is open.** Nothing is merged yet.',
    },
    {
      kind: 'read',
      id: 'feedback',
      kicker: 'The review',
      title: 'Alex asked for a change',
      body: 'To answer, change your branch the usual way: edit, commit, push. The pull request follows the branch, so it updates by itself.',
      visual: { kind: 'pr' },
    },
    {
      kind: 'do',
      id: 'add-line',
      kicker: 'Try it',
      title: 'Add the welcome line',
      body: '`>>` adds it under the heading.',
      visual: { kind: 'stage', show: ['folder'], hot: 'folder' },
      step: 1,
      command: [
        { text: 'echo', say: 'print' },
        { text: '"<p>Notes from our weekly meetings.</p>"', say: 'this text' },
        { text: '>>', say: 'add it to the end of' },
        { text: 'home.html', say: 'this file' },
      ],
      done: '**The welcome line is in the file.**',
    },
    {
      kind: 'do',
      id: 'commit',
      kicker: 'Try it',
      title: 'Commit it',
      body: 'The pull request only shows what is on the server, so watch both sides.',
      visual: { kind: 'server', branch: 'homepage' },
      step: 2,
      command: [
        { text: 'git commit', say: 'save a snapshot' },
        { text: '-am', say: 'of every changed file' },
        { text: '"Add a welcome line"', say: 'with this message' },
      ],
      done: '**Committed.** One step left: send it.',
    },
    {
      kind: 'do',
      id: 'push',
      kicker: 'Try it',
      title: 'Push it',
      body: 'The branch already has an upstream, so a plain push is enough.',
      visual: { kind: 'pr' },
      step: 3,
      command: [{ text: 'git push', say: 'send my commits' }],
      done: '**The pull request updated by itself.** It has your welcome line now.',
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You asked for a review',
      body: 'A pull request shows your branch to the team. To answer feedback, commit and push to the same branch.',
    },
  ],
}
