import { act, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { axe } from 'vitest-axe'
import { ProgressProvider } from '../../progress/ProgressContext'
import { PhoneGate } from './PhoneGate'
import { SendToComputer } from './SendToComputer'

function screenIs(phone: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: phone && query === '(max-width: 743px), (max-height: 499px)',
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
  afterEach(() => {
    delete (window as { matchMedia?: unknown }).matchMedia
    vi.restoreAllMocks()
  })

  it('opens the app straight away on a computer', () => {
    screenIs(false)
    gate()
    expect(screen.getByText('The app')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'TermTrek is made for an iPad or a computer' })).not.toBeInTheDocument()
  })

  it('on a phone, says the app is made for a computer, with a way to send the link', async () => {
    screenIs(true)
    const { container } = gate()
    expect(screen.getByRole('heading', { level: 1, name: 'TermTrek is made for an iPad or a computer' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Send to my computer' })).toBeInTheDocument()
    expect(screen.queryByText('The app')).not.toBeVisible()
    expect(await axe(container)).toHaveNoViolations()
  })

  it('keeps the page mounted, hidden, while the notice shows, so a resize loses nothing', () => {
    let on = () => {}
    let phone = true
    window.matchMedia = ((query: string) => ({
      get matches() {
        return phone && query === '(max-width: 743px), (max-height: 499px)'
      },
      media: query,
      addEventListener: (_: string, f: () => void) => {
        on = f
      },
      removeEventListener: () => {},
    })) as unknown as typeof window.matchMedia
    function Counter() {
      const [n, setN] = useState(0)
      return <button onClick={() => setN(n + 1)}>count {n}</button>
    }
    render(
      <MemoryRouter>
        <ProgressProvider>
          <PhoneGate>
            <Counter />
          </PhoneGate>
        </ProgressProvider>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'TermTrek is made for an iPad or a computer' })).toBeInTheDocument()
    fireEvent.click(screen.getByText('count 0', { selector: 'button' }))
    phone = false
    act(() => on())
    expect(screen.queryByRole('heading', { level: 1, name: 'TermTrek is made for an iPad or a computer' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'count 1' })).toBeVisible()
    phone = true
    act(() => on())
    expect(screen.getByRole('button', { hidden: true, name: 'count 1' })).not.toBeVisible()
    phone = false
    act(() => on())
    expect(screen.getByRole('button', { name: 'count 1' })).toBeVisible()
  })

  it('has no "Continue" button and never reads or sets the old remember key', () => {
    const get = vi.spyOn(Storage.prototype, 'getItem')
    const set = vi.spyOn(Storage.prototype, 'setItem')
    screenIs(true)
    gate()
    expect(screen.queryByRole('button', { name: /continue/i })).not.toBeInTheDocument()
    expect(screen.getByText('Open this page on a tablet, laptop or desktop to start learning.')).toBeInTheDocument()
    expect(screen.getByText('On a computer? Make the window bigger.')).toBeInTheDocument()
    expect(get.mock.calls.filter((c) => c[0] === 'termtrek_phone_ok')).toHaveLength(0)
    expect(set.mock.calls.filter((c) => c[0] === 'termtrek_phone_ok')).toHaveLength(0)
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
