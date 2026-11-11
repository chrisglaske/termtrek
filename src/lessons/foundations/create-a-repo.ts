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
}
