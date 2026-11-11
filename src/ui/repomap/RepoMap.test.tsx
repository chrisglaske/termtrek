import { render, screen } from '@testing-library/react'
import { createWorld } from '../../engine/world'
import { runLine } from '../../engine/interpreter'
import { RepoMap } from './RepoMap'

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
    expect(screen.getByRole('img').getAttribute('aria-label')).toBe(`1 commit. HEAD is detached at ${id.slice(0, 7)}.`)
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
})
