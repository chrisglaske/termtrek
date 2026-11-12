import { guides, findGuide } from './guides'
import type { GuideStep } from './guides'

const allSteps = (g: (typeof guides)[number]): GuideStep[] => [...(g.common ?? []), ...g.byOs.macos, ...g.byOs.windows]

describe('guides data', () => {
  it('has three guides with unique ids and steps for both systems', () => {
    expect(guides.map((g) => g.id)).toEqual(['install-git', 'set-your-name', 'sign-in-to-github'])
    expect(new Set(guides.map((g) => g.id)).size).toBe(3)
    for (const g of guides) {
      expect(g.byOs.macos.length).toBeGreaterThan(0)
      expect(g.byOs.windows.length).toBeGreaterThan(0)
      expect(findGuide(g.id)).toBe(g)
    }
    expect(findGuide('nope')).toBeUndefined()
  })

  it('has clean commands and https-only text', () => {
    for (const g of guides) {
      for (const s of allSteps(g)) {
        if (s.command !== undefined) {
          expect(s.command.length).toBeGreaterThan(0)
          expect(s.command).toBe(s.command.trim())
        }
        expect(s.body).not.toContain('http://')
      }
      expect(g.check).not.toContain('http://')
    }
  })
})
