import { guides } from '../guides/guides'
import { allLessons } from '../lessons/course'
import { COURSE_META, guideMeta, lessonMeta, DEFAULT_DESCRIPTION, GUIDES_META, LANDING_TITLE, PLAYGROUND_META } from './staticMeta'

export interface RouteMeta {
  path: string
  title: string
  description: string
}

/** Every public page with the title and description it shows. Pages and the build both read this, so they cannot drift. Heavy (imports the whole course): only lazy pages and the build may import it. */
export function routeMeta(): RouteMeta[] {
  return [
    { path: '/', title: LANDING_TITLE, description: DEFAULT_DESCRIPTION },
    { path: '/learn', ...COURSE_META },
    { path: '/playground', ...PLAYGROUND_META },
    { path: '/guides', ...GUIDES_META },
    ...guides.map((g) => ({ path: `/guides/${g.id}`, ...guideMeta(g) })),
    ...allLessons().map((l) => ({ path: `/learn/${l.id}`, ...lessonMeta(l) })),
  ]
}
