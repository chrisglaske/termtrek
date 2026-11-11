import { getThemePref, setThemePref } from './theme'

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
