import { Nav } from '../layout/Nav'
import { useDocumentTitle } from '../layout/useDocumentTitle'
import { SendToComputer } from './SendToComputer'
import { usePhone } from './usePhone'
import './phone.css'

function Notice(): React.JSX.Element {
  useDocumentTitle('TermTrek is made for an iPad or a computer')
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
        <h1>TermTrek is made for an iPad or a computer</h1>
        <p className="gate-sub">Open this page on a tablet, laptop or desktop to start learning.</p>
        <ul className="gate-why">
          <li>You type real commands, which is much easier with a keyboard.</li>
          <li>The picture and the terminal sit side by side, so you see each change as it happens.</li>
          <li>Your progress is saved on the device you use, so start where you'll keep going.</li>
        </ul>
        <SendToComputer url={() => window.location.href} />
        <p className="gate-fine">On a computer? Make the window bigger.</p>
      </main>
    </>
  )
}

/**
 * Below an iPad mini, the app's pages only say they are made for an iPad or a computer.
 * The page stays mounted (hidden and inert) behind the notice, so growing the window back loses nothing.
 */
export function PhoneGate({ children }: { children: React.ReactNode }): React.JSX.Element {
  const phone = usePhone()
  return (
    <>
      {phone ? <Notice /> : null}
      <div className="gate-app" hidden={phone} inert={phone}>
        {children}
      </div>
    </>
  )
}
