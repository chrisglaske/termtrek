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

describe('guides content (QA fixes)', () => {
  const text = JSON.stringify(guides)
  it.each([
    'core.editor',
    "Install 'code' command in PATH",
    'Git Credential Manager',
    'git remote set-url origin git@github.com:',
    '--apple-use-keychain',
    'pull.rebase',
    'Workflows',
    'init.defaultBranch main',
  ])('mentions %s', (s) => {
    expect(text).toContain(s)
  })
  it('does not say ls-remote prints commits', () => {
    expect(text).not.toContain('prints a list of commits')
  })
})
