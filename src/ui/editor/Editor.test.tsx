import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { axe } from 'vitest-axe'
import { Editor } from './Editor'

function setup(over: Partial<React.ComponentProps<typeof Editor>> = {}) {
  const onSave = vi.fn()
  const onClose = vi.fn()
  const user = userEvent.setup()
  const utils = render(<Editor name="notes.txt" initial={'one\n'} kind="file" onSave={onSave} onClose={onClose} {...over} />)
  const area = () => screen.getByRole('textbox') as HTMLTextAreaElement
  return { user, onSave, onClose, area, ...utils }
}

const CONFLICT = 'top\n<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> feature\n'

describe('Editor', () => {
  it('saves the edited text with Ctrl+S', async () => {
    const { user, onSave, area } = setup()
    await user.click(area())
    await user.keyboard('{Control>}{End}{/Control}two')
    expect(screen.getByText('Unsaved')).toBeInTheDocument()
    await user.keyboard('{Control>}s{/Control}')
    expect(onSave).toHaveBeenCalledWith('one\ntwo')
    expect(screen.queryByText('Unsaved')).toBeNull()
  })

  it('asks before closing a dirty file', async () => {
    const { user, onClose, area } = setup()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    await user.type(area(), 'x')
    await user.click(screen.getByRole('button', { name: 'Close' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(screen.getByText('Close without saving?')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Keep editing' }))
    expect(screen.queryByText('Close without saving?')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Close' }))
    const ask = screen.getByRole('group', { name: 'Close without saving?' })
    await user.click(ask.querySelector('button') as HTMLButtonElement)
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('closes a message editor without saving', async () => {
    const { user, onClose, onSave } = setup({ name: 'COMMIT_EDITMSG', kind: 'message', initial: '\n# Please enter\n' })
    expect(screen.getByText('Git is waiting for this message. Lines starting with # are ignored.')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Close without saving' }))
    expect(onClose).toHaveBeenCalledTimes(1)
    await user.click(screen.getByRole('button', { name: 'Save and close' }))
    expect(onSave).toHaveBeenCalledWith('\n# Please enter\n')
  })

  it('keeps the current side of a conflict', async () => {
    const { user, area, onSave, container } = setup({ initial: CONFLICT })
    expect(screen.getByText('Conflict 1 of 1')).toBeInTheDocument()
    expect(container.querySelectorAll('.ed-mark')).toHaveLength(3)
    expect(screen.getByRole('button', { name: /Keep incoming/ })).toHaveTextContent('feature')
    await user.click(screen.getByRole('button', { name: /Keep current/ }))
    expect(area().value).toBe('top\nours\n')
    expect(screen.queryByText(/^Conflict/)).toBeNull()
    expect(onSave).not.toHaveBeenCalled()
    expect(screen.getByText('Unsaved')).toBeInTheDocument()
  })

  it('has no axe violations', async () => {
    const { container } = setup({ initial: CONFLICT })
    expect(await axe(container, { rules: { 'color-contrast': { enabled: false } } })).toHaveNoViolations()
  })
})
