import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProgressProvider } from '../progress/ProgressContext'
import { emptyProgress, exportBackup, markComplete } from '../progress/store'
import { BackupDialog } from './BackupDialog'

function fakeStorage(): Storage {
  const m = new Map<string, string>()
  return {
    get length() {
      return m.size
    },
    clear: () => m.clear(),
    getItem: (k: string) => m.get(k) ?? null,
    key: (i: number) => Array.from(m.keys())[i] ?? null,
    removeItem: (k: string) => void m.delete(k),
    setItem: (k: string, v: string) => void m.set(k, v),
  }
}

function setup(onClose = vi.fn()) {
  render(
    <ProgressProvider storage={fakeStorage()}>
      <BackupDialog onClose={onClose} />
    </ProgressProvider>,
  )
  return onClose
}

function backupFile(ids: string[]) {
  let p = emptyProgress()
  for (const id of ids) p = markComplete(p, id, '2026-01-01T00:00:00.000Z')
  return new File([exportBackup(p, '2026-01-02T00:00:00.000Z')], 'b.json', {
    type: 'application/json',
  })
}

describe('BackupDialog', () => {
  it('renders the dialog and privacy line', () => {
    setup()
    expect(screen.getByRole('dialog', { name: 'Your progress' })).toBeInTheDocument()
    expect(screen.getByText('Your progress is saved only in this browser.')).toBeInTheDocument()
  })

  it('loads a backup with one lesson (singular)', async () => {
    setup()
    await userEvent.upload(screen.getByLabelText('Load a backup'), backupFile(['a']))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Progress loaded: 1 lesson completed.',
    )
  })

  it('loads a backup with several lessons (plural)', async () => {
    setup()
    await userEvent.upload(screen.getByLabelText('Load a backup'), backupFile(['a', 'b']))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Progress loaded: 2 lessons completed.',
    )
  })

  it('shows an error for a bad file', async () => {
    setup()
    const bad = new File(['nope'], 'x.json', { type: 'application/json' })
    await userEvent.upload(screen.getByLabelText('Load a backup'), bad)
    expect(await screen.findByRole('alert')).toHaveTextContent("isn't a TermTrek backup")
  })

  it('closes on Escape and the Close button', async () => {
    const onClose = setup()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalledTimes(1)
    await userEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('returns focus to the opener on unmount', () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { unmount } = render(
      <ProgressProvider storage={fakeStorage()}>
        <BackupDialog onClose={vi.fn()} />
      </ProgressProvider>,
    )
    expect(opener).not.toHaveFocus()
    unmount()
    expect(opener).toHaveFocus()
    opener.remove()
  })

  it('downloads a dated backup through a blob', async () => {
    setup()
    const create = vi.fn(() => 'blob:x')
    const revoke = vi.fn()
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke })
    let name = ''
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        name = this.download
      })
    await userEvent.click(screen.getByRole('button', { name: 'Download backup' }))
    expect(name).toMatch(/^termtrek-progress-\d{4}-\d{2}-\d{2}\.json$/)
    await vi.waitFor(() => expect(revoke).toHaveBeenCalledWith('blob:x'), { timeout: 2000 })
    click.mockRestore()
  })
})

describe('BackupDialog focus', () => {
  it('traps focus, closes on Escape and returns focus to the opener', async () => {
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const onClose = vi.fn()
    const { unmount } = render(
      <ProgressProvider storage={fakeStorage()}>
        <BackupDialog onClose={onClose} />
      </ProgressProvider>,
    )
    const dialog = screen.getByRole('dialog')
    const items = Array.from(dialog.querySelectorAll<HTMLElement>('button, input'))
    const first = items[0]!
    const last = items[items.length - 1]!
    expect(first).toHaveFocus()
    await userEvent.tab({ shift: true })
    expect(last).toHaveFocus()
    await userEvent.tab()
    expect(first).toHaveFocus()
    await userEvent.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
    unmount()
    expect(opener).toHaveFocus()
    opener.remove()
  })
})
