import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router'
import { axe } from 'vitest-axe'
import App from '../App'
import { STORAGE_KEY } from '../../progress/store'
import { findLesson } from '../../lessons/course'

function open() {
  const user = userEvent.setup()
  const utils = render(
    <MemoryRouter initialEntries={['/learn/first-commit']}>
      <App />
    </MemoryRouter>,
  )
  return { user, ...utils }
}

const pages = () => findLesson('first-commit')!.pages!
const title = (name: string) => screen.getByRole('heading', { level: 2, name })
const input = () => screen.getByRole('textbox', { name: 'Terminal input' })
const continueBtn = () => screen.getByRole('button', { name: 'Continue' })
/** Steps past the guard that stops the Enter that passed a step from also pressing Continue. */
const later = () => vi.setSystemTime(Date.now() + 1000)

async function toPage(user: ReturnType<typeof userEvent.setup>, n: number) {
  for (let i = 0; i < n; i++) await user.click(continueBtn())
}

describe('Calm lesson pages (first-commit)', () => {
  beforeEach(() => localStorage.clear())
  afterEach(() => vi.useRealTimers())

  it('has seven pages, two of them bound to the two runner steps', () => {
    const ps = pages()
    expect(ps.map((p) => p.kind)).toEqual(['read', 'read', 'do', 'do', 'read', 'read', 'finish'])
    expect(ps.flatMap((p) => (p.kind === 'do' ? [p.step] : []))).toEqual([0, 1])
  })

  it('shows the pages in order with progress dots', async () => {
    const { user } = open()
    expect(screen.getByRole('heading', { level: 1, name: 'Your first commit' })).toBeInTheDocument()
    expect(title('You have a project with a file in it')).toBeInTheDocument()
    const bar = screen.getByRole('progressbar', { name: 'Lesson progress' })
    expect(bar).toHaveAttribute('aria-valuetext', 'Page 1 of 7')
    // Only the Folder box is shown, holding the real file.
    expect(screen.getByRole('region', { name: 'Folder' })).toHaveTextContent('notes.txt')
    expect(screen.queryByRole('region', { name: 'Staged' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Back' })).toBeNull()
    await user.click(continueBtn())
    expect(title('Saving takes two small moves')).toHaveFocus()
    expect(bar).toHaveAttribute('aria-valuetext', 'Page 2 of 7')
    for (const box of ['Folder', 'Staged', 'Saved']) expect(screen.getByRole('region', { name: box })).toBeInTheDocument()
    await user.click(continueBtn())
    expect(title('Choose the file')).toBeInTheDocument()
    expect(input()).toHaveFocus()
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(title('Saving takes two small moves')).toBeInTheDocument()
  })

  it('continues with Enter on a read page', async () => {
    const { user } = open()
    await user.keyboard('{Enter}')
    expect(title('Saving takes two small moves')).toBeInTheDocument()
  })

  it('shows the command on one line with what each part means under it', async () => {
    const { user, container } = open()
    await toPage(user, 2)
    const line = container.querySelector('.cc-line') as HTMLElement
    expect(line.textContent).toBe('git add notes.txt')
    expect(line.querySelectorAll('.cc-tok')).toHaveLength(2)
    const says = screen.getByRole('list', { name: 'What each part means' })
    const items = within(says).getAllByRole('listitem')
    expect(items.map((li) => li.textContent)).toEqual(['git add: put it in the box', 'notes.txt: this file'])
    await user.type(input(), 'git add notes.txt{Enter}')
    later()
    await user.click(continueBtn())
    const commit = container.querySelector('.cc-line') as HTMLElement
    expect(commit.textContent).toBe('git commit -m "Add meeting notes"')
    expect(commit.querySelectorAll('.cc-tok')).toHaveLength(3)
    expect(within(screen.getByRole('list', { name: 'What each part means' })).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      'git commit: save what is chosen',
      '-m: add a message',
      '"Add meeting notes": the message',
    ])
  })

  it('keeps Continue off until the command passes, and explains a half-typed command', async () => {
    const { user } = open()
    await toPage(user, 2)
    expect(continueBtn()).toBeDisabled()
    await user.type(input(), 'git add{Enter}')
    expect(screen.getByRole('log')).toHaveTextContent('Nothing specified, nothing added.')
    expect(screen.getByText(/Git also needs to know/)).toBeInTheDocument()
    expect(screen.queryByText(/Close\./)).toBeNull()
    expect(continueBtn()).toBeDisabled()
    // The same Enter that passes the step does not also move on.
    await user.type(input(), 'git add notes.txt{Enter}')
    expect(title('Choose the file')).toBeInTheDocument()
    expect(continueBtn()).toBeEnabled()
  })

  it('explains the prompt once, on the first terminal page, and lets the learner hide it', async () => {
    const { user } = open()
    await toPage(user, 2)
    expect(screen.getByText(/The start of the terminal line/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Hide this note' }))
    expect(screen.queryByText(/The start of the terminal line/)).toBeNull()
    await user.type(input(), 'git add notes.txt{Enter}')
    later()
    await user.click(continueBtn())
    expect(title('Save it')).toBeInTheDocument()
    expect(screen.queryByText(/The start of the terminal line/)).toBeNull()
  })

  it('Type it for me fills the input without running it', async () => {
    const { user } = open()
    await toPage(user, 2)
    await user.click(screen.getByRole('button', { name: 'Type it for me' }))
    expect(input()).toHaveValue('git add notes.txt')
    expect(input()).toHaveFocus()
    expect(screen.getByRole('log')).toBeEmptyDOMElement()
    expect(continueBtn()).toBeDisabled()
  })

  it('moves the file to Staged, then saves it, through to the finish page', async () => {
    const { user, container } = open()
    await toPage(user, 2)
    await user.type(input(), 'git add notes.txt{Enter}')
    const result = container.querySelector('.pf-result') as HTMLElement
    expect(result).toHaveAttribute('aria-live', 'polite')
    expect(result).toHaveTextContent('Staged. notes.txt is chosen, but not saved yet.')
    expect(screen.queryByRole('textbox', { name: 'Terminal input' })).toBeNull()
    expect(screen.getByRole('region', { name: 'Staged' })).toHaveTextContent('notes.txt')
    // The file is still in the folder, shown quietly as also staged.
    expect(screen.getByRole('region', { name: 'Folder' })).toHaveTextContent('notes.txtalso staged')
    // The step's own success card stays out of the terminal; the page says it.
    expect(container.querySelector('.fb-ok')).toBeNull()

    later()
    await user.click(continueBtn())
    expect(title('Save it')).toBeInTheDocument()
    expect(screen.getByRole('log')).not.toHaveTextContent('git add')
    await user.type(input(), 'git commit -m "Add meeting notes"{Enter}')
    expect(container.querySelector('.pf-result')).toHaveTextContent('Committed. Your first save is done.')
    expect(screen.getByRole('region', { name: 'Saved' })).toHaveTextContent('Add meeting notes')
    expect(screen.getByRole('region', { name: 'Folder' })).toHaveTextContent('notes.txtsaved')
    // One plain line explains Git's report, with the real ID; the real output stays.
    const repo = container.querySelector('.pf-report') as HTMLElement
    const id = /\[main \(root-commit\) ([0-9a-f]{7})\]/.exec(screen.getByRole('log').textContent ?? '')?.[1]
    expect(id).toBeTruthy()
    expect(repo).toHaveTextContent(`Git printed a short report: ${id} is your commit's ID, and it saved 1 file.`)
    expect(localStorage.getItem(STORAGE_KEY) ?? '').toContain('first-commit')

    later()
    await user.click(continueBtn())
    expect(title('That dot is your commit')).toBeInTheDocument()
    expect(container.querySelector('.pf-graph figcaption')).toHaveTextContent('Add meeting notes')
    expect(container.querySelector('.pf-graph .g-stub')).toBeNull()
    await user.click(continueBtn())
    expect(title('Your work is now safe')).toBeInTheDocument()
    await user.click(continueBtn())
    expect(title('You made your first commit')).toBeInTheDocument()
    const nextLink = screen.getByRole('link', { name: /Next lesson: Write good commit messages/ })
    expect(nextLink).toHaveAttribute('href', '/learn/good-messages')
    expect(nextLink).toHaveFocus()
    expect(screen.getByRole('link', { name: 'Back to course' })).toHaveAttribute('href', '/#course')
    expect(screen.getByRole('status')).toHaveTextContent('Lesson complete')
  })

  it('shows a passed move as done, without the terminal, when coming Back to it', async () => {
    const { user, container } = open()
    await toPage(user, 2)
    await user.type(input(), 'git add notes.txt{Enter}')
    later()
    await user.click(continueBtn())
    await user.click(screen.getByRole('button', { name: 'Back' }))
    expect(title('Choose the file')).toHaveFocus()
    expect(screen.queryByRole('textbox', { name: 'Terminal input' })).toBeNull()
    expect(container.querySelector('.pf-result')).toHaveTextContent('Staged.')
    expect(continueBtn()).toBeEnabled()
    await user.click(continueBtn())
    expect(title('Save it')).toBeInTheDocument()
    expect(input()).toHaveFocus()
  })

  it('opens the message box when git commit is run without -m', async () => {
    const { user } = open()
    await toPage(user, 2)
    await user.type(input(), 'git add notes.txt{Enter}')
    later()
    await user.click(continueBtn())
    await user.type(input(), 'git commit{Enter}')
    const msg = screen.getByRole('textbox', { name: 'Edit COMMIT_EDITMSG' })
    await user.type(msg, 'Add meeting notes')
    await user.click(screen.getByRole('button', { name: 'Save and close' }))
    expect(screen.getByText(/Your first save is done/)).toBeInTheDocument()
  })

  it('has no axe violations on a do page', async () => {
    const { user, container } = open()
    await toPage(user, 2)
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
