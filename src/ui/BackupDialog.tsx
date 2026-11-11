import { useEffect, useId, useRef, useState } from 'react'
import { exportBackup, importBackup } from '../progress/store'
import { useProgress } from '../progress/ProgressContext'
import './BackupDialog.css'

function localDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

function lessons(n: number): string {
  return `${n} ${n === 1 ? 'lesson' : 'lessons'}`
}

export function BackupDialog({ onClose }: { onClose: () => void }): React.JSX.Element {
  const { progress, replace } = useProgress()
  const titleId = useId()
  const fileId = useId()
  const ref = useRef<HTMLDivElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const count = Object.keys(progress.completed).length

  useEffect(() => {
    const before = document.activeElement
    ref.current?.querySelector('button')?.focus()
    return () => {
      if (before instanceof HTMLElement) before.focus()
    }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  function download() {
    const now = new Date()
    const blob = new Blob([exportBackup(progress, now.toISOString())], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `termtrek-progress-${localDate(now)}.json`
    document.body.appendChild(a)
    a.click()
    a.remove()
    // Safari can cancel the download if the URL is revoked immediately.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    let text = ''
    try {
      text = await file.text()
    } catch {
      /* falls through to the not-a-backup error */
    }
    const r = importBackup(text)
    if (r.ok) {
      replace(r.progress)
      setMsg({
        ok: true,
        text: `Progress loaded: ${lessons(Object.keys(r.progress.completed).length)} completed.`,
      })
    } else {
      setMsg({ ok: false, text: r.error })
    }
  }

  return (
    <div className="backup-overlay">
      <div
        ref={ref}
        className="backup-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <h2 id={titleId}>Your progress</h2>
        <p>You have completed {lessons(count)}.</p>
        <p>Your progress is saved only in this browser.</p>
        <p>Download a backup to keep it, or to continue on another computer.</p>
        <div className="backup-actions">
          <button type="button" className="backup-primary" onClick={download}>
            Download backup
          </button>
        </div>
        <div className="backup-load">
          <label htmlFor={fileId}>Load a backup</label>
          <input id={fileId} type="file" accept=".json,application/json" onChange={onFile} />
        </div>
        {msg && (
          <p className="backup-msg" role={msg.ok ? 'status' : 'alert'}>
            {msg.text}
          </p>
        )}
        <div className="backup-actions">
          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
