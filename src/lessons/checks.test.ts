import { createWorld } from '../engine/world'
import { runLine } from '../engine/interpreter'
import type { World } from '../engine/types'
import type { StepContext } from './schema'
import {
  branchExists,
  commitCount,
  hasIdentity,
  hasMarkers,
  headMessage,
  historyLength,
  inRepo,
  isClean,
  isStaged,
  isTracked,
  mergeInProgress,
  messageQuality,
  onBranch,
  parentCount,
  ran,
  ranGit,
  treeFile,
  workFile,
} from './checks'

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

describe('history and file checks', () => {
  const repoSetup = {
    cwd: 'proj',
    config: { 'user.name': 'Sam', 'user.email': 's@x.io' },
    repo: {
      at: 'proj',
      commits: [
        { message: 'Add a', files: { 'a.txt': 'one\n' } },
        { message: 'Change a', files: { 'a.txt': 'two\n' } },
      ],
    },
  }

  it('headMessage', () => {
    expect(headMessage(createWorld())).toBeNull()
    expect(headMessage(run(createWorld(base0), 'git init'))).toBeNull()
    expect(headMessage(createWorld(repoSetup))).toBe('Change a')
  })

  it('historyLength follows first parents from a ref', () => {
    const w = createWorld(repoSetup)
    expect(historyLength(createWorld())).toBe(0)
    expect(historyLength(w)).toBe(2)
    expect(historyLength(w, 'HEAD~1')).toBe(1)
    expect(historyLength(w, 'nope')).toBe(0)
    const m = run(w, 'git switch -c side', 'echo b > b.txt', 'git add b.txt', 'git commit -m "Add b"', 'git switch main', 'echo c > c.txt', 'git add c.txt', 'git commit -m "Add c"', 'git merge --no-edit side')
    expect(parentCount(m)).toBe(2)
    expect(historyLength(m)).toBe(4)
    expect(historyLength(m, 'side')).toBe(3)
  })

  it('workFile and treeFile', () => {
    const w = run(createWorld(repoSetup), 'echo three > a.txt')
    expect(workFile(w, 'a.txt')).toBe('three\n')
    expect(workFile(w, 'missing.txt')).toBeUndefined()
    expect(workFile(createWorld(), 'a.txt')).toBeUndefined()
    expect(treeFile(w, 'HEAD', 'a.txt')).toBe('two\n')
    expect(treeFile(w, 'HEAD~1', 'a.txt')).toBe('one\n')
    expect(treeFile(w, 'HEAD', 'missing.txt')).toBeUndefined()
    expect(treeFile(w, 'nope', 'a.txt')).toBeUndefined()
  })

  it('onBranch and branchExists', () => {
    const w = createWorld(repoSetup)
    expect(onBranch(w, 'main')).toBe(true)
    expect(branchExists(w, 'side')).toBe(false)
    const b = run(w, 'git switch -c side')
    expect(onBranch(b, 'side')).toBe(true)
    expect(onBranch(b, 'main')).toBe(false)
    expect(branchExists(b, 'side')).toBe(true)
    expect(branchExists(b, 'toString')).toBe(false)
    expect(onBranch(run(w, 'git switch --detach HEAD'), 'main')).toBe(false)
    expect(onBranch(createWorld(), 'main')).toBe(false)
  })

  it('parentCount', () => {
    expect(parentCount(createWorld())).toBe(0)
    expect(parentCount(createWorld(repoSetup))).toBe(1)
    expect(parentCount(run(createWorld(repoSetup), 'git reset --hard HEAD~1'))).toBe(0)
  })

  it('hasMarkers', () => {
    expect(hasMarkers('<<<<<<< HEAD\na\n=======\nb\n>>>>>>> side\n')).toBe(true)
    expect(hasMarkers('a\n=======\n')).toBe(true)
    expect(hasMarkers('plain text\n')).toBe(false)
    expect(hasMarkers('x <<<<<<< HEAD\n')).toBe(false)
    expect(hasMarkers('<<<<<<<<\n')).toBe(false)
  })

  it('mergeInProgress', () => {
    const w = createWorld(repoSetup)
    expect(mergeInProgress(w)).toBe(false)
    const c = run(w, 'git switch -c side', 'echo side > a.txt', 'git commit -am "Side a"', 'git switch main', 'echo main > a.txt', 'git commit -am "Main a"', 'git merge side')
    expect(mergeInProgress(c)).toBe(true)
    expect(mergeInProgress(run(c, 'git merge --abort'))).toBe(false)
  })
})

const base0 = { files: { 'proj/a.txt': 'hi' }, cwd: 'proj' }
