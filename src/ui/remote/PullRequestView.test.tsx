import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { buildWorld } from '../../engine/setup'
import { addPrComment, deleteRemoteBranch, mergePr, openPr } from '../../engine/remote/pr'
import type { World } from '../../engine/types'
import { RemotePanel } from './RemotePanel'

const config = { 'user.name': 'Sam', 'user.email': 's@x.com' }
const SERVER = { slug: 'team/notes', commits: [{ message: 'Add notes', files: { 'notes.txt': 'one\n' } }] }
const URL = 'https://git.example.com/team/notes.git'
const noaxe = { rules: { 'color-contrast': { enabled: false } } }

function pushed(extra: string[] = []): World {
  return buildWorld({
    config,
    remote: SERVER,
    run: [`git clone ${URL}`, 'cd notes', 'git switch -c homepage', 'echo hi > home.html', 'git add .', 'git commit -m "Add a home page"', 'git push -u origin homepage', ...extra],
  })
}
function withPr(w: World = pushed()): World {
  const r = openPr(w, { head: 'homepage', base: 'main', title: 'Add a home page', body: 'The first version.' })
  if (!r.ok) throw new Error(r.error)
  return r.world
}
const noop = () => {}
const show = (world: World, extra: Partial<Parameters<typeof RemotePanel>[0]> = {}) =>
  render(<RemotePanel world={world} error={null} onOpenPr={noop} onMergePr={noop} onDeleteBranch={noop} {...extra} />)
const openFirst = () => userEvent.click(screen.getByRole('button', { name: /#1/ }))
const openForm = () => userEvent.click(screen.getByRole('button', { name: 'New pull request' }))

describe('new pull request form', () => {
  it('prefills the title and creates', async () => {
    const onOpenPr = vi.fn()
    show(pushed(), { onOpenPr })
    await openForm()
    expect(screen.getByLabelText('Compare')).toHaveValue('homepage')
    expect(screen.getByLabelText('Base')).toHaveValue('main')
    expect(screen.getByLabelText('Title')).toHaveValue('Add a home page')
    expect(screen.getByText(/1 commit, 1 file changed\./)).toBeInTheDocument()
    expect(screen.getByText('home.html')).toBeInTheDocument()
    await userEvent.type(screen.getByLabelText('Description'), 'Hello')
    await userEvent.click(screen.getByRole('button', { name: 'Create pull request' }))
    expect(onOpenPr).toHaveBeenCalledWith({ head: 'homepage', base: 'main', title: 'Add a home page', body: 'Hello' })
  })

  it('leaves the title empty with several commits', async () => {
    show(pushed(['echo more >> home.html', 'git commit -am "Add more"', 'git push']))
    await openForm()
    expect(screen.getByText(/2 commits, 1 file changed\./)).toBeInTheDocument()
    expect(screen.getByLabelText('Title')).toHaveValue('')
  })

  it('shows the open error', async () => {
    show(pushed(), { error: "Push **x** first: the server doesn't have that branch yet." })
    await openForm()
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  it('switches to the new pull request once the server has it', async () => {
    const w = pushed()
    const view = show(w)
    await openForm()
    await userEvent.click(screen.getByRole('button', { name: 'Create pull request' }))
    expect(screen.getByRole('button', { name: 'Create pull request' })).toBeInTheDocument()
    view.rerender(<RemotePanel world={withPr(w)} error={null} onOpenPr={noop} onMergePr={noop} onDeleteBranch={noop} />)
    expect(await screen.findByRole('heading', { name: /Add a home page/ })).toBeInTheDocument()
  })
})

describe('pull request view', () => {
  it('conversation shows the approval and the requested changes', async () => {
    let w = withPr()
    w = addPrComment(w, 1, { author: 'Alex Kim', body: 'Add a welcome line please.', kind: 'changes' })
    w = addPrComment(w, 1, { author: 'Alex Kim', body: 'Thanks, ship it!', kind: 'approve' })
    show(w)
    await openFirst()
    expect(screen.getByText('The first version.')).toBeInTheDocument()
    expect(screen.getByText('requested changes')).toBeInTheDocument()
    expect(screen.getByText('approved these changes')).toBeInTheDocument()
    expect(screen.getByText('Thanks, ship it!')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: /Commits 1/ })).toBeInTheDocument()
  })

  it('merge box clean calls onMergePr', async () => {
    const onMergePr = vi.fn()
    show(withPr(), { onMergePr })
    await openFirst()
    expect(screen.getByText(/No conflicts with main/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Create a merge commit' }))
    expect(onMergePr).toHaveBeenCalledWith(1)
  })

  it('says when main has moved on', async () => {
    const w = withPr()
    const remote = w.remote!
    const main = remote.commits[remote.branches.main!]!
    const id = 'aaaaaaa1'
    const moved: World = {
      ...w,
      remote: { ...remote, commits: { ...remote.commits, [id]: { ...main, id, parents: [main.id], tree: { ...main.tree, 'other.txt': 'x\n' }, message: 'Elsewhere', time: main.time + 100 } }, branches: { ...remote.branches, main: id } },
    }
    show(moved)
    await openFirst()
    expect(screen.getByText(/has 1 new commit since this branch started/)).toBeInTheDocument()
  })

  it('merge box conflicts has no merge button', async () => {
    const wp = withPr()
    const r = wp.remote!
    const m = r.commits[r.branches.main!]!
    const id = 'aaaaaaa2'
    const base = { ...m, id, parents: [m.id], tree: { ...m.tree, 'home.html': 'different\n' }, message: 'Main adds home too', time: m.time + 100 }
    show({ ...wp, remote: { ...r, commits: { ...r.commits, [id]: base }, branches: { ...r.branches, main: id } } })
    await openFirst()
    expect(screen.getByText(/This branch has conflicts with/)).toBeInTheDocument()
    expect(screen.getByText(/Update it on your computer, then push\./)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /merge commit/ })).toBeNull()
  })

  it('merged PR offers delete branch', async () => {
    const m = mergePr(withPr(), 1)
    if (!m.ok) throw new Error(m.error)
    const onDeleteBranch = vi.fn()
    show(m.world, { onDeleteBranch })
    await openFirst()
    expect(screen.getByText(/Merged into/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Delete branch' }))
    expect(onDeleteBranch).toHaveBeenCalledWith('homepage')
  })

  it('merged PR with its branch gone has no delete button', async () => {
    const m = mergePr(withPr(), 1)
    if (!m.ok) throw new Error(m.error)
    const d = deleteRemoteBranch(m.world, 'homepage')
    if (!d.ok) throw new Error(d.error)
    show(d.world)
    await openFirst()
    expect(screen.queryByRole('button', { name: 'Delete branch' })).toBeNull()
  })

  it('open PR whose branch was deleted cannot be merged', async () => {
    const d = deleteRemoteBranch(withPr(), 'homepage')
    if (!d.ok) throw new Error(d.error)
    show(d.world)
    await openFirst()
    expect(screen.getByText(/branch was deleted, so this pull request can't be merged\./)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /merge commit/ })).toBeNull()
  })

  it('squash and rebase are explained, not buttons', async () => {
    show(withPr())
    await openFirst()
    expect(screen.queryByRole('button', { name: /Squash and merge/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Rebase and merge/ })).toBeNull()
    expect(screen.getByText(/combines all the branch's commits into one new commit/)).toBeInTheDocument()
    expect(screen.getByText(/replays each commit on top of/)).toBeInTheDocument()
    expect(screen.getByText('Teams usually pick one style in the repository settings.')).toBeInTheDocument()
  })

  it('commits and files tabs list their content', async () => {
    show(withPr())
    await openFirst()
    await userEvent.click(screen.getByRole('tab', { name: /Commits/ }))
    expect(within(screen.getByRole('tabpanel')).getByText('Add a home page')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('tab', { name: /Files changed/ }))
    expect(within(screen.getByRole('tabpanel')).getByText('home.html')).toBeInTheDocument()
  })

  it('collapses long diffs at 40 lines', async () => {
    const adds = Array.from({ length: 60 }, (_, i) => `echo "line ${i}" >> long.txt`)
    show(withPr(pushed([...adds, 'git add .', 'git commit -m "Long"', 'git push'])))
    await openForm()
    expect(screen.getByRole('button', { name: /Show all 60 lines/ })).toBeInTheDocument()
    expect(screen.queryByText(/line 59/)).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: /Show all 60 lines/ }))
    expect(screen.getByText(/line 59/)).toBeInTheDocument()
  })

  it('axe passes on each view', async () => {
    const w = addPrComment(withPr(), 1, { author: 'Alex Kim', body: 'Nice', kind: 'approve' })
    const a = show(w)
    await openForm()
    expect(await axe(a.container, noaxe)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    await openFirst()
    expect(await axe(a.container, noaxe)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('tab', { name: /Commits/ }))
    expect(await axe(a.container, noaxe)).toHaveNoViolations()
    await userEvent.click(screen.getByRole('tab', { name: /Files changed/ }))
    expect(await axe(a.container, noaxe)).toHaveNoViolations()
  })
})

describe('PR sub-tabs keyboard support', () => {
  it('use roving tabindex and arrow keys, and aria-controls resolves', async () => {
    show(withPr())
    await openFirst()
    const tabs = screen.getAllByRole('tab', { name: /Conversation|Commits|Files changed/ })
    expect(screen.getByRole('tablist', { name: 'Pull request sections' })).toHaveAttribute('aria-orientation', 'horizontal')
    const idx = () => tabs.map((t) => t.tabIndex)
    expect(idx()).toEqual([0, -1, -1])
    tabs[0]!.focus()
    await userEvent.keyboard('{ArrowRight}')
    expect(tabs[1]).toHaveAttribute('aria-selected', 'true')
    expect(tabs[1]).toHaveFocus()
    expect(idx()).toEqual([-1, 0, -1])
    await userEvent.keyboard('{End}')
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowRight}')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{ArrowLeft}')
    expect(tabs[2]).toHaveAttribute('aria-selected', 'true')
    await userEvent.keyboard('{Home}')
    expect(tabs[0]).toHaveAttribute('aria-selected', 'true')
    for (const t of tabs) expect(document.getElementById(t.getAttribute('aria-controls')!)).not.toBeNull()
  })

  it('has headings that do not skip levels in the conversation panel', async () => {
    show(withPr())
    await openFirst()
    const levels = screen.getAllByRole('heading').map((h) => Number(h.tagName[1]))
    // RemotePanel sits under the lesson's h2, so the PR title starts at h3.
    expect(levels[0]).toBe(3)
    for (let i = 1; i < levels.length; i++) expect(levels[i]! - levels[i - 1]!).toBeLessThanOrEqual(1)
    expect(screen.getByRole('tabpanel')).toHaveAttribute('tabindex', '0')
  })
})
