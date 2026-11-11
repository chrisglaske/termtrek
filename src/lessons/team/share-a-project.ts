import type { Lesson } from '../schema'
import { fromUrl } from '../../engine/remote/host'
import { inSync, ranGit, upstreamOf } from '../checks'
import { TWO_ON_MAIN } from '../branching/setups'
import { EMPTY_SERVER, PROJECT_URL } from './setups'

export const shareAProject: Lesson = {
  id: 'share-a-project',
  section: 'team',
  title: 'Put an existing project on the server',
  level: 'Beginner',
  minutes: 6,
  assumes: 'You can push commits to a server.',
  setup: { ...TWO_ON_MAIN, remote: EMPTY_SERVER },
  steps: [
    {
      id: 'remote-add',
      title: 'Point your repo at the server',
      learn:
        `This project started on your computer, and someone made an empty repo for it on the server. Tell Git where it is: \`git remote add origin ${PROJECT_URL}\`.\n- \`remote add\` saves an address under a nickname.\n- \`origin\` is the nickname. It is the usual name for the main server.\n- The last part is the address.`,
      task: 'Add the server as origin.',
      hints: ['It starts with `git remote add`, then the nickname, then the address.', `Type \`git remote add origin ${PROJECT_URL}\` and press Enter.`],
      solution: [`git remote add origin ${PROJECT_URL}`],
      check: (c) => !!c.world.repo?.remotes.origin && fromUrl(c.world.repo.remotes.origin) === fromUrl(PROJECT_URL),
      nudge: (c) =>
        c.world.repo?.remotes.origin
          ? {
              kind: 'warn',
              text: `That address looks wrong. Remove it with \`git remote remove origin\`, then add it again with \`git remote add origin ${PROJECT_URL}\`.`,
            }
          : null,
      success: '**Git knows the address.** Nothing was sent yet. It only saved the nickname.',
    },
    {
      id: 'push-u',
      title: 'Push main and remember it',
      learn:
        'Now send **main**: `git push -u origin main`.\n- `origin` says which server.\n- `main` says which branch.\n- `-u` means "remember this as main\'s upstream", the branch on the server that **main** follows. After that, plain `git push` and `git pull` know where to go.',
      task: 'Push main to origin and set its upstream.',
      hints: ['Use `git push`, the `-u` flag, the nickname and the branch.', 'Type `git push -u origin main` and press Enter.'],
      solution: ['git push -u origin main'],
      check: (c) => inSync(c.world, 'main') && upstreamOf(c.world, 'main') === 'origin/main',
      success: '**The project is on the server.** Open the **Remote** tab: both commits are there.',
    },
    {
      id: 'status',
      title: 'Check where you stand',
      learn: 'Run `git status`. With an upstream set, it compares you with the server and says "up to date with \'origin/main\'".',
      task: 'Check the status.',
      hints: ['You have used this one before.', 'Type `git status` and press Enter.'],
      solution: ['git status'],
      check: (c) => ranGit(c, 'status'),
      success: '**Up to date.** Your **main** and the server\'s match.',
    },
  ],
}
