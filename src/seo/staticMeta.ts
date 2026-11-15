import type { Guide } from '../guides/guides'
import type { Lesson } from '../lessons/schema'

/** Titles and descriptions shared by pages and the build. Light on purpose (types only from guides and lessons): the entry chunk imports it. */
export const SITE = 'https://termtrek.work'

export const DEFAULT_DESCRIPTION =
  'Learn Git by using it. A free, in-browser course with a real terminal, a live repo map and a simulated team server. No account, nothing saved about you.'

export const LANDING_TITLE = 'TermTrek: learn Git by using it'

export const COURSE_META = {
  title: 'Your course · TermTrek',
  description: 'Learn Git by typing real commands in a practice terminal and watching your project history change. Free, no account.',
}

export const PLAYGROUND_META = {
  title: 'Playground · TermTrek',
  description: 'Practice Git freely on a sample project with a real-feeling terminal, a live repo map and a pretend team server. Nothing is saved.',
}

export const GUIDES_META = {
  title: 'Setup guides · TermTrek',
  description: 'Step-by-step guides for your own computer: install Git, set your name and sign in to GitHub on macOS or Windows.',
}

export function guideMeta(guide: Guide): { title: string; description: string } {
  return { title: `${guide.title} · TermTrek`, description: guide.summary }
}

export function lessonMeta(lesson: Lesson): { title: string; description: string } {
  return { title: `${lesson.title} · TermTrek`, description: lessonDescription(lesson) }
}

export function lessonDescription(lesson: Lesson): string {
  const first = lesson.steps[0]?.title
  const text = first
    ? `${first}: step 1 of ${lesson.title}, a hands-on Git lesson you do in your browser.`
    : `${lesson.title}, a hands-on Git lesson you do in your browser.`
  return text.length <= 160 ? text : `${text.slice(0, 157).trimEnd()}...`
}
