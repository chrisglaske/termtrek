import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { buildWorld } from '../../engine/setup'
import { openPr } from '../../engine/remote/pr'
import type { World } from '../../engine/types'
import { RemotePanel } from './RemotePanel'

const config = { 'user.name': 'Sam', 'user.email': 's@x.com' }
const SERVER = { slug: 'team/notes', commits: [{ message: 'Add notes', files: { 'notes.txt': 'one\n' } }] }
const URL = 'https://git.example.com/team/notes.git'

function withPr(): World {
  const w = buildWorld({
    config,
    remote: SERVER,
    run: [`git clone ${URL}`, 'cd notes', 'git switch -c homepage', 'echo hi > home.html', 'git add .', 'git commit -m "Add a home page"', 'git push -u origin homepage'],
  })
  const r = openPr(w, { head: 'homepage', base: 'main', title: 'Add a home page', body: '' })
  if (!r.ok) throw new Error(r.error)
  return r.world
}

const noop = () => {}
const show = (world: World, extra: Partial<Parameters<typeof RemotePanel>[0]> = {}) =>
  render(<RemotePanel world={world} error={null} onOpenPr={noop} onMergePr={noop} onDeleteBranch={noop} {...extra} />)

describe('RemotePanel', () => {
  it('overview lists branches, commits and PRs', () => {
    show(withPr())
    expect(screen.getByText('team/notes')).toBeInTheDocument()
    expect(screen.getByText(`git clone ${URL}`)).toBeInTheDocument()
    const branches = screen.getByRole('region', { name: /Branches/ })
    expect(within(branches).getByText('default')).toBeInTheDocument()
    expect(within(branches).getByText('1 ahead of main')).toBeInTheDocument()
    expect(within(branches).getByText('Add a home page')).toBeInTheDocument()
    const commits = screen.getByRole('region', { name: /Recent commits/ })
    expect(within(commits).getByText('Add notes')).toBeInTheDocument()
    expect(within(commits).getByText('Alex Kim')).toBeInTheDocument()
    const prs = screen.getByRole('region', { name: /Pull requests/ })
    expect(within(prs).getByText('#1')).toBeInTheDocument()
    expect(within(prs).getByText('Open')).toBeInTheDocument()
    expect(within(prs).getByText('Add a home page')).toBeInTheDocument()
    expect(within(prs).getByText('GitLab calls these merge requests.')).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Activity' })).toHaveTextContent('You opened pull request #1: Add a home page')
  })

  it('empty server shows the push commands', () => {
    const w = buildWorld({ config, remote: { slug: 'team/project' }, run: [] })
    show(w)
    expect(screen.getByText('This repository is empty.')).toBeInTheDocument()
    expect(screen.getByText('git remote add origin https://git.example.com/team/project.git')).toBeInTheDocument()
    expect(screen.getByText('git push -u origin main')).toBeInTheDocument()
  })

  it('delete branch calls onDeleteBranch', async () => {
    const onDeleteBranch = vi.fn()
    show(withPr(), { onDeleteBranch })
    expect(screen.queryByRole('button', { name: 'Delete branch main' })).toBeNull()
    await userEvent.click(screen.getByRole('button', { name: 'Delete branch homepage' }))
    expect(onDeleteBranch).toHaveBeenCalledWith('homepage')
  })

  it('shows the error and opens the views', async () => {
    show(withPr(), { error: 'Push **x** first.' })
    expect(screen.getByText('Warning')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'New pull request' }))
    expect(screen.getByText('New pull request', { selector: 'b' })).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'Back' }))
    await userEvent.click(screen.getByRole('button', { name: /#1/ }))
    expect(screen.getByRole('heading', { name: /Add a home page/ })).toBeInTheDocument()
  })

  it('axe passes', async () => {
    const { container } = show(withPr())
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
    const empty = show(buildWorld({ config, remote: { slug: 'team/project' }, run: [] }))
    expect(await axe(empty.container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
