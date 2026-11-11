import { findConflicts, resolveConflict } from './conflicts'

const TWO = [
  'intro',
  '<<<<<<< HEAD',
  'ours 1',
  'ours 2',
  '=======',
  'theirs 1',
  '>>>>>>> feature',
  'middle',
  '<<<<<<< HEAD',
  '=======',
  'theirs only',
  '>>>>>>> fix/typo',
  'end',
].join('\n')

describe('findConflicts', () => {
  it('finds two conflicts with labels', () => {
    expect(findConflicts(TWO)).toEqual([
      { start: 1, mid: 4, end: 6, ours: ['ours 1', 'ours 2'], theirs: ['theirs 1'], oursLabel: 'HEAD', theirsLabel: 'feature' },
      { start: 8, mid: 9, end: 11, ours: [], theirs: ['theirs only'], oursLabel: 'HEAD', theirsLabel: 'fix/typo' },
    ])
  })

  it('ignores a lone =======', () => {
    expect(findConflicts('title\n=======\ntext\n')).toEqual([])
    expect(findConflicts('<<<<<<< HEAD\nonly ours\n')).toEqual([])
  })
})

describe('resolveConflict', () => {
  it('keep current', () => {
    expect(resolveConflict(TWO, 0, 'current')).toBe(
      ['intro', 'ours 1', 'ours 2', 'middle', '<<<<<<< HEAD', '=======', 'theirs only', '>>>>>>> fix/typo', 'end'].join('\n'),
    )
  })

  it('keep incoming', () => {
    expect(resolveConflict(TWO, 1, 'incoming')).toBe(
      ['intro', '<<<<<<< HEAD', 'ours 1', 'ours 2', '=======', 'theirs 1', '>>>>>>> feature', 'middle', 'theirs only', 'end'].join('\n'),
    )
  })

  it('keep both', () => {
    expect(resolveConflict('a\n<<<<<<< HEAD\nx\n=======\ny\n>>>>>>> b\n', 0, 'both')).toBe('a\nx\ny\n')
  })

  it('leaves the text alone for a missing conflict', () => {
    expect(resolveConflict('plain\n', 0, 'both')).toBe('plain\n')
  })
})
