import { describe, expect, it } from 'vitest'
import { diffStage } from './stageChange'
import type { StageSnap } from './stageChange'

const base: StageSnap = { changed: {}, staged: {}, saved: [], shelf: 0, ignored: [], branch: 'main' }

describe('diffStage', () => {
  it('says a staged file moved and lets the ring advance', () => {
    const a = { ...base, changed: { 'notes.txt': 'new' as const } }
    const b = { ...base, changed: { 'notes.txt': 'new' as const }, staged: { 'notes.txt': 'new' as const } }
    expect(diffStage(a, b)).toMatchObject({ caption: 'notes.txt moved from Folder to Staged.', advanced: true })
  })
  it('names the new save id', () => {
    const a = { ...base, staged: { 'a.txt': 'new' as const } }
    const b = { ...base, saved: ['abc1234ff'] }
    expect(diffStage(a, b)?.caption).toBe('1 file saved as abc1234, the id Git just printed.')
  })
  it('does not advance for a stash or a discard', () => {
    const a = { ...base, changed: { 'a.txt': 'modified' as const } }
    expect(diffStage(a, { ...base, shelf: 1 })).toMatchObject({ advanced: false })
    expect(diffStage(a, base)).toMatchObject({ advanced: false, tone: 'warn' })
  })
  it('does not call a branch switch a save', () => {
    const b = { ...base, saved: ['abc1234'], branch: 'homepage' }
    expect(diffStage(base, b)?.caption).toMatch(/^Switched to homepage/)
  })
  it('returns null when nothing visible changed', () => {
    expect(diffStage(base, base)).toBeNull()
  })
})
