import { render, screen } from '@testing-library/react'
import { axe } from 'vitest-axe'
import { createWorld } from '../../engine/world'
import { buildWorld } from '../../engine/setup'
import { runLine } from '../../engine/interpreter'
import { RepoMap } from './RepoMap'

const config = { 'user.name': 'Sam', 'user.email': 's@x.com' }
const built = (run: string[]) =>
  buildWorld({ cwd: 'p', config, repo: { at: 'p' }, files: { 'p/notes.txt': 'base\n' }, run: ['git add .', 'git commit -m "c1"', ...run] })
const FEATURE = ['git switch -c feature', 'echo f > f.txt', 'git add .', 'git commit -m "f1"', 'git switch main']
const MAIN = ['echo m > m.txt', 'git add .', 'git commit -m "m1"']
const merged = () => built([...FEATURE, ...MAIN, 'git merge --no-edit feature'])
const conflicted = () =>
  runLine(built(['git switch -c feature', 'echo theirs > notes.txt', 'git add .', 'git commit -m "f1"', 'git switch main', 'echo ours > notes.txt', 'git add .', 'git commit -m "m1"']), 'git merge feature').world

describe('RepoMap', () => {
  const area = (name: string) => {
    const el = screen.getByRole('region', { name: new RegExp(`^${name}`) })
    return { el, items: [...el.querySelectorAll('li')].map((li) => li.textContent) }
  }
  const world3 = () =>
    createWorld({
      files: { 'p/loose.txt': 'x' },
      repo: { at: 'p', commits: [{ message: 'first', files: { 'a.txt': '1' } }, { message: 'second', files: { 'a.txt': '2' } }], staged: { 'b.txt': '2' } },
    })

  it('gives file and commit rows a title with the full text', () => {
    render(<RepoMap world={world3()} />)
    expect(area('Folder').el.querySelector('li')?.getAttribute('title')).toBe('loose.txt')
    expect(area('Staged').el.querySelector('li')?.getAttribute('title')).toBe('b.txt')
    expect(area('Saved').el.querySelector('li')?.getAttribute('title')).toMatch(/^[0-9a-f]{7} second$/)
  })

  it('shows Folder, Staged and Saved with items and counts', () => {
    const w = world3()
    const abs = Object.keys(w.files).find((k) => k.endsWith('/p/a.txt'))!
    w.files[abs] = 'edited'
    render(<RepoMap world={w} />)
    const folder = area('Folder')
    expect(folder.items).toEqual(['a.txt', 'loose.txt'])
    expect(folder.el.querySelector('em')?.textContent).toBe('2')
    expect(area('Staged').items).toEqual(['b.txt'])
    const saved = area('Saved')
    expect(saved.el.querySelector('em')?.textContent).toBe('2')
    expect(saved.items[0]).toMatch(/^[0-9a-f]{7}second$/)
    expect(saved.items[1]).toMatch(/^[0-9a-f]{7}first$/)
  })

  it('moves a file from Folder to Staged to Saved as commands run', () => {
    let w = createWorld({ cwd: 'p', repo: { at: 'p', commits: [{ message: 'first', files: { 'a.txt': '1' } }] }, config: { 'user.name': 'A', 'user.email': 'a@b.c' } })
    w = runLine(w, 'echo hi > new.txt').world
    const { rerender } = render(<RepoMap world={w} />)
    expect(area('Folder').items).toEqual(['new.txt'])
    expect(area('Staged').items).toEqual([])
    w = runLine(w, 'git add new.txt').world
    rerender(<RepoMap world={w} />)
    expect(area('Folder').items).toEqual([])
    expect(area('Staged').items).toEqual(['new.txt'])
    w = runLine(w, 'git commit -m "Add new file"').world
    rerender(<RepoMap world={w} />)
    expect(area('Staged').items).toEqual([])
    expect(area('Saved').items[0]).toMatch(/^[0-9a-f]{7}Add new file$/)
    expect(area('Saved').el.querySelector('em')?.textContent).toBe('2')
  })

  it('shows 3 items then "+N more"', () => {
    const files: Record<string, string> = {}
    for (const n of ['a', 'b', 'c', 'd', 'e']) files[`p/${n}.txt`] = n
    render(<RepoMap world={createWorld({ files, repo: { at: 'p' } })} />)
    const folder = area('Folder')
    expect(folder.items).toEqual(['a.txt', 'b.txt', 'c.txt', '+2 more'])
    expect(folder.el.querySelector('em')?.textContent).toBe('5')
  })

  it('says what to do in each empty area', () => {
    const { container } = render(<RepoMap world={createWorld({ repo: { at: 'p' } })} />)
    expect(container.querySelector('p p')).toBeNull()
    expect(area('Folder').el.textContent).toContain('Nothing changed')
    const staged = area('Staged').el
    expect(staged.textContent).toContain('Nothing staged yet')
    expect(staged.querySelector('code.cmd')?.textContent).toBe('git add')
    const saved = area('Saved').el
    expect(saved.textContent).toContain('No commits yet')
    expect(saved.querySelector('code.cmd')?.textContent).toBe('git commit')
  })

  it('keeps connector labels as non-clickable pills', () => {
    const { container } = render(<RepoMap world={world3()} />)
    const labels = [...container.querySelectorAll('.arrow code.cmd')].map((e) => e.textContent)
    expect(labels).toEqual(['add', 'commit'])
    expect(container.querySelectorAll('button')).toHaveLength(0)
  })

  it('shows the branch name in the header', () => {
    const { container } = render(<RepoMap world={world3()} />)
    expect(container.querySelector('.repomap-branch')?.textContent).toBe('main')
  })

  it('has a summarising aria-label', () => {
    const world = createWorld({ repo: { at: 'p', commits: [{ message: 'first', files: { 'a.txt': '1' } }] } })
    render(<RepoMap world={world} />)
    expect(screen.getByRole('img').getAttribute('aria-label')).toMatch(/^1 commit on main\. HEAD is on main at [0-9a-f]{7}\.$/)
  })

  it('shows an empty state for an unborn branch', () => {
    const world = createWorld({ repo: { at: 'p' } })
    const { container } = render(<RepoMap world={world} />)
    expect(screen.getByText('No commits yet')).toBeTruthy()
    expect(container.querySelector('svg')).toBeNull()
  })

  it('explains git init outside a repo', () => {
    const { container } = render(<RepoMap world={createWorld()} />)
    expect(container.textContent).toContain('Not a Git repository yet. Run')
    expect(container.querySelector('code.cmd')?.textContent).toBe('git init')
    expect(container.querySelector('svg')).toBeNull()
  })

  it('says HEAD is detached', () => {
    const world = createWorld({ repo: { at: 'p', commits: [{ message: 'first', files: { 'a.txt': '1' } }] } })
    const repo = world.repo!
    const id = Object.keys(repo.commits)[0]!
    repo.head = { kind: 'detached', id }
    const { container } = render(<RepoMap world={world} />)
    expect(container.querySelector('.repomap-branch')?.textContent).toBe(`HEAD detached at ${id.slice(0, 7)}`)
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(`1 commit on main. HEAD is detached at ${id.slice(0, 7)}.`)
  })

  it('draws cross-lane edges as curves', () => {
    const world = createWorld({ repo: { at: 'p', commits: [{ message: 'a', files: { 'a.txt': '1' } }] } })
    const repo = world.repo!
    const base = Object.values(repo.commits)[0]!
    repo.commits.feed123 = { ...base, id: 'feed123', parents: [base.id], message: 'x', time: 99 }
    repo.branches.topic = 'feed123'
    const { container } = render(<RepoMap world={world} />)
    const ds = [...container.querySelectorAll('path.edge')].map((p) => p.getAttribute('d') ?? '')
    expect(ds.some((d) => d.includes(' C'))).toBe(true)
  })

  it("Saved lists a merged branch's commits", () => {
    const w = merged()
    render(<RepoMap world={w} />)
    const saved = area('Saved')
    expect(saved.el.querySelector('em')?.textContent).toBe('4')
    expect(saved.items[0]).toMatch(/^[0-9a-f]{7}Merge branch 'feature'$/)
    const titles = [...saved.el.querySelectorAll('li.saved')].map((li) => li.getAttribute('title') ?? '')
    expect(titles.map((t) => t.slice(8))).toEqual(["Merge branch 'feature'", 'm1', 'f1'])
  })

  it('conflict badge', () => {
    const w = conflicted()
    expect(w.repo!.op?.conflicts).toEqual(['notes.txt'])
    const { container } = render(<RepoMap world={w} />)
    const folder = area('Folder')
    const li = folder.el.querySelector('li.file-conflict')!
    expect(li).not.toBeNull()
    expect(li.querySelector('.file-badge')?.textContent).toBe('!')
    expect(li.textContent).toContain('notes.txt')
    expect(li.textContent).toContain('conflict')
    expect(folder.items.filter((t) => t?.includes('notes.txt'))).toHaveLength(1)
    expect(container.querySelector('.repomap-op')?.textContent).toBe('Merging feature')
  })

  it('does not say Merging for a conflicted stash pop', () => {
    const r = runLine(built(['echo stashed > notes.txt', 'git stash', 'echo other > notes.txt', 'git add .', 'git commit -m "c2"']), 'git stash pop')
    const w = r.world
    expect(r.lines.map((l) => l.map((x) => x.text).join('')).join('\n')).toContain('CONFLICT')
    expect(w.repo!.op).toBeNull()
    const { container } = render(<RepoMap world={w} />)
    expect(container.querySelector('.repomap-op')).toBeNull()
  })

  it('stash chip', () => {
    let w = built(['echo edit > notes.txt'])
    const { container, rerender } = render(<RepoMap world={w} />)
    expect(container.querySelector('.repomap-stash')).toBeNull()
    w = runLine(w, 'git stash').world
    rerender(<RepoMap world={w} />)
    expect(container.querySelector('.repomap-stash')?.textContent).toBe('Stash: 1')
  })

  it('aria summary names branches', () => {
    render(<RepoMap world={conflicted()} />)
    const label = screen.getByRole('img').getAttribute('aria-label') ?? ''
    expect(label).toMatch(/^3 commits on main and feature\. HEAD is on main at [0-9a-f]{7}\. Merging feature: 1 conflict to fix\.$/)
  })

  it('draws a merge, a lost commit and stacked labels without axe violations', async () => {
    const w = built([...FEATURE, ...MAIN, 'git merge --no-edit feature', 'git reset --hard HEAD~1'])
    const { container } = render(<RepoMap world={w} />)
    expect(container.querySelectorAll('.node-lost')).toHaveLength(1)
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })

  describe('with a remote', () => {
    const SERVER = { slug: 'team/notes', commits: [{ message: 'Add notes', files: { 'notes.txt': 'one\n' } }] }
    const ahead = () => {
      const w = buildWorld({ config, remote: SERVER, run: ['git clone https://git.example.com/team/notes.git', 'cd notes', 'echo a > a.txt', 'git add .', 'git commit -m "a"'] })
      const repo = w.repo!
      const tip = repo.branches.main as string
      return { w: { ...w, repo: { ...repo, branches: { ...repo.branches, main: tip } } }, repo }
    }

    it('sync chip shows ahead and behind', () => {
      const { w, repo } = ahead()
      const { rerender } = render(<RepoMap world={w} />)
      expect(screen.getByText('↑1 to push')).toBeInTheDocument()
      const chip = document.querySelector('.repomap-sync')!
      expect(chip).toHaveAttribute('title', expect.stringMatching(/as of your last fetch/))
      expect(screen.getByText('↑1 to push')).toHaveAttribute('aria-hidden', 'true')
      expect(chip.querySelectorAll('.sr-only')).toHaveLength(1)
      expect(chip.querySelector('.sr-only')).toHaveTextContent(/↑1 to push, compared with .*as of your last fetch/)
      const base = repo.remoteRefs['origin/main']!
      const parent = repo.commits[repo.branches.main as string]!.parents[0]!
      expect(parent).toBe(base)
      const behind = { ...repo, branches: { main: base }, remoteRefs: { 'origin/main': repo.branches.main as string } }
      rerender(<RepoMap world={{ ...w, repo: behind }} />)
      expect(screen.getByText('↓1 to pull')).toBeInTheDocument()
      const sync = { ...repo, branches: { ...repo.branches }, remoteRefs: { 'origin/main': repo.branches.main as string } }
      rerender(<RepoMap world={{ ...w, repo: sync }} />)
      expect(screen.getByText('In sync')).toBeInTheDocument()
    })

    it('text alternative names origin/main', () => {
      const { w, repo } = ahead()
      render(<RepoMap world={w} />)
      const label = screen.getByRole('img').getAttribute('aria-label') ?? ''
      expect(label).toContain(`origin/main at ${repo.remoteRefs['origin/main']!.slice(0, 7)}`)
    })

    it('axe passes with remote labels', async () => {
      const { w } = ahead()
      const { container } = render(<RepoMap world={w} />)
      expect(container.querySelectorAll('.label-remote')).toHaveLength(1)
      expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
    })
  })
})
