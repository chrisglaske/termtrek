import { getThemePref, setThemePref } from './theme'
import { contrast } from './contrast'
import tokensCss from './tokens.css?raw'

function fakeStorage(initial: Record<string, string> = {}): Storage {
  const m = new Map(Object.entries(initial))
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => void m.set(k, v),
    removeItem: (k: string) => void m.delete(k),
    clear: () => m.clear(),
    key: () => null,
    get length() {
      return m.size
    },
  }
}

const throwing = {
  getItem() {
    throw new Error('denied')
  },
  setItem() {
    throw new Error('denied')
  },
  removeItem() {
    throw new Error('denied')
  },
} as unknown as Storage

describe('theme', () => {
  afterEach(() => {
    delete document.documentElement.dataset.theme
  })

  it('defaults to system and rejects bad values', () => {
    expect(getThemePref(fakeStorage())).toBe('system')
    expect(getThemePref(fakeStorage({ 'termtrek.theme': 'bogus' }))).toBe('system')
    expect(getThemePref(fakeStorage({ 'termtrek.theme': 'dark' }))).toBe('dark')
  })

  it('survives storage that throws', () => {
    expect(getThemePref(throwing)).toBe('system')
    expect(() => setThemePref('dark', throwing)).not.toThrow()
    expect(document.documentElement.dataset.theme).toBe('dark')
  })

  it('sets and removes data-theme', () => {
    const s = fakeStorage()
    setThemePref('dark', s)
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(s.getItem('termtrek.theme')).toBe('dark')
    setThemePref('light', s)
    expect(document.documentElement.dataset.theme).toBe('light')
    setThemePref('system', s)
    expect(document.documentElement.dataset.theme).toBeUndefined()
    expect(s.getItem('termtrek.theme')).toBeNull()
  })
})

function tokens(block: string): Record<string, string> {
  return Object.fromEntries([...block.matchAll(/--([\w-]+):\s*([^;]+);/g)].map((m) => [m[1] ?? '', (m[2] ?? '').trim()]))
}

const light = tokens(tokensCss.slice(0, tokensCss.indexOf('@media')))
const darkMedia = tokens(tokensCss.slice(tokensCss.indexOf('@media'), tokensCss.indexOf(':root[data-theme="dark"]')))
const dark = tokens(tokensCss.slice(tokensCss.indexOf(':root[data-theme="dark"]')))
const hex = (t: Record<string, string>, name: string): string => {
  const v = t[name] ?? light[name] ?? ''
  return v === '#fff' ? '#ffffff' : v
}

describe('contrast', () => {
  it('matches the WCAG ratio', () => {
    expect(contrast('#000000', '#ffffff')).toBe(21)
    expect(contrast('#777777', '#ffffff')).toBeLessThan(4.5)
  })
})

describe('token contrast (WCAG 2.1 AA)', () => {
  it('keeps both dark blocks identical', () => {
    expect(darkMedia).toEqual(dark)
  })

  // Text pairs (4.5:1) found failing in the Task 9 browser pass, in both themes.
  const text: [string, string][] = [
    ['mute', 'surface'],
    ['mute', 'raised'],
    ['mute', 't-panel'],
    ['t-mute', 't-bg'],
    ['t-mute', 't-panel'],
    ['on-accent', 'accent'],
    ['on-accent', 'accent-h'],
    ['on-fill', 'ok-fill'],
    ['on-fill', 'warn-fill'],
  ]
  for (const [theme, t] of [['light', light], ['dark', dark]] as const) {
    for (const [fg, bg] of text) {
      it(`${theme}: --${fg} on --${bg} is at least 4.5:1`, () => {
        expect(contrast(hex(t, fg), hex(t, bg))).toBeGreaterThanOrEqual(4.5)
      })
    }
    it(`${theme}: --g-branch lines and dots are at least 3:1 on the map`, () => {
      expect(contrast(hex(t, 'g-branch'), hex(t, 't-bg'))).toBeGreaterThanOrEqual(3)
      expect(contrast(hex(t, 'g-branch'), hex(t, 'surface'))).toBeGreaterThanOrEqual(3)
    })
  }
})
