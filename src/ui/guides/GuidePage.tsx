import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { findGuide } from '../../guides/guides'
import type { GuideStep, Os } from '../../guides/guides'
import { Nav } from '../layout/Nav'
import { useDocumentTitle } from '../layout/useDocumentTitle'
import { CommandPill } from '../CommandPill'
import { RichText } from '../RichText'
import { NotFound } from '../NotFound'
import '../buttons.css'
import './Guides.css'

function defaultOs(): Os {
  try {
    return /Windows/.test(navigator.userAgent) ? 'windows' : 'macos'
  } catch {
    return 'macos'
  }
}

function CopyCommand({ command }: { command: string }): React.JSX.Element {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // No clipboard: the command is still selectable text.
    }
  }
  return (
    <span className="guide-cmd">
      <CommandPill cmd={command} />
      <button type="button" className="btn btn-s guide-copy" onClick={copy} aria-label={`Copy ${command}`}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </span>
  )
}

function Steps({ steps, prefix, done, toggle }: { steps: GuideStep[]; prefix: string; done: Record<string, boolean>; toggle: (k: string) => void }): React.JSX.Element {
  return (
    <ol className="guide-steps">
      {steps.map((s, i) => {
        const key = `${prefix}-${i}`
        const id = `step-${key}`
        return (
          <li key={key} className={done[key] ? 'is-done' : undefined}>
            <input id={id} type="checkbox" checked={!!done[key]} onChange={() => toggle(key)} />
            <div className="guide-step-body">
              {s.group && <h2 className="guide-group">{s.group}</h2>}
              <label htmlFor={id} className="guide-step-title">
                {s.title}
              </label>
              <RichText text={s.body} />
              {s.command && <CopyCommand command={s.command} />}
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function GuideView({ id }: { id: string }): React.JSX.Element {
  const guide = findGuide(id)!
  const [os, setOs] = useState<Os>(defaultOs)
  const [done, setDone] = useState<Record<string, boolean>>({})
  useDocumentTitle(`${guide.title} · TermTrek`, guide.summary)
  const toggle = (k: string) => setDone((d) => ({ ...d, [k]: !d[k] }))
  const options: { os: Os; label: string }[] = [
    { os: 'macos', label: 'macOS' },
    { os: 'windows', label: 'Windows' },
  ]
  return (
    <>
      <Nav />
      <main id="main" className="guides-main" tabIndex={-1}>
        <p className="guides-crumb">
          <Link to="/guides">All guides</Link>
        </p>
        <h1>{guide.title}</h1>
        <p className="guides-note">This page is not simulated. You do these steps on your own computer.</p>
        <p className="guides-related">
          Related lessons:{' '}
          {guide.related.map((r, i) => (
            <span key={r.id}>
              {i > 0 && ', '}
              <Link to={`/learn/${r.id}`}>{r.label}</Link>
            </span>
          ))}
        </p>
        <div className="guide-os" role="group" aria-label="Your computer">
          {options.map((o) => (
            <button key={o.os} type="button" aria-pressed={os === o.os} className="guide-os-btn" onClick={() => setOs(o.os)}>
              {o.label}
            </button>
          ))}
        </div>
        {guide.common && <Steps steps={guide.common} prefix="common" done={done} toggle={toggle} />}
        <Steps steps={guide.byOs[os]} prefix={os} done={done} toggle={toggle} />
        <section className="guide-check" aria-labelledby="guide-check-h">
          <h2 id="guide-check-h">Check it worked</h2>
          <RichText text={guide.check} />
        </section>
      </main>
    </>
  )
}

export function GuidePage(): React.JSX.Element {
  const { guideId = '' } = useParams()
  if (!findGuide(guideId)) return <NotFound />
  return <GuideView id={guideId} />
}
