import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useRef } from 'react'
import { useFocusTrap } from './useFocusTrap'

function Box({ children }: { children?: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref, true)
  return (
    <div ref={ref} data-testid="root">
      {children}
    </div>
  )
}

describe('useFocusTrap', () => {
  it('focuses the root when nothing inside is focusable and keeps focus there', async () => {
    render(<Box />)
    const root = screen.getByTestId('root')
    expect(root).toHaveFocus()
    await userEvent.tab()
    expect(root).toHaveFocus()
  })

  it('wraps Shift+Tab from the root to the last control', async () => {
    render(
      <Box>
        <button>a</button>
        <button>b</button>
      </Box>,
    )
    const root = screen.getByTestId('root')
    root.tabIndex = -1
    root.focus()
    await userEvent.tab({ shift: true })
    expect(screen.getByText('b')).toHaveFocus()
  })
})

describe('useFocusTrap fallback', () => {
  it('returns focus to the fallback when the opener cannot take it back', () => {
    const opener = document.createElement('button')
    const stand = document.createElement('button')
    document.body.append(opener, stand)
    opener.focus()
    opener.disabled = true
    function Fb() {
      const ref = useRef<HTMLDivElement>(null)
      const fb = useRef<HTMLElement | null>(stand)
      useFocusTrap(ref, true, fb)
      return <div ref={ref} />
    }
    const { unmount } = render(<Fb />)
    unmount()
    expect(stand).toHaveFocus()
    opener.remove()
    stand.remove()
  })
})
