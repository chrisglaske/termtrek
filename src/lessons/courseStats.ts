import { course } from './course'
import type { Section } from './schema'

export function sectionStats(s: Section): { lessons: number; minutes: number } {
  return { lessons: s.lessons.length, minutes: s.lessons.reduce((m, l) => m + l.minutes, 0) }
}

export function courseStats(): { lessons: number; minutes: number; live: number; later: number } {
  const live = course.filter((s) => s.status === 'launch')
  let lessons = 0
  let minutes = 0
  for (const s of live) {
    const t = sectionStats(s)
    lessons += t.lessons
    minutes += t.minutes
  }
  return { lessons, minutes, live: live.length, later: course.length - live.length }
}

/** Nearest half hour, written without a trailing ".0". */
function hours(minutes: number): string {
  return String(Math.round(minutes / 30) / 2)
}

/** Long form for running text: "about 3.5 hours" or "about 57 min". */
export function formatHours(minutes: number): string {
  if (minutes < 90) return `about ${minutes} min`
  const h = hours(minutes)
  return `about ${h} ${h === '1' ? 'hour' : 'hours'}`
}

/** Short form for the big stat number: "~3.5 h" or "~57 min". */
export function formatHoursShort(minutes: number): string {
  return minutes < 90 ? `~${minutes} min` : `~${hours(minutes)} h`
}
