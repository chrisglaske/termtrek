import type { Lesson } from './schema'
import { CLONED } from './team/setups'

/** Free practice on the cloned sample project. Never in the course and never completed. */
export const PLAYGROUND: Lesson = {
  id: 'playground',
  section: 'team',
  title: 'Playground',
  level: 'Beginner',
  minutes: 0,
  setup: CLONED,
  steps: [
    {
      id: 'free',
      title: 'Free practice',
      learn: 'Try any command.',
      task: 'Try any command.',
      hints: ['Try any command.'],
      solution: [],
      check: () => false,
      success: '',
    },
  ],
}
