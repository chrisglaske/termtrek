import { useState } from 'react'
import '../buttons.css'
import './phone.css'

type Result = 'idle' | 'copied' | 'manual'

/**
 * "Send to my computer": opens the phone's own share menu with a link, or copies the link where there is none.
 * Nothing is sent anywhere by the site itself.
 */
export function SendToComputer({ url }: { url: () => string }): React.JSX.Element {
  const [result, setResult] = useState<Result>('idle')
  const [link, setLink] = useState('')

  const send = async () => {
    const href = url()
    setLink(href)
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: 'TermTrek',
          text: 'Learn Git by using it. Open this on your computer.',
          url: href,
        })
        return
      } catch (e) {
        // Closing the share menu is a choice, not a failure.
        if (e instanceof DOMException && e.name === 'AbortError') return
      }
    }
    try {
      await navigator.clipboard.writeText(href)
      setResult('copied')
    } catch {
      setResult('manual')
    }
  }

  return (
    <div className="send">
      <button type="button" className="btn btn-p send-b" onClick={() => void send()}>
        <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M12 15V3M7 8l5-5 5 5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Send to my computer
      </button>
      <p className="send-s" role="status">
        {result === 'copied' && '✓ Link copied. Paste it into a message to yourself.'}
        {result === 'manual' && (
          <>
            Copy this link: <span className="send-url">{link}</span>
          </>
        )}
      </p>
    </div>
  )
}
