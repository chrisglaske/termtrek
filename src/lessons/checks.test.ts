import { createWorld } from '../engine/world'
import { runLine } from '../engine/interpreter'
import type { World } from '../engine/types'
import type { StepContext } from './schema'
import { commitCount, hasIdentity, inRepo, isClean, isStaged, isTracked, messageQuality, ran, ranGit } from './checks'

function run(w: World, ...lines: string[]): World {
  return lines.reduce((acc, l) => runLine(acc, l).world, w)
}

const ctx = (ran: string[]): StepContext => {
  const w = createWorld()
  return { start: w, world: w, ran, last: null }
}

describe('messageQuality', () => {
  it('rejects past tense', () => {
    const r = messageQuality('Added notes')
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.reason).toContain('Add')
  })
  it('accepts a good message', () => {
    expect(messageQuality('Add meeting notes').ok).toBe(true)
  })
  it('rejects empty, long and vague messages', () => {
    expect(messageQuality('  ').ok).toBe(false)
    expect(messageQuality('x'.repeat(73)).ok).toBe(false)
    expect(messageQuality('update').ok).toBe(false)
    expect(messageQuality('Fix.').ok).toBe(false)
  })
  it('allows exempt words and uses only the first line', () => {
    expect(messageQuality('Need review').ok).toBe(true)
    expect(messageQuality('Add notes\n\nAdded detail below').ok).toBe(true)
    expect(messageQuality('Adding notes').ok).toBe(false)
    expect(messageQuality('Added: notes').ok).toBe(false)
    expect(messageQuality('Embed video').ok).toBe(true)
    expect(messageQuality('Ping server').ok).toBe(true)
  })
})

describe('state checks', () => {
  const base = { files: { 'proj/a.txt': 'hi' }, cwd: 'proj' }
  it('inRepo', () => {
    const w = createWorld(base)
    expect(inRepo(w)).toBe(false)
    const r = run(w, 'git init')
    expect(inRepo(r)).toBe(true)
    expect(inRepo(r, 'proj')).toBe(true)
    expect(inRepo(r, 'other')).toBe(false)
    expect(inRepo(run(r, 'cd ~'))).toBe(false)
  })
  it('isStaged counts new files in an unborn repo', () => {
    const w = run(createWorld(base), 'git init')
    expect(isStaged(w, 'a.txt')).toBe(false)
    expect(isStaged(run(w, 'git add a.txt'), 'a.txt')).toBe(true)
  })
  it('commit, tracked, clean, count, identity', () => {
    let w = createWorld(base)
    expect(commitCount(w)).toBe(0)
    expect(isClean(w)).toBe(false)
    expect(hasIdentity(w)).toBe(false)
    w = run(w, 'git init', 'git config user.name "Sam"', 'git config user.email s@x.io', 'git add .', 'git commit -m "Add a"')
    expect(hasIdentity(w)).toBe(true)
    expect(commitCount(w)).toBe(1)
    expect(isTracked(w, 'a.txt')).toBe(true)
    expect(isStaged(w, 'a.txt')).toBe(false)
    expect(isClean(w)).toBe(true)
  })
})

describe('ranGit', () => {
  it('matches quoted commands', () => {
    expect(ranGit(ctx(['git commit -m "x"']), 'commit')).toBe(true)
  })
  it('matches && segments', () => {
    expect(ranGit(ctx(['mkdir a && git init']), 'init')).toBe(true)
  })
  it('matches ; segments', () => {
    expect(ranGit(ctx(['mkdir a; git init']), 'init')).toBe(true)
    expect(ranGit(ctx(['git status; ls']), 'status')).toBe(true)
  })
  it('does not match other subcommands or echoes', () => {
    expect(ranGit(ctx(['git status']), 'init')).toBe(false)
    expect(ranGit(ctx(['echo git init']), 'init')).toBe(false)
  })
})

describe('ran', () => {
  it('matches the first word of any && segment', () => {
    expect(ran(ctx(['ls']), 'ls')).toBe(true)
    expect(ran(ctx(['ls -a']), 'ls')).toBe(true)
    expect(ran(ctx(['mkdir a && cd a']), 'cd')).toBe(true)
  })
  it('ignores other words and bad input', () => {
    expect(ran(ctx(['echo ls']), 'ls')).toBe(false)
    expect(ran(ctx(['"unclosed']), 'ls')).toBe(false)
    expect(ran(ctx([]), 'ls')).toBe(false)
  })
})
