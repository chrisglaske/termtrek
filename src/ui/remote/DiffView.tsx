import { useState } from 'react'
import type { DiffLine } from '../../engine/diffLines'

export interface DiffFile {
  path: string
  kind: 'new' | 'modified' | 'deleted'
  lines: DiffLine[]
}

const LIMIT = 40
const KIND = { new: 'new file', modified: 'modified', deleted: 'deleted' } as const

function FileDiff({ file }: { file: DiffFile }): React.JSX.Element {
  const [all, setAll] = useState(false)
  const long = file.lines.length > LIMIT
  const shown = long && !all ? file.lines.slice(0, LIMIT) : file.lines
  return (
    <div className="rp-diff">
      <div className="rp-fh">
        <span className="rp-fp">{file.path}</span>
        <span className="rp-k">{KIND[file.kind]}</span>
      </div>
      <pre>
        {shown.map((l, i) => (
          <span key={i} className={l.op === '+' ? 'rp-da' : l.op === '-' ? 'rp-dr' : undefined}>
            {l.op === ' ' ? ' ' : l.op}
            {l.text}
          </span>
        ))}
      </pre>
      {long && (
        <button type="button" className="rp-more" aria-expanded={all} onClick={() => setAll(!all)}>
          {all ? 'Show less' : `Show all ${file.lines.length} lines`}
        </button>
      )}
    </div>
  )
}

export function DiffView({ files }: { files: DiffFile[] }): React.JSX.Element {
  if (files.length === 0) return <p className="rp-note">No file changes.</p>
  return (
    <div className="rp-diffs">
      {files.map((f) => (
        <FileDiff key={f.path} file={f} />
      ))}
    </div>
  )
}
