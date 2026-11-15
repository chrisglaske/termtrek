import { describe, expect, it } from 'vitest'
import { guides } from '../guides/guides'
import { allLessons } from '../lessons/course'
import { routeMeta } from './routeMeta'

describe('routeMeta', () => {
  const metas = routeMeta()
  it('lists the static routes, every guide and every lesson once', () => {
    const paths = metas.map((m) => m.path)
    expect(new Set(paths).size).toBe(paths.length)
    expect(paths.length).toBe(4 + guides.length + allLessons().length)
    for (const p of ['/', '/learn', '/playground', '/guides']) expect(paths).toContain(p)
    expect(paths).toContain('/learn/merge-conflicts')
    expect(paths).toContain(`/guides/${guides[0]!.id}`)
  })
  it('gives each a title and a description of at most 160 characters', () => {
    for (const m of metas) {
      expect(m.title.length, m.path).toBeGreaterThan(0)
      expect(m.description.length, m.path).toBeGreaterThan(0)
      expect(m.description.length, m.path).toBeLessThanOrEqual(160)
    }
  })
})
