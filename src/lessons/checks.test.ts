import { createWorld } from '../engine/world'
import { buildWorld } from '../engine/setup'
import { runLine } from '../engine/interpreter'
import type { World } from '../engine/types'
import type { StepContext } from './schema'
import {
  branchExists,
  commitCount,
  conventionalMessage,
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
  contains,
  inSync,
  lastFailed,
  mergedPrTip,
  ranAfter,
  prFor,
  rebaseInProgress,
  serverTip,
  trackingTip,
  upstreamOf,
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
  it('judges the summary after a type prefix', () => {
    expect(messageQuality('docs: add meeting notes').ok).toBe(true)
    expect(messageQuality('feat(ui): add search').ok).toBe(true)
    expect(messageQuality('docs: added notes').ok).toBe(false)
    expect(messageQuality('fix: stuff').ok).toBe(false)
    expect(messageQuality('fix: ').ok).toBe(false)
  })
})

describe('conventionalMessage', () => {
  it('accepts type: summary and type(scope): summary', () => {
    expect(conventionalMessage('docs: explain meeting file names').ok).toBe(true)
    expect(conventionalMessage('feat(ui): add search').ok).toBe(true)
    expect(conventionalMessage('build: bump the version').ok).toBe(true)
  })
  it('rejects a message without a lowercase type, or with a weak summary', () => {
    const plain = conventionalMessage('Explain how to name meeting files')
    expect(plain.ok).toBe(false)
    if (!plain.ok) expect(plain.reason).toContain('`docs: explain meeting file names`')
    expect(conventionalMessage('Docs: explain naming').ok).toBe(false)
    expect(conventionalMessage('docs:').ok).toBe(false)
    const weak = conventionalMessage('Added stuff')
    expect(weak.ok).toBe(false)
    if (!weak.ok) expect(weak.reason).toContain('Write it as a command')
    expect(conventionalMessage('docs: added notes').ok).toBe(false)
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

describe('remote checks', () => {
  const cloned = (): World => {
    const start = buildWorld({
      config: { 'user.name': 'Sam', 'user.email': 's@example.com' },
      remote: { slug: 'team/notes', commits: [{ message: 'One', files: { 'a.txt': 'a\n' } }] },
    })
    return run(start, 'git clone https://git.example.com/team/notes.git', 'cd notes')
  }
  it('knows the server tip, tracking tip and upstream', () => {
    const w = cloned()
    expect(serverTip(w, 'main')).toBe(w.repo!.branches.main)
    expect(trackingTip(w, 'origin/main')).toBe(w.repo!.branches.main)
    expect(upstreamOf(w, 'main')).toBe('origin/main')
    expect(serverTip(w, 'nope')).toBeNull()
    expect(upstreamOf(w, 'nope')).toBeNull()
    expect(inSync(w, 'main')).toBe(true)
  })
  it('is out of sync after a local commit and back in sync after a push', () => {
    let w = run(cloned(), 'echo hi >> a.txt', 'git commit -am "Add hi"')
    expect(inSync(w, 'main')).toBe(false)
    w = run(w, 'git push')
    expect(inSync(w, 'main')).toBe(true)
  })
  it('contains follows parents', () => {
    const w = run(cloned(), 'echo hi >> a.txt', 'git commit -am "Add hi"')
    expect(contains(w, 'main', 'origin/main')).toBe(true)
    expect(contains(w, 'origin/main', 'main')).toBe(false)
  })
  it('prFor and rebaseInProgress are empty by default', () => {
    const w = cloned()
    expect(prFor(w, 'main')).toBeUndefined()
    expect(rebaseInProgress(w)).toBe(false)
  })
  it('ranAfter needs the second command after the first', () => {
    const w = cloned()
    const ctx = (ran: string[]) => ({ start: w, world: w, ran, last: null })
    expect(ranAfter(ctx(['git commit -m x && git status']), 'commit', 'status')).toBe(true)
    expect(ranAfter(ctx(['git status', 'git commit -m x']), 'commit', 'status')).toBe(false)
    expect(ranAfter(ctx([]), 'commit', 'status')).toBe(false)
  })
  it('lastFailed needs a failed run of that subcommand', () => {
    const w = cloned()
    const failed = { start: w, world: w, ran: ['git push nope'], last: { world: w, lines: [], exitCode: 1 } }
    expect(lastFailed(failed, 'push')).toBe(true)
    expect(lastFailed(failed, 'pull')).toBe(false)
    expect(lastFailed({ ...failed, last: { world: w, lines: [], exitCode: 0 } }, 'push')).toBe(false)
  })
  it('mergedPrTip is the merged pull request head tip, otherwise null', () => {
    const w = cloned()
    expect(mergedPrTip(w, 1)).toBeNull()
    const pr = { number: 1, title: 't', body: '', head: 'h', base: 'main', author: 'a', comments: [], openedAt: 0 }
    const open = { ...w, remote: { ...w.remote!, prs: [{ ...pr, state: 'open' as const, headTip: 'abc' }] } }
    expect(mergedPrTip(open, 1)).toBeNull()
    const merged = { ...w, remote: { ...w.remote!, prs: [{ ...pr, state: 'merged' as const, headTip: 'abc' }] } }
    expect(mergedPrTip(merged, 1)).toBe('abc')
  })
})
