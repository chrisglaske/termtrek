import type { Lesson } from '../schema'
import { inRepo } from '../checks'
import { IDENTITY, NOTES, README } from '../sample'

export const createARepo: Lesson = {
  id: 'create-a-repo',
  section: 'foundations',
  title: 'Create a repo',
  level: 'Beginner',
  minutes: 4,
  assumes: 'Git knows your name and email.',
  setup: {
    cwd: '',
    files: { 'project/notes.txt': NOTES, 'project/README.md': README },
    config: IDENTITY,
  },
  steps: [
    {
      id: 'cd',
      title: 'Go into the project folder',
      learn:
        "The text before your cursor, the **prompt**, shows where you are. Right now it shows `~`, which stands for your **home folder**. The **project** folder is inside it.\n\nTo move into a folder, use `cd project`. `cd` is short for \"change directory\" (directory is another word for folder), and `project` is the folder to go into. If you lose track of where you are, `pwd` prints the full path.",
      task: 'Move into the **project** folder.',
      hints: [
        'You need the command that changes the folder you are in.',
        'Type `cd`, a space, and the name of the folder.',
        'Type `cd project` and press Enter.',
      ],
      solution: ['cd project'],
      check: (c) => c.world.cwd === `${c.world.home}/project`,
      success:
        '**You moved.** The prompt now shows `~/project`, so every command you type runs inside the project folder.',
    },
    {
      id: 'init',
      title: 'Turn the folder into a repo',
      learn:
        "Git doesn't watch a folder until you ask it to. A **repository**, or **repo**, is a folder whose history Git keeps.\n\nRun `git init` to create one here. `init` is short for \"initialize\", which means set up. Git adds a hidden `.git` folder where it will store every snapshot. Your files stay exactly as they are.",
      task: 'Make the **project** folder a Git repository.',
      hints: [
        'Make sure the prompt shows `~/project` first, then start a repo there.',
        'The Git command for this is short for "initialize".',
        'Type `git init` and press Enter.',
      ],
      solution: ['git init'],
      check: (c) => inRepo(c.world, 'project'),
      success:
        "**Repo created.** The prompt now shows **main**, the name of your first **branch**, a line of history. The **Your repo** panel says there are no commits yet, because you haven't saved a snapshot.",
    },
  ],
  pages: [
    {
      kind: 'read',
      id: 'where',
      kicker: 'Where am I?',
      title: 'The prompt shows where you are',
      body: 'The text before your cursor is the **prompt**. Right now it shows `~`, your **home folder**. The **project** folder is inside it.',
      visual: { kind: 'tree' },
    },
    {
      kind: 'do',
      id: 'cd',
      kicker: 'Step 1 of 2',
      title: 'Go into the project folder',
      body: '`cd` means "change directory". Directory is another word for folder. If you ever lose track, `pwd` prints the full path.',
      visual: { kind: 'tree' },
      step: 0,
      command: [
        { text: 'cd', say: 'go into a folder' },
        { text: 'project', say: 'this folder' },
      ],
      done: '**You moved.** The prompt now shows `~/project`, so every command runs inside it.',
    },
    {
      kind: 'read',
      id: 'repo',
      kicker: 'The idea',
      title: 'A repo is a folder Git keeps history for',
      body: 'Git does not watch a folder until you ask. A **repository**, or **repo**, is a folder whose history Git keeps.',
      visual: { kind: 'none' },
    },
    {
      kind: 'do',
      id: 'init',
      kicker: 'Step 2 of 2',
      title: 'Turn the folder into a repo',
      body: '`init` is short for "initialize", which means set up. Your files stay exactly as they are.',
      visual: { kind: 'tree' },
      step: 1,
      command: [
        { text: 'git', say: 'talk to Git' },
        { text: 'init', say: 'set up a repo here' },
      ],
      done: '**Repo created.** The prompt now shows **main**.',
    },
    {
      kind: 'read',
      id: 'hidden',
      kicker: 'What just happened',
      title: 'Git added a hidden folder',
      body: 'Git will keep every snapshot in a hidden folder called `.git`. You never need to open it.',
      visual: { kind: 'none' },
    },
    {
      kind: 'read',
      id: 'main',
      kicker: 'Look at the prompt',
      title: 'main is your first branch',
      body: 'A **branch** is a line of history. There are no commits on it yet, because you have not saved a snapshot.',
      visual: { kind: 'none' },
    },
    {
      kind: 'finish',
      id: 'done',
      title: 'You made a repo',
      body: 'Git now watches the project folder. Next, you will ask Git what it sees.',
    },
  ],
}
