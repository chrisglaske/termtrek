import { useState } from 'react'
import { Nav } from '../layout/Nav'
import { useDocumentTitle } from '../layout/useDocumentTitle'
import { SendToComputer } from './SendToComputer'
import { usePhone } from './usePhone'
import './phone.css'

/** Remembered until the tab closes: the visitor chose to stay on the phone. */
export const PHONE_OK_KEY = 'termtrek_phone_ok'

const readOk = (): boolean => {
  try {
    return sessionStorage.getItem(PHONE_OK_KEY) === '1'
  } catch {
    return false
  }
}

function Notice({ onContinue }: { onContinue(): void }): React.JSX.Element {
  useDocumentTitle('TermTrek is made for a computer')
  return (
    <>
      <Nav />
      <main id="main" className="gate" tabIndex={-1}>
        <span className="gate-i" aria-hidden="true">
          <svg width="30" height="30" viewBox="0 0 24 24" focusable="false">
            <rect x="3" y="4" width="18" height="12" rx="2" fill="none" stroke="currentColor" strokeWidth="1.8" />
            <path d="M2 20h20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
        </span>
        <h1>TermTrek is made for a computer</h1>
        <p className="gate-sub">Open this page on your laptop or desktop to start learning.</p>
        <ul className="gate-why">
          <li>You type real commands, which is much easier with a keyboard.</li>
          <li>The picture and the terminal sit side by side, so you see each change as it happens.</li>
          <li>Your progress is saved on the device you use, so start where you'll keep going.</li>
        </ul>
        <SendToComputer url={() => window.location.href} />
        <button type="button" className="gate-anyway" onClick={onContinue}>
          Continue on this phone anyway
        </button>
      </main>
    </>
  )
}

/** On a phone, the app's pages first say they are made for a computer; "Continue anyway" opens them as usual. */
export function PhoneGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const phone = usePhone()
  const [ok, setOk] = useState(readOk)
  if (!phone || ok) return <>{children}</>
  const go = () => {
    try {
      sessionStorage.setItem(PHONE_OK_KEY, '1')
    } catch {
      // Private mode: it still opens, and asks again next time.
    }
    setOk(true)
    window.scrollTo?.(0, 0)
  }
  return <Notice onContinue={go} />
}
