import { describe, expect, it } from 'vitest'
import {
  STORAGE_KEY,
  emptyProgress,
  exportBackup,
  importBackup,
  loadProgress,
  markComplete,
  saveProgress,
} from './store'

const NOT_BACKUP =
  "That file isn't a TermTrek backup. Choose the .json file you downloaded from TermTrek."
const NEWER =
  'This backup is from a newer TermTrek. Refresh the page to update, then try again.'

function fakeStorage(initial?: string): Storage {
  const m = new Map<string, string>()
  if (initial !== undefined) m.set(STORAGE_KEY, initial)
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

describe('loadProgress', () => {
  it('returns empty for invalid JSON', () => {
    expect(loadProgress(fakeStorage('{bad'))).toEqual(emptyProgress())
  })
  it('returns empty when getItem throws', () => {
    const s = fakeStorage()
    s.getItem = () => {
      throw new Error('denied')
    }
    expect(loadProgress(s)).toEqual(emptyProgress())
  })
  it('returns empty for a wrong shape or old version', () => {
    expect(loadProgress(fakeStorage('{"version":0,"completed":{}}'))).toEqual(emptyProgress())
    expect(loadProgress(fakeStorage('{"version":1,"completed":{"a":1}}'))).toEqual(emptyProgress())
  })
  it('loads saved progress including unknown ids', () => {
    const p = markComplete(emptyProgress(), 'future-lesson', '2026-01-01T00:00:00.000Z')
    const s = fakeStorage()
    saveProgress(p, s)
    expect(loadProgress(s)).toEqual(p)
  })
})

describe('saveProgress', () => {
  it('swallows storage errors', () => {
    const s = fakeStorage()
    s.setItem = () => {
      throw new Error('quota')
    }
    expect(() => saveProgress(emptyProgress(), s)).not.toThrow()
  })
})

describe('markComplete', () => {
  it('does not mutate its input and keeps the first completion time', () => {
    const p = emptyProgress()
    const a = markComplete(p, 'x', '2026-01-01T00:00:00.000Z')
    expect(p.completed).toEqual({})
    expect(a).not.toBe(p)
    const b = markComplete(a, 'x', '2026-02-02T00:00:00.000Z')
    expect(b.completed.x?.at).toBe('2026-01-01T00:00:00.000Z')
  })
})

describe('backup', () => {
  const iso = '2026-03-03T10:00:00.000Z'
  it('round trips', () => {
    const p = { ...markComplete(emptyProgress(), 'a', iso), lastLesson: 'a' }
    const r = importBackup(exportBackup(p, iso))
    expect(r).toEqual({ ok: true, progress: p })
  })
  it('exports pretty JSON', () => {
    expect(exportBackup(emptyProgress(), iso)).toContain('\n  "app": "termtrek"')
  })
  it('rejects non-JSON and foreign files', () => {
    expect(importBackup('nope')).toEqual({ ok: false, error: NOT_BACKUP })
    expect(importBackup('{"app":"other"}')).toEqual({ ok: false, error: NOT_BACKUP })
    expect(importBackup('null')).toEqual({ ok: false, error: NOT_BACKUP })
    expect(
      importBackup('{"app":"termtrek","kind":"other","version":1}'),
    ).toEqual({ ok: false, error: NOT_BACKUP })
  })
  it('rejects a newer version', () => {
    const t = JSON.stringify({ app: 'termtrek', kind: 'progress-backup', version: 2 })
    expect(importBackup(t)).toEqual({ ok: false, error: NEWER })
  })
  it('rejects a bad progress shape', () => {
    const t = JSON.stringify({
      app: 'termtrek',
      kind: 'progress-backup',
      version: 1,
      progress: { version: 1, completed: { a: { at: 5 } } },
    })
    expect(importBackup(t)).toEqual({ ok: false, error: NOT_BACKUP })
  })
})
