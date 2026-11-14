import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { ProgressProvider } from '../../progress/ProgressContext'
import { PHONE_OK_KEY, PhoneGate } from './PhoneGate'
import { SendToComputer } from './SendToComputer'

function screenIs(phone: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: phone && query.includes('max-width: 560px'),
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia
}

const gate = () =>
  render(
    <MemoryRouter>
      <ProgressProvider>
        <PhoneGate>
          <p>The app</p>
        </PhoneGate>
      </ProgressProvider>
    </MemoryRouter>,
  )

describe('PhoneGate', () => {
  beforeEach(() => sessionStorage.clear())
  afterEach(() => {
    delete (window as { matchMedia?: unknown }).matchMedia
    vi.restoreAllMocks()
  })

  it('opens the app straight away on a computer', () => {
    screenIs(false)
    gate()
    expect(screen.getByText('The app')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'TermTrek is made for a computer' })).not.toBeInTheDocument()
  })

  it('on a phone, says the app is made for a computer, with a way to send the link', async () => {
    screenIs(true)
    const { container } = gate()
    expect(screen.getByRole('heading', { level: 1, name: 'TermTrek is made for a computer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send to my computer' })).toBeInTheDocument()
    expect(screen.queryByText('The app')).not.toBeInTheDocument()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('"Continue on this phone anyway" opens the app and is remembered for this visit', () => {
    screenIs(true)
    const first = gate()
    fireEvent.click(screen.getByRole('button', { name: 'Continue on this phone anyway' }))
    expect(screen.getByText('The app')).toBeInTheDocument()
    expect(sessionStorage.getItem(PHONE_OK_KEY)).toBe('1')
    first.unmount()
    gate()
    expect(screen.getByText('The app')).toBeInTheDocument()
  })
})

describe('SendToComputer', () => {
  const nav = navigator as { share?: unknown; clipboard?: unknown }
  afterEach(() => {
    delete nav.share
    delete nav.clipboard
  })

  it("opens the phone's share menu with the link", async () => {
    const share = vi.fn().mockResolvedValue(undefined)
    nav.share = share
    render(<SendToComputer url={() => 'https://termtrek.work/'} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send to my computer' })))
    expect(share).toHaveBeenCalledWith(expect.objectContaining({ url: 'https://termtrek.work/' }))
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('closing the share menu is not an error', async () => {
    nav.share = vi.fn().mockRejectedValue(new DOMException('closed', 'AbortError'))
    const writeText = vi.fn()
    nav.clipboard = { writeText }
    render(<SendToComputer url={() => 'https://termtrek.work/'} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send to my computer' })))
    expect(writeText).not.toHaveBeenCalled()
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('copies the link where there is no share menu', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    nav.clipboard = { writeText }
    render(<SendToComputer url={() => 'https://termtrek.work/'} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send to my computer' })))
    expect(writeText).toHaveBeenCalledWith('https://termtrek.work/')
    expect(screen.getByRole('status')).toHaveTextContent('Link copied')
  })

  it('shows the link to copy by hand when copying is blocked', async () => {
    nav.clipboard = { writeText: vi.fn().mockRejectedValue(new Error('blocked')) }
    render(<SendToComputer url={() => 'https://termtrek.work/'} />)
    await act(async () => fireEvent.click(screen.getByRole('button', { name: 'Send to my computer' })))
    expect(screen.getByRole('status')).toHaveTextContent('Copy this link: https://termtrek.work/')
  })
})
