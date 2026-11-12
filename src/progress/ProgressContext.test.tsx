import { act, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ProgressProvider, useProgress } from './ProgressContext'
import { STORAGE_KEY, loadProgress } from './store'

function fakeStorage(): Storage {
  const m = new Map<string, string>()
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

type Api = ReturnType<typeof useProgress>

function mount(storage: Storage) {
  const ref: { api?: Api } = {}
  function Probe() {
    ref.api = useProgress()
    return null
  }
  render(
    <ProgressProvider storage={storage}>
      <Probe />
    </ProgressProvider>,
  )
  return ref
}

describe('ProgressProvider', () => {
  it('merges completions from two tabs sharing storage', () => {
    const s = fakeStorage()
    const a = mount(s)
    const b = mount(s)
    act(() => a.api?.complete('one'))
    act(() => b.api?.complete('two'))
    expect(Object.keys(loadProgress(s).completed).sort()).toEqual(['one', 'two'])
  })

  it('adopts changes from another tab without saving them back', () => {
    const s = fakeStorage()
    const a = mount(s)
    s.setItem(
      STORAGE_KEY,
      JSON.stringify({ version: 1, completed: { x: { at: '2026-01-01T00:00:00.000Z' } } }),
    )
    act(() => {
      window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
    })
    expect(Object.keys(a.api?.progress.completed ?? {})).toEqual(['x'])
  })
})
