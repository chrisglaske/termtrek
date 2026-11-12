import { describe, expect, it } from 'vitest'
import { describeChange } from './GraphVisual'

type S = Parameters<typeof describeChange>[0]

const snap = (over: Partial<S>): S => ({
  sig: '',
  head: 'main',
  headId: 'aaaaaaa1',
  tips: { main: 'aaaaaaa1' },
  ids: ['aaaaaaa1'],
  messages: { aaaaaaa1: 'one' },
  reach: { main: ['aaaaaaa1'] },
  ...over,
})

describe('describeChange', () => {
  it('says a new branch was created at the same commit', () => {
    const b = snap({ tips: { main: 'aaaaaaa1', homepage: 'aaaaaaa1' }, reach: { main: ['aaaaaaa1'], homepage: ['aaaaaaa1'] } })
    expect(describeChange(snap({}), b)).toContain('Branch homepage was created')
  })
  it('says HEAD moved when you switch', () => {
    const a = snap({ tips: { main: 'aaaaaaa1', homepage: 'aaaaaaa1' }, reach: { main: ['aaaaaaa1'], homepage: ['aaaaaaa1'] } })
    expect(describeChange(a, { ...a, head: 'homepage' })).toBe('HEAD moved from main to homepage.')
  })
  it('explains an amend: the old commit is replaced and the message changed', () => {
    const a = snap({ messages: { aaaaaaa1: 'Add the lanch date' } })
    const b = snap({
      headId: 'bbbbbbb2',
      tips: { main: 'bbbbbbb2' },
      ids: ['aaaaaaa1', 'bbbbbbb2'],
      messages: { aaaaaaa1: 'Add the lanch date', bbbbbbb2: 'Add the launch date' },
      reach: { main: ['bbbbbbb2'] },
    })
    const text = describeChange(a, b)!
    expect(text).toContain('aaaaaaa was replaced by bbbbbbb')
    expect(text).toContain('Add the launch date')
  })
  it('says a fast-forward moved the branch forward', () => {
    const a = snap({ tips: { main: 'aaaaaaa1' }, reach: { main: ['aaaaaaa1'] } })
    const b = snap({ headId: 'ccccccc3', tips: { main: 'ccccccc3' }, ids: ['aaaaaaa1', 'ccccccc3'], reach: { main: ['ccccccc3', 'aaaaaaa1'] } })
    expect(describeChange(a, b)).toContain('main moved forward 1 commit')
  })
  it('says a removed label keeps its commits', () => {
    const a = snap({ tips: { main: 'aaaaaaa1', old: 'aaaaaaa1' }, reach: { main: ['aaaaaaa1'], old: ['aaaaaaa1'] } })
    expect(describeChange(a, snap({}))).toContain('old label was removed')
  })
  it('returns null when nothing changed', () => {
    expect(describeChange(snap({}), snap({}))).toBeNull()
  })
})
